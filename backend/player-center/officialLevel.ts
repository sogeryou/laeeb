import type { OfficialLevel } from '../../shared/playerCenter.js';
import type { CompanionEntity } from '../domain/types.js';
import type express from 'express';
import type { AppContext } from '../app/context.js';

export function initialLevel(now = Date.now()): OfficialLevel {
  return { level: 1, score: 0, noOrderWeeks: 0, lv1Weeks: 0, suspended: false, updatedAt: now, source: 'NEW_ACCOUNT', ruleVersion: 'PRD-2026-09' };
}
export function readOfficialLevel(companion: Pick<CompanionEntity, 'ranking'> | undefined): OfficialLevel | null {
  const r = companion?.ranking;
  if (!r || !Number.isInteger(r.level) || r.level < 1 || r.level > 6 || !Number.isSafeInteger(r.score) || r.score < 0 || !Number.isSafeInteger(r.noOrderWeeks) || r.noOrderWeeks < 0 || !Number.isSafeInteger(r.lv1Weeks) || r.lv1Weeks < 0 || typeof r.suspended !== 'boolean' || !Number.isFinite(r.updatedAt) || r.ruleVersion !== 'PRD-2026-09' || !['NEW_ACCOUNT', 'IMPORTED', 'SETTLEMENT'].includes(r.source)) return null;
  return { ...r };
}

export function registerLevelInitialization(app: express.Application, ctx: AppContext) {
  app.post('/api/admin/companions/:id/level-initialization', ctx.authMiddleware, ctx.requireAdmin('COMPANION_REVIEW'), (req, res) => {
    const companion = ctx.companions.find(c => c.id === req.params.id);
    if (!companion) return res.status(404).json({ error: 'COMPANION_NOT_FOUND' });
    // Even malformed historical records must not be silently overwritten.
    if (companion.ranking !== undefined) return res.status(409).json({ error: 'LEVEL_ALREADY_INITIALIZED' });
    const { level, score, noOrderWeeks, lv1Weeks, suspended, reason } = req.body || {};
    const ranking = readOfficialLevel({ ranking: { level, score, noOrderWeeks, lv1Weeks, suspended, source: 'IMPORTED', updatedAt: Date.now(), ruleVersion: 'PRD-2026-09' } });
    if (!ranking || typeof reason !== 'string' || !reason.trim() || reason.length > 1000) return res.status(400).json({ error: 'INVALID_LEVEL_IMPORT' });
    companion.ranking = ranking;
    ctx.appendAuditLog((req as any).authUserId, 'LEVEL_INITIALIZED', 'companion', companion.id, { reason: reason.trim(), ranking });
    ctx.persistState();
    return res.json(ranking);
  });
}
