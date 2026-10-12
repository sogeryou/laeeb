import type express from 'express';
import type { AppContext } from '../app/context.js';
import type { CompanionEntity } from '../domain/types.js';
import { UpdateCompanionProfileSchema, type ManagedCompanionProfile, type UpdateCompanionProfile } from '../../shared/companionManagement.js';
import { zValidate } from '../middleware/validate.js';
import { providerRestricted } from '../orders/eligibility.js';
import { companionProfile } from '../orders/presentation.js';
import { assertRateInLevelBand } from '../policy/index.js';
import { levelFromHourlyRate } from '../policy/leveling.js';

function managed(companion: CompanionEntity): ManagedCompanionProfile {
  return {
    id: companion.id, userId: companion.userId, gameName: companion.gameName, intro: companion.intro,
    hourlyRate: companion.hourlyRate, status: companion.status, availability: companion.availability,
    updatedAt: companion.updatedAt,
    services: (companion.services || []).filter(service => service.id !== companion.id).map(service => ({ ...service, unit: service.unit as 'hr' | 'match' })),
  };
}

export function registerCompanionProfileRoutes(app: express.Application, ctx: AppContext) {
  app.get('/api/companions/me/profile', ctx.authMiddleware, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const companion = ctx.companions.find(c => c.userId === (req as any).authUserId);
    if (!companion) return ctx.sendError(res, 404, 'COMPANION_NOT_FOUND', 'Companion not found');
    return res.json(managed(companion));
  });

  app.patch('/api/companions/me/profile', ctx.authMiddleware, zValidate(UpdateCompanionProfileSchema), (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const companion = ctx.companions.find(c => c.userId === (req as any).authUserId);
    if (!companion) return ctx.sendError(res, 404, 'COMPANION_NOT_FOUND', 'Companion not found');
    const provider = ctx.users.find(u => u.id === companion.userId);
    if (companion.status !== 'APPROVED' || !provider || providerRestricted(companion, provider)
      || ctx.getBanError(provider, 'ORDER') || ctx.getBanError(provider, 'ACCEPT_ORDER')) {
      return ctx.sendError(res, 403, 'COMPANION_FORBIDDEN', 'Companion cannot be edited');
    }
    const body = (req as express.Request & { validatedBody: UpdateCompanionProfile }).validatedBody;
    if (body.updatedAt !== companion.updatedAt) return ctx.sendError(res, 409, 'COMPANION_PROFILE_STALE', 'Profile changed; reload before saving');
    const band = assertRateInLevelBand(levelFromHourlyRate(body.hourlyRate), body.hourlyRate);
    if (!band.ok) return ctx.sendError(res, 422, 'PRICE_OUT_OF_LEVEL_BAND', 'hourlyRate out of level band');
    const currentIds = (companion.services || []).filter(service => service.id !== companion.id).map(service => service.id);
    const incomingIds = body.services.map(service => service.id);
    if (new Set(incomingIds).size !== incomingIds.length || incomingIds.includes(companion.id)
      || currentIds.some(id => !incomingIds.includes(id))) {
      return ctx.sendError(res, 400, 'COMPANION_SERVICES_INVALID', 'Existing services must keep their IDs');
    }
    const previous = { gameName: companion.gameName, intro: companion.intro, hourlyRate: companion.hourlyRate, updatedAt: companion.updatedAt, services: companion.services };
    companion.gameName = body.gameName;
    companion.intro = body.intro;
    companion.hourlyRate = body.hourlyRate;
    companion.services = body.services.map(service => ({ ...service }));
    companion.updatedAt = Math.max(Date.now(), previous.updatedAt + 1);
    try { ctx.persistState(); }
    catch {
      Object.assign(companion, previous);
      return ctx.sendError(res, 503, 'COMPANION_SAVE_FAILED', 'Profile could not be saved');
    }
    return res.json(managed(companion));
  });

  app.get('/api/companions/:id/profile', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const companion = ctx.companions.find(c => c.id === req.params.id && c.status === 'APPROVED');
    const provider = companion && ctx.users.find(u => u.id === companion.userId);
    if (!companion || !provider || providerRestricted(companion, provider)
      || ctx.getBanError(provider, 'ORDER') || ctx.getBanError(provider, 'ACCEPT_ORDER')) {
      return ctx.sendError(res, 404, 'COMPANION_NOT_FOUND', 'Companion not found');
    }
    const now = Date.now();
    const completed = ctx.orders.filter(o => o.companionId === companion.id && o.status === 'COMPLETED' && o.settlementDone && (o.completedAt || 0) > now - 30 * 86_400_000);
    const reviews = ctx.reviews.filter(r => r.companionId === companion.id && r.status === 'APPROVED' && r.rating >= 1 && r.rating <= 5);
    const rating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
    const profile = companionProfile(ctx, companion, rating, String(completed.length));
    return res.json({ ...profile, reviews: reviews.map(review => {
      const author = ctx.users.find(user => user.id === review.userId);
      return { id: review.id, userName: author?.username || 'User', userAvatar: author?.avatar || '', rating: review.rating,
        comment: review.content, date: new Date(review.createdAt).toISOString().slice(0, 10), timestamp: review.createdAt, tags: review.tags || [] };
    }) });
  });
}
