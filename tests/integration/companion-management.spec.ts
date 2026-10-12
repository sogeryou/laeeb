import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { registerBusinessRoutes } from '../../backend/routes/business';
import { initialLevel } from '../../backend/player-center/officialLevel';

function setup() {
  const state: any = {
    users: ['buyer', 'provider', 'other'].map(id => ({ id, username: id, email: `${id}@test.local`, accountStatus: 'ACTIVE' })),
    companions: [{ id: 'cp', userId: 'provider', gameName: 'Game', intro: 'Duo', hourlyRate: 8, status: 'APPROVED', availability: 'ONLINE', ranking: initialLevel(), updatedAt: 1, services: [{ id: 'match', name: 'Ranked', unitPrice: 6, unit: 'match' }] }],
    orders: [], reviews: [], riskEvents: [], levelEvents: [], exposureLogs: [], wallets: { buyer: { userId: 'buyer', balance: 100, lastUpdated: 1 } }, diamondWallets: {}, walletTransactions: [], couponTemplates: [], couponGrants: [],
  };
  let saved: any;
  const ctx: any = {
    ...state,
    persistState: vi.fn(() => { saved = structuredClone(state); }),
    getUserById: (id: string) => state.users.find((u: any) => u.id === id),
    getBanError: (u: any, module: string) => !u || u.accountStatus !== 'ACTIVE' || u.banModules?.[module] ? 'BANNED' : null,
    getWallet: (id: string) => state.wallets[id],
    authMiddleware: (req: any, res: any, next: any) => { const id = req.headers.authorization; if (!state.users.some((u: any) => u.id === id)) return res.sendStatus(401); req.authUserId = id; next(); },
    sendError: (res: any, status: number, code: string) => res.status(status).json({ error: { code } }),
  };
  const app = express(); app.use(express.json()); registerBusinessRoutes(app, ctx);
  const get = (path: string, actor = 'provider') => request(app).get(path).set('Authorization', actor);
  const patch = (body: any, actor = 'provider') => request(app).patch('/api/companions/me/profile').set('Authorization', actor).send(body);
  const draft = (changes: any = {}) => ({ gameName: 'PUBG Mobile', intro: 'Saudi duo sessions', hourlyRate: 9, updatedAt: state.companions[0].updatedAt, services: [{ id: 'match', name: 'Ranked match', unitPrice: 7.5, unit: 'match' }, { id: 'new-extra', name: 'Coaching', unitPrice: 10, unit: 'hr' }], ...changes });
  return { app, ctx, state, get, patch, draft, saved: () => saved };
}

it('returns owner extras only and persists primary and extra edits with stable IDs', async () => {
  const s = setup();
  expect((await request(s.app).get('/api/companions/me/profile')).status).toBe(401);
  const before = await s.get('/api/companions/me/profile');
  expect(before.status).toBe(200);
  expect(before.headers['cache-control']).toBe('no-store');
  expect(before.body).toMatchObject({ id: 'cp', userId: 'provider', gameName: 'Game', hourlyRate: 8, services: [{ id: 'match' }] });
  const saved = await s.patch(s.draft());
  expect(saved.status).toBe(200);
  expect(saved.body).toMatchObject({ gameName: 'PUBG Mobile', intro: 'Saudi duo sessions', hourlyRate: 9, services: [{ id: 'match', unitPrice: 7.5 }, { id: 'new-extra' }] });
  expect(saved.body.updatedAt).toBeGreaterThan(1);
  expect((await s.get('/api/companions/me/profile')).body).toEqual(saved.body);
  expect(s.saved().companions[0].services.map((x: any) => x.id)).toEqual(['match', 'new-extra']);
});

it('rejects missing owner, unapproved and restricted writes while allowing owner reads', async () => {
  const s = setup();
  expect((await s.get('/api/companions/me/profile', 'buyer')).status).toBe(404);
  expect((await s.patch(s.draft(), 'buyer')).status).toBe(404);
  for (const restriction of ['PENDING', 'FROZEN', 'RISK_HOLD', 'SUSPENDED', 'ACCEPT_ORDER', 'ORDER']) {
    s.state.companions[0].status = restriction === 'PENDING' ? 'PENDING' : 'APPROVED';
    s.state.users[1].accountStatus = ['FROZEN', 'RISK_HOLD'].includes(restriction) ? restriction : 'ACTIVE';
    s.state.companions[0].ranking.suspended = restriction === 'SUSPENDED';
    s.state.users[1].banModules = ['ACCEPT_ORDER', 'ORDER'].includes(restriction) ? { [restriction]: true } : {};
    expect((await s.patch(s.draft())).status, restriction).toBe(403);
    expect((await s.get('/api/companions/me/profile')).status).toBe(200);
  }
  expect(s.ctx.persistState).not.toHaveBeenCalled();
});

