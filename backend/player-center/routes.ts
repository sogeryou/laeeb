import { randomUUID } from 'node:crypto';
import type express from 'express';
import type { AppContext } from '../app/context.js';
import type { CenterResponse, CenterPeriod, CustomerGroup, CustomerSort } from '../../shared/playerCenter.js';
import { buildAnalytics } from './analytics.js';
import { taskPoints } from './level.js';
import { readOfficialLevel } from './officialLevel.js';
import { weeklyActivity } from './events.js';
import { periodRange } from './analytics.js';

export function registerPlayerCenterRoutes(app: express.Application, ctx: AppContext) {
  const snapshots = new Map<string, { owner: string; data: CenterResponse; key: string; postVersion: string }>();
  app.get('/api/player-center', ctx.authMiddleware, (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    const owner = (req as express.Request & { authUserId: string }).authUserId;
    if (!ctx.companions.some(c => c.userId === owner && c.status === 'APPROVED')) return ctx.sendError(res, 403, 'PLAYER_REQUIRED', 'Approved player account required');
    const period = String(req.query.period || 'WEEK') as CenterPeriod;
    const group = String(req.query.group || 'ALL') as CustomerGroup;
    const sort = String(req.query.sort || 'TIME') as CustomerSort;
    const direction = String(req.query.direction || 'DESC');
    const offset = Number(req.query.offset || 0);
    if (!['DAY', 'WEEK', 'MONTH', 'ALL'].includes(period) || !['ALL', 'NEW', 'OLD'].includes(group) || !['TIME', 'ORDERS', 'INCOME'].includes(sort) || !['ASC', 'DESC'].includes(direction) || !Number.isSafeInteger(offset) || offset < 0 || offset % 20 !== 0 || (offset > 0 && !req.query.snapshot)) {
      return ctx.sendError(res, 400, 'INVALID_FILTER', 'Invalid player center query');
    }
    const now = Date.now();
    const postVersion = JSON.stringify((ctx.levelEvents || []).filter(e => e.userId === owner && e.kind === 'POST').map(e => [e.id, e.at, e.revokedAt]));
    for (const [id, item] of snapshots) if (item.data.expiresAt <= now) snapshots.delete(id);
    const key = JSON.stringify([period, group, sort, direction]);
    let snapshot = String(req.query.snapshot || '');
    let data: CenterResponse;
    if (snapshot) {
      const saved = snapshots.get(snapshot);
      if (!saved) return ctx.sendError(res, 410, 'SNAPSHOT_EXPIRED', 'Refresh to load current data');
      if (saved.owner !== owner) return ctx.sendError(res, 403, 'SNAPSHOT_FORBIDDEN', 'Snapshot belongs to another account');
      if (saved.postVersion !== postVersion) return ctx.sendError(res, 410, 'SNAPSHOT_EXPIRED', 'Task eligibility changed; refresh');
      if (saved.key !== key) return ctx.sendError(res, 400, 'SNAPSHOT_FILTER_MISMATCH', 'Filters changed; refresh');
      data = saved.data;
    } else {
      const timezone = process.env.SETTLEMENT_TZ || 'Asia/Riyadh';
      const officialLevel = readOfficialLevel(ctx.companions.find(c => c.userId === owner));
      const week = periodRange('WEEK', now, timezone);
      const activity = weeklyActivity(ctx.levelEvents || [], owner, week.start, Math.min(week.end, now + 1), timezone);
      const analytics = buildAnalytics(ctx, owner, period, now, timezone);
      const weeklyTasks = period === 'WEEK' ? analytics.tasks : buildAnalytics(ctx, owner, 'WEEK', now, timezone).tasks;
      const items = analytics.customers.items.filter(c => group === 'ALL' || c.group === group);
      const field = sort === 'TIME' ? 'latest' : sort === 'ORDERS' ? 'orders' : 'income';
      items.sort((a, b) => (a[field] - b[field]) * (direction === 'ASC' ? 1 : -1) || b.latest - a.latest || a.id.localeCompare(b.id));
      snapshot = randomUUID();
      data = { ...analytics, customers: { ...analytics.customers, items }, snapshot, expiresAt: now + 300000,
        offset: 0, nextOffset: null, filteredCount: items.length, weeklyTasks, weeklyPoints: taskPoints(weeklyTasks), officialLevel,
        levelStatus: !officialLevel ? 'PENDING_INITIALIZATION' : officialLevel.suspended ? 'SUSPENDED' : 'ACTIVE', activity, connectedActivity: ['login', 'accept', 'post', 'reply', 'greet'] };
      // Bounded cache: each account retains its latest eight snapshots, process retains 500.
      const owned = [...snapshots.entries()].filter(([, value]) => value.owner === owner);
      while (owned.length >= 8) snapshots.delete(owned.shift()![0]);
      if (snapshots.size >= 500) snapshots.delete(snapshots.keys().next().value!);
      snapshots.set(snapshot, { owner, data, key, postVersion });
    }
    if (offset > data.filteredCount) return ctx.sendError(res, 400, 'INVALID_OFFSET', 'Offset exceeds result set');
    return res.json({ ...data, customers: { ...data.customers, items: data.customers.items.slice(offset, offset + 20) }, offset,
      nextOffset: offset + 20 < data.filteredCount ? offset + 20 : null });
  });
}
