import express from 'express';
import request from 'supertest';
import { expect, it } from 'vitest';
import { registerLevelInitialization } from '../../backend/player-center/officialLevel';
import { registerHomeExposure } from '../../backend/routes/homeExposure';
it('requires admin initialization, audits imports, and does not overwrite historical levels', async () => {
  const ctx: any = { companions: [{ id: 'c', userId: 'p', hourlyRate: 20, status: 'APPROVED', availability: 'ONLINE', gameName: 'Game' }], users: [], reviews: [], orders: [], exposureLogs: [], auditLogs: [], persistState() {}, appendAuditLog(...args: any[]) { this.auditLogs.push(args); }, authMiddleware(req: any, res: any, next: any) { if (!req.headers.authorization) return res.sendStatus(401); req.authUserId = req.headers.authorization; next(); }, requireAdmin() { return (req: any, res: any, next: any) => req.authUserId === 'admin' ? next() : res.sendStatus(403); } };
  const app = express(); app.use(express.json()); registerLevelInitialization(app, ctx); registerHomeExposure(app, ctx);
  const path = '/api/admin/companions/c/level-initialization', body = { level: 5, score: 1600, noOrderWeeks: 0, lv1Weeks: 0, suspended: false, reason: 'Verified historical ledger' };
  expect((await request(app).post(path).set('Authorization', 'p').send(body)).status).toBe(403);
  expect((await request(app).post(path).set('Authorization', 'admin').send(body)).status).toBe(200);
  expect(ctx.auditLogs).toHaveLength(1);
  expect((await request(app).get('/api/home/feed')).body.items[0].isLegend).toBe(true);
  expect((await request(app).post(path).set('Authorization', 'admin').send({ ...body, level: 1, score: 0 })).status).toBe(409);
  expect(ctx.companions[0].ranking.level).toBe(5);
});
