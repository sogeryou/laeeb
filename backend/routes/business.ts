import type express from 'express';
import { randomUUID } from 'node:crypto';
import { CompanionApplySchema, CreateOrderSchema, CreateReviewSchema, OrderQuoteSchema } from '../../shared/schemas.js';
import type { BusinessReview, CreateOrderInput } from '../../shared/orders.js';
import type { Coupon } from '../../shared/types.js';
import type { OrderEntity } from '../domain/types.js';
import { rankCompanions } from '../algo/m6Exposure.js';
import type { AppContext } from '../app/context.js';
import { zValidate } from '../middleware/validate.js';
import { assertRateInLevelBand } from '../policy/index.js';
import { levelFromHourlyRate } from '../policy/leveling.js';
import { initialLevel, readOfficialLevel } from '../player-center/officialLevel.js';
import { recordLevelEvent } from '../player-center/events.js';
import { freezeOrder, actOnOrder, expireOrders, OrderFlowError, type OrderAction } from '../orders/escrow.js';
import { orderRequestPayload, quoteOrder, toMinor } from '../orders/pricing.js';
import { toBusinessOrder } from '../orders/presentation.js';
import { OrderSaveError, persistOrderMutation } from '../orders/persistence.js';
import { registerCompanionProfileRoutes } from '../companions/profile.js';

const MODERATION_BLOCKLIST = ['诈骗', 'fraud', 'scam', '色情', 'porn'];

