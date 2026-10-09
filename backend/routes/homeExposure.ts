import type express from 'express';
import { randomUUID } from 'node:crypto';
import type { AppContext } from '../app/context.js';
import type { EPal } from '../../shared/types.js';
import { rankCompanions } from '../algo/m6Exposure.js';
import { readOfficialLevel } from '../player-center/officialLevel.js';

const avatar = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#281940"/><text x="50" y="65" text-anchor="middle" font-size="50" fill="white">♟</text></svg>');
export function registerHomeExposure(app: express.Application, ctx: AppContext) {
  const snapshots = new Map<string, { expires: number; items: EPal[]; seen: Set<string>; delivered: Set<string>; ip: string }>();
  app.get('/api/home/feed', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const now = Date.now();
    for (const [key, value] of snapshots) if (value.expires <= now) snapshots.delete(key);
    let key = String(req.query.snapshot || '');
    const offset = Number(req.query.offset || 0);
    if (!Number.isInteger(offset) || offset < 0 || offset % 20 || (!key && offset)) return res.status(400).json({ error: 'INVALID_OFFSET' });
    if (!key) {
      if ([...snapshots.values()].filter(s => s.ip === req.ip).length >= 30) return res.status(429).json({ error: 'FEED_RATE_LIMIT' });
      const logs = ctx.exposureLogs.filter(e => e.createdAt > now - 86_400_000 && e.createdAt <= now);
      const candidates = ctx.companions.filter(c => c.status === 'APPROVED' && c.availability === 'ONLINE' && !readOfficialLevel(c)?.suspended && !['FROZEN', 'RISK_HOLD'].includes(ctx.users.find(u => u.id === c.userId)?.accountStatus || '')).map(c => {
        const orders = ctx.orders.filter(o => o.companionId === c.id && o.status === 'COMPLETED' && o.settlementDone && (o.completedAt || 0) > now - 30 * 86_400_000);
        const reviews = ctx.reviews.filter(r => r.companionId === c.id && r.status === 'APPROVED' && r.rating >= 1 && r.rating <= 5);
        return { companionId: c.id, level: readOfficialLevel(c)?.level ?? 1, impressions24h: logs.filter(e => e.companionId === c.id && e.eventType === 'impression').length, clicks24h: logs.filter(e => e.companionId === c.id && e.eventType === 'click').length, completedOrders30d: orders.length, avgRating: reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0, activityScore: Math.min(150, orders.length * 3), orderRecencyHours: orders.length ? (now - Math.max(...orders.map(o => o.completedAt || 0))) / 3_600_000 : 9999, availability: c.availability };
      });
      const ranked = rankCompanions(candidates, { weights: { wOrder: .4, wRating: .35, wActive: .25, wBizGlobal: .15 }, nowSeed: Math.floor(now / 3_600_000) }, candidates.length);
      const items: EPal[] = ranked.map(r => {
        const c = ctx.companions.find(c => c.id === r.companionId)!;
        const stats = candidates.find(s => s.companionId === c.id)!;
        return { id: c.id, name: ctx.users.find(u => u.id === c.userId)?.username || 'Player', avatarUrl: avatar, rating: stats.avgRating, orderCount: String(stats.completedOrders30d), price: c.hourlyRate, game: c.gameName, tags: [], onlineStatus: 'Online', isLegend: r.pool === 'FEATURED', bio: c.intro, services: [{ id: c.id, name: c.gameName, icon: '🎮', posterUrl: avatar, description: c.intro, rating: stats.avgRating, orderCount: String(stats.completedOrders30d), screenshots: [], variants: [{ name: c.gameName, price: c.hourlyRate, unit: 'hr' }] }] };
      });
      while (snapshots.size >= 500) snapshots.delete(snapshots.keys().next().value!);
      key = randomUUID(); snapshots.set(key, { expires: now + 300_000, items, seen: new Set(), delivered: new Set(), ip: req.ip || '' });
    }
    const snapshot = snapshots.get(key);
    if (!snapshot || snapshot.expires <= now) return res.status(410).json({ error: 'SNAPSHOT_EXPIRED' });
    const items = snapshot.items.slice(offset, offset + 20);
    items.forEach(item => snapshot.delivered.add(item.id));
    res.json({ snapshot: key, items, nextOffset: offset + 20 < snapshot.items.length ? offset + 20 : null });
  });
  app.post('/api/home/events', (req, res) => {
    const now = Date.now(), snapshot = snapshots.get(req.body?.snapshot);
    if (!snapshot || snapshot.expires <= now) return res.status(410).json({ error: 'SNAPSHOT_EXPIRED' });
    const events = req.body?.events;
    if (!Array.isArray(events) || !events.length || events.length > 50 || events.some(e => !e || !snapshot.delivered.has(e.companionId) || !['impression', 'click', 'detail'].includes(e.type))) return res.status(400).json({ error: 'INVALID_EVENTS' });
    let accepted = 0;
    for (const event of events) {
      const key = `${event.companionId}:${event.type}`;
      if (snapshot.seen.has(key)) continue;
      snapshot.seen.add(key); accepted++;
      ctx.exposureLogs.push({ id: randomUUID(), companionId: event.companionId, viewerId: req.body.snapshot, eventType: event.type, createdAt: now });
    }
    if (accepted) ctx.persistState();
    res.json({ accepted });
  });
}