it('rejects invalid, injected, removed, duplicate and primary-colliding services without mutation', async () => {
  const s = setup();
  const invalid = [
    { services: [] }, { services: [{ id: 'cp', name: 'Wrong', unitPrice: 5, unit: 'hr' }, s.draft().services[0]] },
    { services: [s.draft().services[0], s.draft().services[0]] },
    { services: [{ ...s.draft().services[0], unit: 'day' }] },
    { services: [{ ...s.draft().services[0], unitPrice: 7.555 }] },
    { services: [{ ...s.draft().services[0], id: 'bad id' }] },
    { services: [{ ...s.draft().services[0], unitPrice: 10000.01 }] },
    { services: [{ ...s.draft().services[0], name: '' }] },
    { status: 'APPROVED' }, { userId: 'other' }, { ranking: { level: 6 } },
    { hourlyRate: 10000 }, { intro: '' }, { updatedAt: '1' },
    { services: Array.from({ length: 21 }, (_, i) => ({ id: `extra${i}`, name: 'Extra', unitPrice: 5, unit: 'hr' })) },
  ];
  const original = structuredClone(s.state.companions[0]);
  for (const change of invalid) expect((await s.patch(s.draft(change))).status, JSON.stringify(change)).toBeGreaterThanOrEqual(400);
  expect(s.state.companions[0]).toEqual(original);
  expect(s.ctx.persistState).not.toHaveBeenCalled();
});

it('rejects stale revisions and restores the same entity and service references after save failure', async () => {
  const s = setup(); const entity = s.state.companions[0], services = entity.services, first = services[0];
  expect((await s.patch(s.draft({ updatedAt: 0 }))).status).toBe(409);
  s.ctx.persistState.mockImplementationOnce(() => { throw new Error('disk unavailable'); });
  const failed = await s.patch(s.draft());
  expect(failed.status).toBe(503);
  expect(s.state.companions[0]).toBe(entity);
  expect(entity.services).toBe(services);
  expect(entity.services[0]).toBe(first);
  expect(entity).toMatchObject({ gameName: 'Game', intro: 'Duo', hourlyRate: 8, updatedAt: 1 });
  expect((await s.patch(s.draft())).status).toBe(200);
});

it('reads legacy units but requires their correction before saving', async () => {
  const s = setup();
  s.state.companions[0].services = [
    { id: 'cp', name: 'Old primary', unitPrice: 8, unit: '小时' },
    { id: 'legacy', name: 'Legacy extra', unitPrice: 5, unit: '小时' },
  ];
  expect((await s.get('/api/companions/me/profile')).body.services).toEqual([{ id: 'legacy', name: 'Legacy extra', unitPrice: 5, unit: '小时' }]);
  expect((await s.patch(s.draft({ services: [{ id: 'legacy', name: 'Legacy extra', unitPrice: 5, unit: '小时' }] }))).status).toBe(400);
  expect((await s.patch(s.draft({ services: [{ id: 'legacy', name: 'Legacy extra', unitPrice: 5, unit: 'hr' }] }))).status).toBe(200);
  expect(s.state.companions[0].services.map((service: any) => service.id)).toEqual(['legacy']);
});