export function registerBusinessRoutes(app: express.Application, ctx: AppContext) {
  registerCompanionProfileRoutes(app, ctx);
  const {
    authMiddleware,
    companions,
    orders,
    reviews,
    users,
    exposureLogs,
    couponTemplates,
    couponGrants,
    diamondWallets,
    persistState,
    sendError,
    getWallet,
    createRiskEvent,
  } = ctx;

  const orderError = (error: unknown, res: express.Response, next: express.NextFunction) => {
    if (error instanceof OrderSaveError) return sendError(res, 503, error.message, 'Order persistence unavailable');
    if (error instanceof OrderFlowError) return sendError(res, error.message === 'ORDER_FORBIDDEN' ? 403 : error.status, error.message, error.message);
    next(error);
  };

  app.post('/api/orders/quote', authMiddleware, zValidate(OrderQuoteSchema), (req, res, next) => {
    try {
      const body = (req as express.Request & { validatedBody: CreateOrderInput }).validatedBody;
      res.json(quoteOrder(ctx, (req as any).authUserId, body));
    } catch (error) { orderError(error, res, next); }
  });

  // The escrow workflow owns all order mutations; old unfunded records need reconciliation.
  app.post('/api/orders/:id/:action', authMiddleware, (req, res, next) => {
    if (!['accept', 'start', 'complete', 'confirm', 'cancel', 'dispute'].includes(req.params.action)) return next();
    try {
      expireOrders(ctx);
      const order = orders.find(o => o.id === req.params.id);
      if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
      if (req.params.action === 'start') return sendError(res, 409, 'ORDER_START_NOT_REQUIRED', 'Acceptance starts service');
      const result = persistOrderMutation(ctx, () => {
        actOnOrder(ctx, order, (req as any).authUserId, req.params.action as OrderAction, req.body || {});
        if (req.params.action === 'accept') recordLevelEvent(ctx, { id: `accept:${order.id}`, userId: (req as any).authUserId, kind: 'ACCEPT', referenceId: order.id, at: order.acceptedAt! });
        if (req.params.action === 'dispute' && !ctx.riskEvents.some(event => event.type === 'ORDER_DISPUTE' && event.relatedEntityId === order.id)) {
          createRiskEvent('ORDER_DISPUTE', order.id, 'MEDIUM', `Order dispute submitted: ${order.disputeReason}`);
        }
        return order;
      });
      return res.json(toBusinessOrder(ctx, result, (req as any).authUserId));
    } catch (error) {
      orderError(error, res, next);
    }
  });

  app.post('/api/companions/apply', authMiddleware, zValidate(CompanionApplySchema), (req, res) => {
    const userId = (req as any).authUserId as string;
    const { gameName, intro, hourlyRate } = (req as express.Request & { validatedBody: { gameName: string; intro: string; hourlyRate: number } }).validatedBody;
    const level = levelFromHourlyRate(hourlyRate);
    const band = assertRateInLevelBand(level, hourlyRate);
    if (!band.ok) {
      return sendError(res, 422, 'PRICE_OUT_OF_LEVEL_BAND', 'hourlyRate out of level band', { band: band.band, level });
    }
    const existing = companions.find(c => c.userId === userId);
    if (existing) {
      return sendError(res, 409, 'COMPANION_ALREADY_EXISTS', 'Use the profile editor to update an existing companion');
    }
    const companion = {
      id: `cp_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      gameName,
      intro,
      hourlyRate,
      status: 'APPROVED' as const,
      availability: 'ONLINE' as const,
      ranking: initialLevel(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    companions.push(companion);
    const user = users.find(u => u.id === userId);
    if (user) user.role = 'PLAYER';
    persistState();
    res.status(201).json(companion);
  });

  app.patch('/api/companions/:id/availability', authMiddleware, (req, res) => {
    const companion = companions.find(c => c.id === req.params.id);
    if (!companion) return sendError(res, 404, 'COMPANION_NOT_FOUND', 'Companion not found');
    if (companion.userId !== (req as any).authUserId) return sendError(res, 403, 'COMPANION_FORBIDDEN', 'Forbidden');
    const nextAvailability = req.body?.availability as 'ONLINE' | 'OFFLINE' | 'BUSY';
    if (!nextAvailability) return sendError(res, 400, 'COMPANION_AVAILABILITY_REQUIRED', 'availability required');
    companion.availability = nextAvailability;
    companion.updatedAt = Date.now();
    persistState();
    res.json(companion);
  });

  app.get('/api/companions', (req, res) => {
    const onlyAvailable = req.query.available === 'true';
    const list = companions.filter(c => c.status === 'APPROVED' && (!onlyAvailable || c.availability === 'ONLINE'));
    res.json(list);
  });

  app.get('/api/companions/rankings', (req, res) => {
    const limitRaw = Number(req.query.limit || 20);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 20;
    const rankContext = {
      viewerCountry: String(req.query.country || ''),
      weights: { wOrder: 0.4, wRating: 0.35, wActive: 0.25, wBizGlobal: 0.15 },
      nowSeed: Math.floor(Date.now() / 3_600_000),
    };
    const candidates = companions
      .filter(c => c.status === 'APPROVED' && !readOfficialLevel(c)?.suspended)
      .map(companion => {
        const companionOrders = orders.filter(o => o.companionId === companion.id);
        const completedOrders = companionOrders.filter(o => o.status === 'COMPLETED');
        const companionReviews = reviews.filter(r => r.companionId === companion.id && r.status === 'APPROVED');
        const completedOrderCount = completedOrders.length;
        const avgRating = companionReviews.length > 0
          ? companionReviews.reduce((sum, review) => sum + review.rating, 0) / companionReviews.length
          : 0;
        const lastCompleted = completedOrders.reduce((max, o) => Math.max(max, o.completedAt || 0), 0);
        const orderRecencyHours = lastCompleted ? (Date.now() - lastCompleted) / 3_600_000 : 9999;
        return {
          companionId: companion.id,
          level: readOfficialLevel(companion)?.level ?? 1,
          impressions24h: exposureLogs.filter(e => e.companionId === companion.id && e.eventType === 'impression' && e.createdAt > Date.now() - 86_400_000 && e.createdAt <= Date.now()).length,
          clicks24h: exposureLogs.filter(e => e.companionId === companion.id && e.eventType === 'click' && e.createdAt > Date.now() - 86_400_000 && e.createdAt <= Date.now()).length,
          completedOrders30d: completedOrderCount,
          avgRating,
          activityScore: Math.min(150, completedOrderCount * 3),
          orderRecencyHours,
          availability: companion.availability,
          _companion: companion,
          _completedOrderCount: completedOrderCount,
          _companionReviews: companionReviews,
          _companionOrders: companionOrders,
        };
      });
    const rankedCore = rankCompanions(
      candidates.map(({ _companion, _completedOrderCount, _companionReviews, _companionOrders, ...c }) => c),
      rankContext,
      limit
    );
    const ranked = rankedCore.map(row => {
      const src = candidates.find(c => c.companionId === row.companionId)!;
      const companion = src._companion;
      const completedOrderCount = src._completedOrderCount;
      const companionReviews = src._companionReviews;
      const totalOrderCount = src._companionOrders.length;
      const completionRate = totalOrderCount > 0 ? completedOrderCount / totalOrderCount : 0;
      const totalRevenue = src._companionOrders
        .filter(o => o.status === 'COMPLETED')
        .reduce((sum, order) => sum + order.totalPrice, 0);
      const disputed = src._companionOrders.filter(o => o.status === 'DISPUTED').length;
      const avgRating = companionReviews.length > 0
        ? companionReviews.reduce((sum, review) => sum + review.rating, 0) / companionReviews.length
        : 0;
      const poolTag = row.pool === 'FEATURED' ? 'HIGH_PERFORMING' as const : row.pool === 'NORMAL' ? 'STABLE' as const : 'NEW' as const;
      return {
        rank: row.rank,
        companionId: companion.id,
        gameName: companion.gameName,
        hourlyRate: companion.hourlyRate,
        availability: companion.availability,
        avgRating: Number(avgRating.toFixed(2)),
        completedOrderCount,
        reviewCount: companionReviews.length,
        completionRate: Number(completionRate.toFixed(4)),
        totalRevenue,
        rankingScore: row.finalScore,
        poolTag,
        scoreBreakdown: {
          quality: Number((row.breakdown.lf || 0).toFixed(4)),
          volume: Number((row.breakdown.business || 0).toFixed(4)),
          fulfillment: Number((row.breakdown.personalization || 0).toFixed(4)),
          revenue: Number((row.breakdown.exposureFactor || 0).toFixed(4)),
          riskPenalty: Number((disputed * 0.5).toFixed(4)),
        },
      };
    });
    res.json(ranked);
  });

  app.post('/api/exposure/batch', (_req, res) => {
    res.status(410).json({ error: 'USE_SNAPSHOT_EXPOSURE_ENDPOINT', message: 'Use /api/home/events with a feed snapshot' });
  });

  app.post('/api/orders', authMiddleware, zValidate(CreateOrderSchema), (req, res, next) => {
    try {
      const userId = (req as any).authUserId as string;
      const body = (req as express.Request & { validatedBody: CreateOrderInput }).validatedBody;
      const requestPayload = orderRequestPayload(body);
      const existing = body.requestId ? orders.find(order => order.userId === userId && order.requestId === body.requestId) : undefined;
      if (existing) {
        if (existing.requestPayload !== requestPayload) throw new OrderFlowError('ORDER_REQUEST_ID_CONFLICT');
        expireOrders(ctx);
        return res.json(toBusinessOrder(ctx, existing, userId));
      }
      const quote = quoteOrder(ctx, userId, body);
      expireOrders(ctx);
      if (orders.some(order => order.userId === userId && order.companionId === body.companionId && order.workflowVersion === 2
        && ['CREATED', 'IN_SERVICE', 'AWAITING_CONFIRMATION', 'DISPUTED'].includes(order.status))) throw new OrderFlowError('ORDER_ONGOING_EXISTS');
      if (body.expectedTotal !== undefined && toMinor(body.expectedTotal) !== toMinor(quote.totalPrice)) throw new OrderFlowError('ORDER_PRICE_CHANGED');
      const now = Date.now();
      const order: OrderEntity = {
        ...quote, id: `ord_${randomUUID()}`, userId, status: 'CREATED', createdAt: now, updatedAt: now,
        ...(body.requestId ? { requestId: body.requestId, requestPayload } : {}),
      };
      persistOrderMutation(ctx, () => {
        ctx.wallets[userId] ||= { userId, balance: 0, lastUpdated: now };
        freezeOrder(ctx, order, now);
        const companion = companions.find(c => c.id === body.companionId)!;
        recordLevelEvent(ctx, { id: `accept-opportunity:${order.id}`, userId: companion.userId, kind: 'ACCEPT_OPPORTUNITY', referenceId: order.id, at: now });
        orders.push(order);
        if (body.couponGrantId) {
          const grant = couponGrants.find(g => g.id === body.couponGrantId && g.userId === userId)!;
          Object.assign(grant, { status: 'USED', usedAt: now, orderId: order.id });
        }
      });
      res.status(201).json(toBusinessOrder(ctx, order, userId));
    } catch (error) { orderError(error, res, next); }
  });

  app.get('/api/orders', authMiddleware, (req, res, next) => {
    try {
      expireOrders(ctx);
      const userId = (req as any).authUserId as string;
      const list = orders.filter(
        o => o.userId === userId || companions.some(c => c.userId === userId && c.id === o.companionId)
      );
      res.json(list.map(order => toBusinessOrder(ctx, order, userId)));
    } catch (error) { orderError(error, res, next); }
  });

  app.get('/api/coupons/me', authMiddleware, (req, res) => {
    const userId = (req as any).authUserId as string;
    const now = Date.now();
    const coupons: Coupon[] = couponGrants
      .filter(grant => grant.userId === userId && grant.status === 'ACTIVE' && Number.isFinite(grant.expiresAt) && grant.expiresAt > now)
      .flatMap(grant => {
        const template = couponTemplates.find(t => t.id === grant.templateId);
        return template ? [{ id: grant.id, name: template.name, discount: template.value, type: template.type === 'FIXED' ? 'FIXED' as const : 'PERCENTAGE' as const, minSpend: template.minSpend }] : [];
      });
    res.json(coupons);
  });

  app.post('/api/reviews', authMiddleware, zValidate(CreateReviewSchema), (req, res, next) => {
    try {
      const userId = (req as any).authUserId as string;
      const { orderId, rating, content, tags } = (req as express.Request & { validatedBody: { orderId: string; rating: number; content: string; tags?: string[] } }).validatedBody;
      const order = orders.find(o => o.id === orderId);
      if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
      if (order.userId !== userId) return sendError(res, 403, 'REVIEW_BUYER_ONLY', 'Only buyer can review');
      if (order.workflowVersion !== 2) throw new OrderFlowError('LEGACY_ORDER_RECONCILIATION_REQUIRED');
      if (order.status !== 'COMPLETED') return sendError(res, 409, 'REVIEW_ORDER_NOT_COMPLETED', 'Order not completed');
      if (reviews.some(r => r.orderId === orderId)) return sendError(res, 409, 'REVIEW_ALREADY_EXISTS', 'Review already exists');
      const lower = [content, ...(tags || [])].join(' ').toLowerCase();
      const blocked = MODERATION_BLOCKLIST.find(keyword => lower.includes(keyword));
      const review: BusinessReview = {
        id: `rev_${Math.random().toString(36).slice(2, 9)}`,
        orderId,
        userId,
        companionId: order.companionId,
        rating,
        content,
        ...(tags ? { tags } : {}),
        status: blocked ? ('REJECTED' as const) : ('APPROVED' as const),
        moderationReason: blocked ? `Blocked keyword: ${blocked}` : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      persistOrderMutation(ctx, () => { reviews.unshift(review); });
      res.status(201).json(review);
    } catch (error) { orderError(error, res, next); }
  });

  app.get('/api/reviews', authMiddleware, (req, res) => {
    const userId = (req as any).authUserId as string;
    const companion = companions.find(c => c.userId === userId);
    const list = reviews.filter(r => r.userId === userId || (companion && r.companionId === companion.id));
    res.json(list);
  });

  app.get('/api/dashboard/business', authMiddleware, (req, res) => {
    const userId = (req as any).authUserId as string;
    const companion = companions.find(c => c.userId === userId);
    const myOrders = orders.filter(
      o => o.userId === userId || (companion && o.companionId === companion.id)
    );
    const myReviews = reviews.filter(
      r => r.userId === userId || (companion && r.companionId === companion.id)
    );
    res.json({
      userId,
      role: users.find(u => u.id === userId)?.role || 'USER',
      wallet: getWallet(userId),
      diamondWallet: diamondWallets[userId] || { userId, balance: 0, lastUpdated: Date.now() },
      companion: companion || null,
      orderSummary: {
        total: myOrders.length,
        created: myOrders.filter(o => o.status === 'CREATED').length,
        inService: myOrders.filter(o => o.status === 'IN_SERVICE').length,
        completed: myOrders.filter(o => o.status === 'COMPLETED').length,
        disputed: myOrders.filter(o => o.status === 'DISPUTED').length
      },
      reviewSummary: {
        total: myReviews.length,
        approved: myReviews.filter(r => r.status === 'APPROVED').length,
        rejected: myReviews.filter(r => r.status === 'REJECTED').length
      }
    });
  });
}
