import type express from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AppContext } from '../app/context.js';
import type { CompanionEntity } from '../domain/types.js';
import type { CompanionApplication, SubmitCompanionApplication } from '../../shared/companionApplications.js';
import { CompanionApplySchema } from '../../shared/schemas.js';
import { zValidate } from '../middleware/validate.js';
import { assertRateInLevelBand } from '../policy/index.js';
import { levelFromHourlyRate } from '../policy/leveling.js';
import { initialLevel } from '../player-center/officialLevel.js';

const reviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  expectedUpdatedAt: z.number().int().nonnegative().safe().optional(),
  reason: z.string().trim().min(1).max(1000).optional(),
}).strict().superRefine((body, ctx) => {
  if (body.action === 'REJECT' && !body.reason) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'Reason required' });
});

function dto(companion: CompanionEntity): CompanionApplication {
  const metadata = companion.application;
  return {
    id: companion.id, userId: companion.userId, status: companion.status,
    gameName: companion.gameName, intro: companion.intro, hourlyRate: companion.hourlyRate,
    details: metadata?.details || {}, submittedAt: metadata?.submittedAt ?? companion.createdAt,
    updatedAt: companion.updatedAt,
    ...(metadata?.rejectionReason ? { rejectionReason: metadata.rejectionReason } : {}),
    ...(metadata?.reviewedAt ? { reviewedAt: metadata.reviewedAt } : {}),
  };
}

function fingerprint(input: SubmitCompanionApplication): string {
  const details = input.details || {};
  const sortedDetails = Object.fromEntries(Object.entries(details).sort(([a], [b]) => a.localeCompare(b)));
  return createHash('sha256').update(JSON.stringify({ gameName: input.gameName, intro: input.intro, hourlyRate: input.hourlyRate, details: sortedDetails })).digest('hex');
}

function saveFailed(ctx: AppContext, res: express.Response) {
  return ctx.sendError(res, 503, 'COMPANION_SAVE_FAILED', 'Application could not be saved');
}

function restoreCompanion(companion: CompanionEntity, previous: CompanionEntity) {
  for (const key of Object.keys(companion)) {
    if (!(key in previous)) delete (companion as unknown as Record<string, unknown>)[key];
  }
  Object.assign(companion, previous);
}

export function registerCompanionApplicationRoutes(app: express.Application, ctx: AppContext) {
  app.get('/api/companions/me/application', ctx.authMiddleware, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const companion = ctx.companions.find(item => item.userId === (req as any).authUserId);
    return res.json({ application: companion ? dto(companion) : null });
  });

  app.post('/api/companions/apply', ctx.authMiddleware, zValidate(CompanionApplySchema), (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const userId = (req as any).authUserId as string;
    const input = (req as express.Request & { validatedBody: SubmitCompanionApplication }).validatedBody;
    const existing = ctx.companions.find(item => item.userId === userId);
    if (existing && (existing.status === 'APPROVED' || (existing.status === 'PENDING' && !existing.application))) return ctx.sendError(res, 409, 'COMPANION_ALREADY_EXISTS', 'Use the profile editor to update an existing companion');
    const user = ctx.users.find(item => item.id === userId);
    if (!user || user.role === 'ADMIN' || user.accountStatus === 'FROZEN' || user.accountStatus === 'RISK_HOLD'
      || Object.values(user.banModules || {}).some(Boolean) || existing?.ranking?.suspended) {
      return ctx.sendError(res, 403, 'COMPANION_APPLICATION_FORBIDDEN', 'Application unavailable');
    }
    const hash = fingerprint(input);
    if (existing?.status === 'PENDING') {
      if (input.requestId && input.requestId === existing.application?.requestId && hash === existing.application?.requestFingerprint) return res.json(dto(existing));
      return ctx.sendError(res, 409, 'COMPANION_APPLICATION_CONFLICT', 'Application already pending');
    }
    if (existing?.status === 'REJECTED' && (!input.requestId || input.requestId === existing.application?.requestId)) {
      return ctx.sendError(res, 409, 'COMPANION_APPLICATION_CONFLICT', 'Use a new request ID to resubmit');
    }
    const band = assertRateInLevelBand(levelFromHourlyRate(input.hourlyRate), input.hourlyRate);
    if (!band.ok) return ctx.sendError(res, 422, 'PRICE_OUT_OF_LEVEL_BAND', 'hourlyRate out of level band', { band: band.band, level: levelFromHourlyRate(input.hourlyRate) });
    const now = Math.max(Date.now(), (existing?.updatedAt || 0) + 1);
    const id = existing?.id || `cp_${randomUUID()}`;
    const services = input.details?.serviceName ? [{ id: `${id}_configured`, name: input.details.serviceName, unitPrice: input.hourlyRate, unit: input.details.unit || 'hr' }] : [];
    const metadata = { details: input.details || {}, submittedAt: now, requestId: input.requestId, requestFingerprint: hash };
    if (existing) {
      const previous = { ...existing };
      const previousRole = user.role;
      Object.assign(existing, { gameName: input.gameName, intro: input.intro, hourlyRate: input.hourlyRate, status: 'PENDING', availability: 'OFFLINE', updatedAt: now, services, application: metadata });
      user.role = 'USER';
      try { ctx.persistState(); } catch { restoreCompanion(existing, previous); user.role = previousRole; return saveFailed(ctx, res); }
      return res.status(201).json(dto(existing));
    }
    const companion: CompanionEntity = { id, userId, gameName: input.gameName, intro: input.intro, hourlyRate: input.hourlyRate,
      status: 'PENDING', availability: 'OFFLINE', ranking: initialLevel(), createdAt: now, updatedAt: now, services, application: metadata };
    const previousRole = user.role;
    user.role = 'USER';
    ctx.companions.push(companion);
    try { ctx.persistState(); } catch { ctx.companions.splice(ctx.companions.indexOf(companion), 1); user.role = previousRole; return saveFailed(ctx, res); }
    return res.status(201).json(dto(companion));
  });
}

