import type express from 'express';
import { z } from 'zod';
import { DEFAULT_GAME_DISCOVERY_QUERY, getDiscoveryGame, resolveDiscoveryGameId, type GameCompanion, type GameDiscoveryPage, type GameDiscoveryQuery } from '../../shared/gameDiscovery.js';
import type { AppContext } from '../app/context.js';
import type { CompanionEntity } from '../domain/types.js';
import { providerRestricted } from '../orders/eligibility.js';
import { companionProfile } from '../orders/presentation.js';
import { toMinor } from '../orders/pricing.js';
import { assertRateInLevelBand, levelFromHourlyRate } from '../policy/leveling.js';

const priceQuery = z.string().regex(/^\d+(?:\.\d{1,2})?$/).transform(Number).pipe(z.number().finite().nonnegative());
const pageQuery = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().safe());
const querySchema = z.object({
  status: z.enum(['ALL', 'ONLINE']).default(DEFAULT_GAME_DISCOVERY_QUERY.status),
  gender: z.enum(['ALL', 'M', 'F', 'U']).default(DEFAULT_GAME_DISCOVERY_QUERY.gender),
  minPrice: priceQuery.default(String(DEFAULT_GAME_DISCOVERY_QUERY.minPrice)),
  maxPrice: priceQuery.default(String(DEFAULT_GAME_DISCOVERY_QUERY.maxPrice)),
  sort: z.enum(['DEFAULT', 'ORDERS', 'SCORE']).default(DEFAULT_GAME_DISCOVERY_QUERY.sort),
  page: pageQuery.default('1'),
  limit: pageQuery.refine(value => value <= 50).default('20'),
}).strict().refine(value => value.minPrice <= value.maxPrice);

const money = z.number().finite().nonnegative().refine(value => {
  try { toMinor(value); return true; } catch { return false; }
});
const companionSchema = z.object({
  id: z.string().refine(value => Boolean(value.trim())), userId: z.string().refine(value => Boolean(value.trim())), gameName: z.string().min(1),
  intro: z.string().optional(), hourlyRate: money,
  status: z.literal('APPROVED'), availability: z.enum(['ONLINE', 'BUSY', 'OFFLINE']),
});
const publicUserSchema = z.object({
  id: z.string().min(1), username: z.string().optional(), avatar: z.string().optional(),
  bio: z.string().optional(), tags: z.array(z.string()).optional(),
});
const serviceSchema = z.object({
  id: z.string().min(1), name: z.string().refine(value => Boolean(value.trim())), unitPrice: money, unit: z.string().refine(value => Boolean(value.trim())),
});

function discoveryCompanion(ctx: AppContext, companion: CompanionEntity, gameId: string, now: number): GameCompanion | null {
  const parsed = companionSchema.safeParse(companion);
  if (!parsed.success || resolveDiscoveryGameId(parsed.data.gameName) !== gameId) return null;
  const provider = ctx.users.find(user => user?.id === parsed.data.userId);
  if (!provider || !publicUserSchema.safeParse(provider).success || providerRestricted(companion, provider)
    || ctx.getBanError(provider, 'ORDER') || ctx.getBanError(provider, 'ACCEPT_ORDER')) return null;

  // Legacy extras are untrusted; discard only invalid entries, without repairing stored data.
  const services = (Array.isArray(companion.services) ? companion.services : []).flatMap(service => {
    const result = serviceSchema.safeParse(service);
    if (!result.success) return [];
    const { id, name, unitPrice, unit } = result.data;
    return [{ id, name, unitPrice, unit }];
  });
  const current: CompanionEntity = { ...companion, ...parsed.data, intro: parsed.data.intro ?? '', services };
  const completedOrders30d = ctx.orders.filter(order => order?.companionId === companion.id
    && order.status === 'COMPLETED' && order.settlementDone === true
    && Number.isFinite(order.completedAt) && order.completedAt > now - 30 * 86_400_000 && order.completedAt <= now).length;
  const reviews = ctx.reviews.filter(review => review?.companionId === companion.id && review.status === 'APPROVED'
    && Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5);
  const rating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const profile = companionProfile({ ...ctx, users: [provider] }, current, rating, String(completedOrders30d));
  const profileGender = provider.gender;
  return {
    id: profile.id, userId: profile.userId, name: profile.name, avatarUrl: profile.avatarUrl,
    rating: profile.rating, orderCount: profile.orderCount, price: profile.price, game: profile.game,
    tags: profile.tags, onlineStatus: profile.onlineStatus, bio: profile.bio, services: profile.services,
    ...(['M', 'F', 'U'].includes(profileGender || '') ? { profileGender } : {}),
    reviewCount: reviews.length, completedOrders30d,
    bookable: current.availability === 'ONLINE' && profile.price > 0
      && assertRateInLevelBand(levelFromHourlyRate(current.hourlyRate), current.hourlyRate).ok,
  };
}

const statusOrder = { Online: 0, Busy: 1, Offline: 2 };
const compareIds = (a: GameCompanion, b: GameCompanion) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

export function registerGameDiscoveryRoutes(app: express.Application, ctx: AppContext) {
  app.get('/api/games/:gameId/companions', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const game = getDiscoveryGame(req.params.gameId);
    if (!game) return ctx.sendError(res, 404, 'GAME_NOT_FOUND', 'Game not found');
    // Express may discard prototype keys; validate the original keys and duplicates too.
    const entries = Array.from(new URL(req.originalUrl, 'http://localhost').searchParams.entries());
    const duplicated = new Set(entries.map(([key]) => key)).size !== entries.length;
    const parsed = querySchema.safeParse(Object.fromEntries(entries));
    if (!parsed.success || duplicated) return ctx.sendError(res, 400, 'GAME_DISCOVERY_QUERY_INVALID', 'Invalid discovery query');
    const { page, limit, status, gender, minPrice, maxPrice, sort } = parsed.data;
    const query: GameDiscoveryQuery = { status, gender, minPrice, maxPrice, sort };
    const now = Date.now();
    const eligible = ctx.companions.flatMap(companion => {
      const item = discoveryCompanion(ctx, companion, game.id, now);
      return item ? [item] : [];
    });
    const onlineCount = eligible.filter(item => item.onlineStatus === 'Online').length;
    const filtered = eligible.filter(item => (query.status === 'ALL' || item.onlineStatus === 'Online')
      && (query.gender === 'ALL' || item.profileGender === query.gender)
      && item.price >= query.minPrice && item.price <= query.maxPrice);
    filtered.sort((a, b) => {
      const metric = query.sort === 'ORDERS' ? b.completedOrders30d - a.completedOrders30d
        : query.sort === 'SCORE' ? b.rating - a.rating
          : statusOrder[a.onlineStatus!] - statusOrder[b.onlineStatus!];
      return metric || compareIds(a, b);
    });
    const total = filtered.length;
    const start = (page - 1) * limit;
    const response: GameDiscoveryPage = {
      gameId: game.id, gameName: game.name, query, page, limit, total, onlineCount,
      items: filtered.slice(start, start + limit), nextPage: start + limit < total ? page + 1 : null,
    };
    return res.json(response);
  });
}
