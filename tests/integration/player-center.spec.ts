import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { registerPlayerCenterRoutes } from '../../backend/player-center/routes.js';

function setup() {
  const now = Date.now();
  const ctx: any = {
    companions: [{ id: 'cp', userId: 'p', status: 'APPROVED' }, { id: 'cp2', userId: 'p2', status: 'APPROVED' }],
    orders: Array.from({ length: 25 }, (_, i) => ({ id: `o${i}`, userId: `u${i}`, companionId: 'cp', serviceName: 'Game', totalPrice: 100, status: 'COMPLETED', settlementDone: true, completedAt: now - i * 1000 })),
    users: [], reviews: [], walletTransactions: Array.from({ length: 25 }, (_, i) => ({ id: `t${i}`, userId: 'p', type: 'INCOME', amount: 100, referenceId: `o${i}`, timestamp: now - i * 1000 })),
    authMiddleware: (req: any, res: any, next: any) => { if (!req.headers.authorization) return res.sendStatus(401); req.authUserId = req.headers.authorization; next(); },
    sendError: (res: any, status: number, code: string) => res.status(status).json({ error: code }),
  };
  const app = express(); registerPlayerCenterRoutes(app, ctx); return { app, ctx };
}
describe('player center API', () => {
  it('invalidates task snapshots when an approved post loses eligibility', async () => {
    const { app, ctx } = setup();
    ctx.levelEvents = [{ id: 'post-approved:a', userId: 'p', kind: 'POST', at: Date.now() - 1, referenceId: 'a' }];
    const first = await request(app).get('/api/player-center').set('Authorization', 'p');
    expect(first.body.activity.post).toBe(5);
    ctx.levelEvents[0].revokedAt = Date.now();
    expect((await request(app).get(`/api/player-center?snapshot=${first.body.snapshot}`).set('Authorization', 'p')).status).toBe(410);
    expect((await request(app).get('/api/player-center').set('Authorization', 'p')).body.activity.post).toBe(0);
  });
  it('returns only the authenticated player activity and does not invent acceptance opportunities', async () => {
    const { app, ctx } = setup();
    ctx.levelEvents = [
      { id: 'login-p', userId: 'p', kind: 'LOGIN', at: Date.now() - 1 },
      { id: 'order-p2', userId: 'p2', kind: 'ACCEPT_OPPORTUNITY', referenceId: 'other-order', at: Date.now() - 1 },
    ];
    const response = await request(app).get('/api/player-center').set('Authorization', 'p');
    expect(response.status).toBe(200);
    expect(response.body.activity.loginDays).toBe(1);
    expect(response.body.activity.points).toBe(3);
    expect(response.body.activity.acceptanceRate).toBeNull();
    expect(response.body.connectedActivity).toEqual(['login', 'accept', 'post', 'reply', 'greet']);
    expect(response.body.officialLevel).toBeFalsy();
  });
  it('enforces authentication and player ownership', async () => {
    const { app } = setup();
    expect((await request(app).get('/api/player-center')).status).toBe(401);
    expect((await request(app).get('/api/player-center').set('Authorization', 'user')).status).toBe(403);
    const first = await request(app).get('/api/player-center?period=ALL').set('Authorization', 'p');
    expect(first.status).toBe(200);
    expect((await request(app).get(`/api/player-center?period=ALL&snapshot=${first.body.snapshot}`).set('Authorization', 'p2')).status).toBe(403);
  });
  it('keeps pages stable when source orders change', async () => {
    const { app, ctx } = setup();
    const first = await request(app).get('/api/player-center?period=ALL').set('Authorization', 'p');
    expect(first.body.customers.items).toHaveLength(20);
    ctx.orders.length = 0;
    const next = await request(app).get(`/api/player-center?period=ALL&snapshot=${first.body.snapshot}&offset=20`).set('Authorization', 'p');
    expect(next.body.customers.items).toHaveLength(5);
    expect(next.body.asOf).toBe(first.body.asOf);
    expect(next.body.nextOffset).toBeNull();
  });
  it('rejects stale snapshots and malformed filters', async () => {
    const { app } = setup();
    for (const query of ['period=YEAR', 'offset=-20', 'offset=20', 'direction=bad']) {
      expect((await request(app).get(`/api/player-center?${query}`).set('Authorization', 'p')).status).toBe(400);
    }
    expect((await request(app).get('/api/player-center?snapshot=gone').set('Authorization', 'p')).status).toBe(410);
  });
  it('expires after five minutes and rejects changed snapshot filters', async () => {
    const { app } = setup();
    const first = await request(app).get('/api/player-center?period=ALL').set('Authorization', 'p');
    const mismatch = await request(app).get(`/api/player-center?period=ALL&group=NEW&snapshot=${first.body.snapshot}`).set('Authorization', 'p');
    expect(mismatch.status).toBe(400);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(first.body.expiresAt);
    try {
      const expired = await request(app).get(`/api/player-center?period=ALL&snapshot=${first.body.snapshot}`).set('Authorization', 'p');
      expect(expired.status).toBe(410);
    } finally { clock.mockRestore(); }
  });
});