it('serves current public projection with approved review stats, no private fields, and no restricted providers', async () => {
  const s = setup();
  s.state.reviews.push({ id: 'good', orderId: 'old', userId: 'buyer', companionId: 'cp', rating: 5, content: 'Helpful', status: 'APPROVED', createdAt: 2 }, { id: 'hidden', orderId: 'old', userId: 'other', companionId: 'cp', rating: 1, content: 'Hidden', status: 'PENDING', createdAt: 3 });
  s.state.orders.push({ id: 'old', userId: 'buyer', companionId: 'cp', status: 'COMPLETED', settlementDone: true, completedAt: Date.now(), serviceId: 'match', serviceName: 'Ranked', unitPrice: 6, totalPrice: 6 });
  await s.patch(s.draft());
  const publicProfile = await s.get('/api/companions/cp/profile', 'buyer');
  expect(publicProfile.status).toBe(200);
  expect(publicProfile.headers['cache-control']).toBe('no-store');
  expect(publicProfile.body).toMatchObject({ id: 'cp', bio: 'Saudi duo sessions', price: 9, rating: 5, orderCount: '1' });
  expect(publicProfile.body.services.map((x: any) => x.id)).toEqual(['cp', 'match', 'new-extra']);
  expect(publicProfile.body.reviews.map((x: any) => x.id)).toEqual(['good']);
  expect((await request(s.app).get('/api/companions/cp/profile')).status).toBe(200);
  for (const key of ['email', 'ranking', 'passwordHash', 'hourlyRate', 'updatedAt']) expect(publicProfile.body).not.toHaveProperty(key);
  s.state.companions[0].status = 'PENDING'; expect((await s.get('/api/companions/cp/profile')).status).toBe(404);
  s.state.companions[0].status = 'APPROVED'; s.state.users[1].accountStatus = 'FROZEN'; expect((await s.get('/api/companions/cp/profile')).status).toBe(404);
});

it('uses new quote prices and preserves historical order snapshots', async () => {
  const s = setup();
  const old = { id: 'old', userId: 'buyer', companionId: 'cp', serviceId: 'match', serviceName: 'Ranked', unit: 'match', unitPrice: 6, totalPrice: 6, status: 'COMPLETED' };
  s.state.orders.push(old); const before = structuredClone(old);
  const quote = await request(s.app).post('/api/orders/quote').set('Authorization', 'buyer').send({ companionId: 'cp', serviceId: 'match', quantity: 2 });
  expect(quote.body.totalPrice).toBe(12);
  expect((await s.patch(s.draft())).status).toBe(200);
  const current = await request(s.app).post('/api/orders/quote').set('Authorization', 'buyer').send({ companionId: 'cp', serviceId: 'match', quantity: 2 });
  expect(current.body).toMatchObject({ serviceName: 'Ranked match', unitPrice: 7.5, totalPrice: 15 });
  expect(s.state.orders[0]).toEqual(before);
  const create = (expectedTotal: number) => request(s.app).post('/api/orders').set('Authorization', 'buyer').send({ companionId: 'cp', serviceId: 'match', quantity: 2, expectedTotal, requestId: 'changed-price' });
  const stale = await create(quote.body.totalPrice);
  expect(stale.status).toBe(409);
  expect(stale.body.error.code).toBe('ORDER_PRICE_CHANGED');
  expect(s.state.wallets.buyer.balance).toBe(100);
  const funded = await create(current.body.totalPrice);
  expect(funded.status).toBe(201);
  expect(funded.body).toMatchObject({ serviceName: 'Ranked match', unitPrice: 7.5, totalPrice: 15 });
  expect(s.state.wallets.buyer.balance).toBe(85);
  expect((await create(current.body.totalPrice)).body.id).toBe(funded.body.id);
  expect(s.state.walletTransactions.filter((t: any) => t.type === 'ORDER_PAY')).toHaveLength(1);
  expect(s.state.orders[0]).toEqual(before);
});

it('does not let the old application endpoint mutate or reapprove an existing provider', async () => {
  const s = setup();
  for (const restriction of ['ACTIVE', 'PENDING', 'FROZEN', 'SUSPENDED']) {
    s.state.companions[0].status = restriction === 'PENDING' ? 'PENDING' : 'APPROVED';
    s.state.users[1].accountStatus = restriction === 'FROZEN' ? 'FROZEN' : 'ACTIVE';
    s.state.companions[0].ranking.suspended = restriction === 'SUSPENDED';
    const before = structuredClone(s.state.companions[0]);
    const response = await request(s.app).post('/api/companions/apply').set('Authorization', 'provider').send({ gameName: 'Other game', intro: 'Bypass', hourlyRate: 9 });
    expect(response.status, restriction).toBe(409);
    expect(response.body.error.code).toBe('COMPANION_ALREADY_EXISTS');
    expect(s.state.companions[0]).toEqual(before);
  }
  expect(s.ctx.persistState).not.toHaveBeenCalled();
});

it('rejects blank service names, primary game and introduction at the server boundary', async () => {
  const s = setup();
  for (const changes of [{ gameName: '   ' }, { intro: '   ' }, { services: [{ ...s.draft().services[0], name: '   ' }] }]) {
    expect((await s.patch(s.draft(changes))).status).toBe(400);
  }
  expect(s.ctx.persistState).not.toHaveBeenCalled();
});