export function registerCompanionReviewRoutes(app: express.Application, ctx: AppContext) {
  app.post('/api/admin/companions/:id/review', ctx.authMiddleware, ctx.requireAdmin('COMPANION_REVIEW'), zValidate(reviewSchema), (req, res) => {
    const companion = ctx.companions.find(item => item.id === req.params.id);
    if (!companion) return ctx.sendError(res, 404, 'COMPANION_NOT_FOUND', 'Companion not found');
    const { action, reason, expectedUpdatedAt } = (req as express.Request & { validatedBody: z.infer<typeof reviewSchema> }).validatedBody;
    const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    if (companion.status === status) return res.json({ ...companion, rejectionReason: companion.application?.rejectionReason, reviewedAt: companion.application?.reviewedAt });
    if (companion.status !== 'PENDING') return ctx.sendError(res, 409, 'COMPANION_REVIEW_CONFLICT', 'Review already decided');
    if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== companion.updatedAt) return ctx.sendError(res, 409, 'COMPANION_REVIEW_STALE', 'Application changed; reload before review');
    const user = ctx.users.find(item => item.id === companion.userId);
    if (!user) return ctx.sendError(res, 409, 'COMPANION_OWNER_MISSING', 'Applicant not found');
    const previous = { ...companion };
    const previousRole = user.role;
    const previousAudit = ctx.auditLogs.slice();
    companion.status = status;
    companion.availability = 'OFFLINE';
    companion.updatedAt = Math.max(Date.now(), previous.updatedAt + 1);
    companion.application = { details: {}, submittedAt: companion.createdAt, ...companion.application,
      reviewedAt: companion.updatedAt, reviewedBy: (req as any).authUserId,
      ...(action === 'REJECT' ? { rejectionReason: reason } : { rejectionReason: undefined }) };
    if (action === 'APPROVE' && user.role !== 'ADMIN') user.role = 'PLAYER';
    if (action === 'REJECT' && user.role !== 'ADMIN') user.role = 'USER';
    try {
      ctx.appendAuditLog((req as any).authUserId, `COMPANION_${action}`, 'companion', companion.id, { status });
      ctx.persistState();
    } catch {
      restoreCompanion(companion, previous);
      user.role = previousRole;
      ctx.auditLogs.splice(0, ctx.auditLogs.length, ...previousAudit);
      return saveFailed(ctx, res);
    }
    return res.json({ ...companion, rejectionReason: companion.application?.rejectionReason, reviewedAt: companion.application?.reviewedAt });
  });
}
