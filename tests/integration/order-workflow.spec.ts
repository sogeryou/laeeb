import express from 'express';
import request from 'supertest';
import { afterEach, expect, it, vi } from 'vitest';
import { registerBusinessRoutes } from '../../backend/routes/business';
import { registerHomeExposure } from '../../backend/routes/homeExposure';
import { initialLevel } from '../../backend/player-center/officialLevel';

function setup(saved?: any) {
  const state = saved || {
    users: ['buyer', 'provider', 'other'].map(id => ({ id, username: id, avatar: `${id}.png`, accountStatus: 'ACTIVE' })),
    companions: [{ id: 'cp', userId: 'provider', gameName: 'Game', intro: 'Duo', hourlyRate: 8.25, status: 'APPROVED', availability: 'ONLINE', ranking: initialLevel(), services: [{ id: 'match', name: 'Ranked match', unitPrice: 5.55, unit: 'match' }] }],
    orders: [], reviews: [], riskEvents: [], levelEvents: [], exposureLogs: [],
    wallets: { buyer: { userId: 'buyer', balance: 100, lastUpdated: 1 }, other: { userId: 'other', balance: 100, lastUpdated: 1 } },
    diamondWallets: {}, walletTransactions: [],
    couponTemplates: [{ id: 'tpl', name: 'Welcome', type: 'PERCENT', value: 10, minSpend: 5 }],
    couponGrants: [{ id: 'grant', templateId: 'tpl', userId: 'buyer', status: 'ACTIVE', expiresAt: Date.now() + 86400000 }],
  };
  let persisted: any;
  const ctx: any = {
    ...state,
    persistState: vi.fn(() => { persisted = JSON.parse(JSON.stringify(state)); }),
    getUserById: (id: string) => state.users.find((u: any) => u.id === id),
    getBanError: (u: any, module: string) => !u || u.accountStatus === 'FROZEN' || u.banModules?.[module] ? 'BANNED' : null,
    getWallet: (id: string) => state.wallets[id] ||= { userId: id, balance: 0, lastUpdated: Date.now() },
    createRiskEvent: (type: string, relatedEntityId: string, severity: string, description: string) => state.riskEvents.push({ id: 'risk', type, relatedEntityId, severity, description }),
    authMiddleware: (req: any, res: any, next: any) => {
      const id = req.headers.authorization;
      if (!state.users.some((u: any) => u.id === id)) return res.sendStatus(401);
      req.authUserId = id; next();
    },
    sendError: (res: any, status: number, code: string) => res.status(status).json({ error: { code } }),
  };
  const app = express(); app.use(express.json()); registerBusinessRoutes(app, ctx); registerHomeExposure(app, ctx);
  const post = (path: string, body: any = {}, actor = 'buyer') => request(app).post(path).set('Authorization', actor).send(body);
  const create = (body: any = {}, actor = 'buyer') => post('/api/orders', { companionId: 'cp', quantity: 1, ...body }, actor);
  const get = (path: string, actor = 'buyer') => request(app).get(path).set('Authorization', actor);
  return { app, ctx, post, create, get, saved: () => persisted };
}
afterEach(() => vi.restoreAllMocks());

it('authenticates quotes and prices selected configured services with canonical money', async () => {
  const { app, post, create, ctx } = setup();
  expect((await request(app).post('/api/orders/quote').send({ companionId: 'cp' })).status).toBe(401);
  const body = { companionId: 'cp', serviceId: 'match', serviceName: 'Ranked match', quantity: 3, couponGrantId: 'grant' };
  const quote = await post('/api/orders/quote', body);
  expect(quote.status).toBe(200);
  expect(quote.body).toEqual({ companionId: 'cp', serviceId: 'match', serviceName: 'Ranked match', unit: 'match', quantity: 3, unitPrice: 5.55, subtotal: 16.65, discount: 1.67, totalPrice: 14.98, couponGrantId: 'grant' });
  expect(ctx.wallets.buyer.balance).toBe(100); expect(ctx.couponGrants[0].status).toBe('ACTIVE');
  const order = await create({ ...body, expectedTotal: quote.body.totalPrice, requestId: 'selected' });
  expect(order.status).toBe(201);
  expect(order.body).toMatchObject({ ...quote.body, role: 'BUYER', participant: { id: 'cp', userId: 'provider' }, reviewed: false, workflowVersion: 2, escrowState: 'FROZEN' });
  expect(ctx.wallets.buyer.balance).toBe(85.02);
});

it('uses the home feed default hourly service and rejects fabricated services or variants', async () => {
  const { post, create } = setup();
  expect((await post('/api/orders/quote', { companionId: 'cp', serviceId: 'cp', serviceName: 'Game', quantity: 2 })).body).toMatchObject({ unit: 'hr', unitPrice: 8.25, subtotal: 16.5, totalPrice: 16.5 });
  expect((await create({ serviceId: 'missing' })).body.error?.code).toBe('ORDER_SERVICE_NOT_FOUND');
  expect((await create({ serviceId: 'match', serviceName: 'fake variant' })).body.error?.code).toBe('ORDER_SERVICE_NOT_FOUND');
  expect((await create({ serviceName: 'fake variant' })).body.error?.code).toBe('ORDER_SERVICE_NOT_FOUND');
});

it('rejects changed quoted totals before funding or consuming coupons', async () => {
  const { post, create, ctx } = setup();
  const body = { companionId: 'cp', quantity: 1, couponGrantId: 'grant' };
  const quote = await post('/api/orders/quote', body);
  ctx.companions[0].hourlyRate = 9;
  const result = await create({ ...body, expectedTotal: quote.body.totalPrice });
  expect(result.status).toBe(409); expect(result.body.error?.code).toBe('ORDER_PRICE_CHANGED');
  expect(ctx.wallets.buyer.balance).toBe(100); expect(ctx.orders).toHaveLength(0); expect(ctx.couponGrants[0].status).toBe('ACTIVE');
});

it('persists buyer-scoped request IDs and replays used coupons without a second debit', async () => {
  const { create, ctx, saved } = setup();
  const body = { requestId: 'key', couponGrantId: 'grant', expectedTotal: 7.42 };
  const first = await create(body); expect(first.status).toBe(201);
  const restored = setup(saved());
  restored.ctx.companions[0].hourlyRate = 9; restored.ctx.companions[0].availability = 'OFFLINE';
  const replay = await restored.create(body);
  expect(replay.status).toBe(200); expect(replay.body.id).toBe(first.body.id);
  expect(restored.ctx.wallets.buyer.balance).toBe(92.58);
  expect(restored.ctx.walletTransactions.filter((t: any) => t.type === 'ORDER_PAY')).toHaveLength(1);
  expect(restored.ctx.orders).toHaveLength(1);
  for (const changes of [{ quantity: 2 }, { serviceId: 'match' }, { expectedTotal: 7.41 }, { couponGrantId: undefined }, { serviceName: 'Game' }]) {
    const conflict = await restored.create({ ...body, ...changes });
    expect(conflict.status).toBe(409); expect(conflict.body.error?.code).toBe('ORDER_REQUEST_ID_CONFLICT');
  }
  const other = await create({ requestId: 'key' }, 'other');
  expect(other.status).toBe(201); expect(other.body.id).not.toBe(first.body.id);
  expect(ctx.orders).toHaveLength(2);
});

it('recovers a funded same-key response after a buyer ORDER ban without permitting new funding', async () => {
  const { create, post, ctx } = setup();
  const body = { requestId: 'lost-response', couponGrantId: 'grant', expectedTotal: 7.42 };
  const first = await create(body); expect(first.status).toBe(201);
  ctx.users[0].banModules = { ORDER: true };
  const replay = await create(body);
  expect(replay.status).toBe(200);
  expect(replay.body).toMatchObject({ id: first.body.id, role: 'BUYER', participant: { userId: 'provider' }, reviewed: false, totalPrice: 7.42, workflowVersion: 2 });
  expect((await create({ requestId: 'new-funding' })).body.error?.code).toBe('ORDER_ACTION_BLOCKED');
  expect((await post('/api/orders/quote', { companionId: 'cp', quantity: 1 })).status).toBe(403);
  expect(ctx.orders).toHaveLength(1); expect(ctx.wallets.buyer.balance).toBe(92.58);
  expect(ctx.walletTransactions.filter((t: any) => t.type === 'ORDER_PAY')).toHaveLength(1);
  expect(ctx.couponGrants[0].status).toBe('USED');
});

it('resolves a buyer-scoped payload conflict before a newly imposed ORDER ban', async () => {
  const { create, ctx } = setup();
  await create({ requestId: 'conflict-after-ban' });
  ctx.users[0].banModules = { ORDER: true };
  const conflict = await create({ requestId: 'conflict-after-ban', quantity: 2 });
  expect(conflict.status).toBe(409); expect(conflict.body.error?.code).toBe('ORDER_REQUEST_ID_CONFLICT');
  expect(ctx.orders).toHaveLength(1); expect(ctx.wallets.buyer.balance).toBe(91.75);
});

it('serializes concurrent retries and funding failures leave no order', async () => {
  const { create, post, ctx } = setup();
  const results = await Promise.all([create({ requestId: 'same' }), create({ requestId: 'same' })]);
  expect(results.map(r => r.status).sort()).toEqual([200, 201]);
  expect(ctx.orders).toHaveLength(1); expect(ctx.wallets.buyer.balance).toBe(91.75);
  await post(`/api/orders/${ctx.orders[0].id}/cancel`);
  ctx.wallets.buyer.balance = 0;
  expect((await create({ requestId: 'poor', couponGrantId: 'grant' })).body.error?.code).toBe('WALLET_INSUFFICIENT_BALANCE');
  expect(ctx.orders).toHaveLength(1); expect(ctx.couponGrants[0].status).toBe('ACTIVE');
});

it.each(['CREATED', 'IN_SERVICE', 'AWAITING_CONFIRMATION', 'DISPUTED'])('prevents a second funded ongoing %s order but replays the first and permits other buyers', async (status) => {
  const { create, ctx } = setup();
  const first = await create({ requestId: 'first' });
  Object.assign(ctx.orders[0], { status, confirmationDueAt: Date.now() + 7200000 });
  expect((await create({ requestId: 'first' })).body.id).toBe(first.body.id);
  const second = await create({ requestId: 'second' });
  expect(second.status).toBe(409); expect(second.body.error?.code).toBe('ORDER_ONGOING_EXISTS');
  expect(ctx.wallets.buyer.balance).toBe(91.75);
  expect((await create({ requestId: 'second' }, 'other')).status).toBe(201);
});

it.each(['CANCELLED', 'REFUNDED', 'COMPLETED'])('permits a new order after terminal %s and ignores unfunded legacy orders', async (status) => {
  const { create, ctx } = setup();
  await create({ requestId: 'first' }); ctx.orders[0].status = status;
  ctx.orders.push({ id: 'legacy', userId: 'buyer', companionId: 'cp', status: 'CREATED', createdAt: Date.now() });
  expect((await create({ requestId: 'second' })).status).toBe(201);
});

it('rolls back funding, coupon usage and events when saving fails, then permits retry', async () => {
  const { create, ctx } = setup();
  ctx.persistState.mockImplementationOnce(() => { throw new Error('disk unavailable'); });
  const failed = await create({ requestId: 'disk', couponGrantId: 'grant' });
  expect(failed.status).toBe(503); expect(ctx.wallets.buyer.balance).toBe(100);
  expect(ctx.orders).toHaveLength(0); expect(ctx.walletTransactions).toHaveLength(0); expect(ctx.levelEvents).toHaveLength(0);
  expect(ctx.couponGrants[0].status).toBe('ACTIVE');
  expect((await create({ requestId: 'disk', couponGrantId: 'grant' })).status).toBe(201);
});

it('initializes missing wallets inside the single durable order save', async () => {
  const { ctx } = setup(); delete ctx.wallets.buyer;
  ctx.getWallet = (userId: string) => {
    if (!ctx.wallets[userId]) { ctx.wallets[userId] = { userId, balance: 0 }; ctx.persistState(); }
    return ctx.wallets[userId];
  };
  Object.assign(ctx.couponTemplates[0], { type: 'FIXED', value: 100, minSpend: 0 });
  const app = express(); app.use(express.json()); registerBusinessRoutes(app, ctx);
  expect((await request(app).post('/api/orders').set('Authorization', 'buyer').send({ companionId: 'cp', quantity: 1, couponGrantId: 'grant', requestId: 'free', expectedTotal: 0 })).status).toBe(201);
  expect(ctx.persistState).toHaveBeenCalledTimes(1);
  expect(ctx.wallets.buyer.balance).toBe(0); expect(ctx.orders[0].totalPrice).toBe(0);
});

it.each(['suspended', 'FROZEN', 'RISK_HOLD', 'ACCEPT_ORDER'])('blocks %s providers from quotes, funding, acceptance and feed', async (restriction) => {
  const { create, post, get, ctx } = setup();
  const order = await create();
  if (restriction === 'suspended') ctx.companions[0].ranking.suspended = true;
  else if (restriction === 'ACCEPT_ORDER') ctx.users[1].banModules = { ACCEPT_ORDER: true };
  else ctx.users[1].accountStatus = restriction;
  expect((await post('/api/orders/quote', { companionId: 'cp' })).status).toBe(403);
  expect((await create()).status).toBe(403);
  expect((await post(`/api/orders/${order.body.id}/accept`, {}, 'provider')).status).toBe(403);
  expect(ctx.orders[0].status).toBe('CREATED');
  expect((await get('/api/home/feed')).body.items).toHaveLength(0);
});

it('rejects acceptance after provider approval is revoked', async () => {
  const { create, post, ctx } = setup(); const id = (await create()).body.id;
  ctx.companions[0].status = 'REJECTED';
  expect((await post(`/api/orders/${id}/accept`, {}, 'provider')).status).toBe(403);
  expect(ctx.orders[0].status).toBe('CREATED');
});

it('supplies real user IDs and configured service choices in the home feed', async () => {
  const { get, post } = setup();
  const item = (await get('/api/home/feed')).body.items[0];
  expect(item.userId).toBe('provider');
  expect(item.services.map((s: any) => s.id)).toEqual(['cp', 'match']);
  for (const service of item.services) {
    const variant = service.variants[0];
    const quote = await post('/api/orders/quote', { companionId: item.id, serviceId: service.id, serviceName: variant.name, quantity: 1 });
    expect(quote.status).toBe(200); expect(quote.body.unitPrice).toBe(variant.price); expect(quote.body.unit).toBe(variant.unit);
  }
});

it('returns role-aware lists and actions through completion with exact counterpart IDs', async () => {
  const { create, get, post, ctx } = setup();
  const created = await create(); const id = created.body.id;
  expect((await get('/api/orders')).body[0]).toMatchObject({ role: 'BUYER', participant: { userId: 'provider' }, reviewed: false });
  expect((await get('/api/orders', 'provider')).body[0]).toMatchObject({ role: 'COMPANION', participant: { id: 'buyer', userId: 'buyer', name: 'buyer' } });
  expect((await get('/api/orders', 'other')).body).toEqual([]);
  expect((await post(`/api/orders/${id}/accept`)).status).toBe(403);
  expect((await post(`/api/orders/${id}/accept`, {}, 'provider')).body).toMatchObject({ status: 'IN_SERVICE', role: 'COMPANION', participant: { userId: 'buyer' } });
  expect((await post(`/api/orders/${id}/start`, {}, 'provider')).status).toBe(409);
  expect((await post(`/api/orders/${id}/complete`, {}, 'provider')).status).toBe(409);
  expect((await post(`/api/orders/${id}/complete`, { evidence: ['proof'] }, 'provider')).body).toMatchObject({ status: 'AWAITING_CONFIRMATION', completionEvidence: ['proof'] });
  expect(ctx.diamondWallets.provider).toBeUndefined();
  expect((await post(`/api/orders/${id}/confirm`, {}, 'provider')).status).toBe(403);
  const completed = await post(`/api/orders/${id}/confirm`);
  expect(completed.body).toMatchObject({ status: 'COMPLETED', role: 'BUYER', escrowState: 'SETTLED' });
  await post(`/api/orders/${id}/confirm`);
  expect(ctx.diamondWallets.provider.balance).toBe(8.25);
  expect(ctx.walletTransactions.filter((t: any) => t.type === 'INCOME')).toHaveLength(1);
});

it('refunds cancellation once and preserves the legacy reconciliation guard', async () => {
  const { create, post, ctx, get } = setup();
  const order = await create();
  expect((await post(`/api/orders/${order.body.id}/cancel`, {}, 'provider')).status).toBe(403);
  expect((await post(`/api/orders/${order.body.id}/cancel`)).body).toMatchObject({ status: 'CANCELLED', role: 'BUYER', escrowState: 'RETURNED' });
  await post(`/api/orders/${order.body.id}/cancel`); expect(ctx.wallets.buyer.balance).toBe(100);
  ctx.orders.push({ id: 'legacy', userId: 'buyer', companionId: 'cp', serviceName: 'Game', quantity: 1, unitPrice: 8, totalPrice: 8, status: 'CREATED', createdAt: 1 });
  expect((await get('/api/orders')).body).toHaveLength(2);
  expect((await post('/api/orders/legacy/accept', {}, 'provider')).body.error?.code).toBe('LEGACY_ORDER_RECONCILIATION_REQUIRED');
});

it('keeps completed unfunded legacy orders read-only through the review API', async () => {
  const { post, ctx } = setup();
  ctx.orders.push({ id: 'legacy', userId: 'buyer', companionId: 'cp', serviceName: 'Game', quantity: 1, unitPrice: 8, totalPrice: 8, status: 'COMPLETED', createdAt: 1 });
  const result = await post('/api/reviews', { orderId: 'legacy', rating: 5, content: 'Historical' });
  expect(result.status).toBe(409);
  expect(result.body.error?.code).toBe('LEGACY_ORDER_RECONCILIATION_REQUIRED');
  expect(ctx.reviews).toHaveLength(0);
  expect(ctx.persistState).not.toHaveBeenCalled();
});

it('deduplicates dispute risk events and holds funds for arbitration', async () => {
  const { create, post, ctx } = setup(); const id = (await create()).body.id;
  await post(`/api/orders/${id}/accept`, {}, 'provider');
  await post(`/api/orders/${id}/complete`, { evidence: ['proof'] }, 'provider');
  expect((await post(`/api/orders/${id}/dispute`, { reason: 'Not completed' })).status).toBe(409);
  const body = { reason: 'Not completed', evidence: ['proof'] };
  const disputed = await post(`/api/orders/${id}/dispute`, body);
  expect(disputed.body.status).toBe('DISPUTED');
  await post(`/api/orders/${id}/dispute`, body);
  expect(ctx.riskEvents).toHaveLength(1); expect(ctx.riskEvents[0]).toMatchObject({ type: 'ORDER_DISPUTE', relatedEntityId: id, severity: 'MEDIUM' });
  expect(ctx.orders[0].escrowState).toBe('FROZEN'); expect(ctx.diamondWallets.provider).toBeUndefined();
});

it('rolls back failed acceptance, dispute, settlement and review saves', async () => {
  const { create, post, ctx } = setup(); const id = (await create()).body.id;
  const failSave = () => ctx.persistState.mockImplementationOnce(() => { throw new Error('disk unavailable'); });
  failSave(); expect((await post(`/api/orders/${id}/accept`, {}, 'provider')).status).toBe(503);
  expect(ctx.orders[0].status).toBe('CREATED'); expect(ctx.levelEvents.filter((e: any) => e.kind === 'ACCEPT')).toHaveLength(0);
  await post(`/api/orders/${id}/accept`, {}, 'provider');
  await post(`/api/orders/${id}/complete`, { evidence: ['proof'] }, 'provider');
  failSave(); expect((await post(`/api/orders/${id}/dispute`, { reason: 'bad', evidence: ['proof'] })).status).toBe(503);
  expect(ctx.orders[0].status).toBe('AWAITING_CONFIRMATION'); expect(ctx.riskEvents).toHaveLength(0);
  failSave(); expect((await post(`/api/orders/${id}/confirm`)).status).toBe(503);
  expect(ctx.orders[0].escrowState).toBe('FROZEN'); expect(ctx.diamondWallets.provider).toBeUndefined();
  expect(ctx.walletTransactions.filter((t: any) => t.type === 'INCOME')).toHaveLength(0);
  await post(`/api/orders/${id}/confirm`);
  failSave(); expect((await post('/api/reviews', { orderId: id, rating: 5 })).status).toBe(503);
  expect(ctx.reviews).toHaveLength(0);
  expect((await post('/api/reviews', { orderId: id, rating: 5 })).status).toBe(201);
});

it('rolls back automatic deadline refunds on a failed save and frees booking after expiry', async () => {
  const { create, get, ctx } = setup(); const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now);
  const first = await create({ requestId: 'first' });
  vi.mocked(Date.now).mockReturnValue(now + 900000);
  ctx.persistState.mockImplementationOnce(() => { throw new Error('disk unavailable'); });
  expect((await get('/api/orders')).status).toBe(503);
  expect(ctx.orders[0].status).toBe('CREATED'); expect(ctx.wallets.buyer.balance).toBe(91.75);
  expect(ctx.walletTransactions.filter((t: any) => t.type === 'REFUND')).toHaveLength(0);
  expect((await create({ requestId: 'second' })).status).toBe(201);
  expect(ctx.orders[0].status).toBe('CANCELLED'); expect(ctx.orders[1].id).not.toBe(first.body.id);
  expect(ctx.wallets.buyer.balance).toBe(91.75);
});

it('keeps immutable order pricing snapshots and internal replay payloads out of DTOs', async () => {
  const { create, ctx, get } = setup();
  const first = await create({ requestId: 'snapshot', serviceId: 'match' });
  expect(first.body.requestPayload).toBeUndefined();
  expect(ctx.orders[0].requestPayload).toEqual(expect.any(String));
  Object.assign(ctx.companions[0].services[0], { name: 'Changed', unitPrice: 25, unit: 'hr' });
  expect((await get('/api/orders')).body[0]).toMatchObject({ serviceName: 'Ranked match', serviceId: 'match', unit: 'match', unitPrice: 5.55, totalPrice: 5.55 });
});

it('validates coupon ownership, expiry and minimum and caps fixed discounts at the subtotal', async () => {
  const { post, create, ctx } = setup();
  const body = { companionId: 'cp', quantity: 1, couponGrantId: 'grant' };
  expect((await post('/api/orders/quote', body, 'other')).body.error?.code).toBe('COUPON_INVALID');
  ctx.couponTemplates[0].minSpend = 20;
  expect((await create({ couponGrantId: 'grant' })).body.error?.code).toBe('COUPON_MIN_SPEND');
  Object.assign(ctx.couponTemplates[0], { minSpend: 0, type: 'FIXED', value: 30 });
  expect((await post('/api/orders/quote', body)).body).toMatchObject({ subtotal: 8.25, discount: 8.25, totalPrice: 0 });
  ctx.couponGrants[0].expiresAt = Date.now();
  expect((await post('/api/orders/quote', body)).body.error?.code).toBe('COUPON_INVALID');
  expect(ctx.wallets.buyer.balance).toBe(100); expect(ctx.orders).toHaveLength(0);
});

it.each([undefined, NaN, Infinity])('rejects an active coupon without a valid finite expiry (%s)', async (expiresAt) => {
  const { post, ctx } = setup(); ctx.couponGrants[0].expiresAt = expiresAt;
  expect((await post('/api/orders/quote', { companionId: 'cp', quantity: 1, couponGrantId: 'grant' })).body.error?.code).toBe('COUPON_INVALID');
});

it('enforces deadline refunds and confirmation without touching legacy records', async () => {
  const { create, get, post, ctx } = setup(); const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now);
  const pending = (await create()).body;
  vi.mocked(Date.now).mockReturnValue(now + 900000);
  expect((await get('/api/orders')).body[0].status).toBe('CANCELLED'); expect(ctx.wallets.buyer.balance).toBe(100);
  const active = (await create()).body;
  await post(`/api/orders/${active.id}/accept`, {}, 'provider');
  const completed = (await post(`/api/orders/${active.id}/complete`, { evidence: ['proof'] }, 'provider')).body;
  vi.mocked(Date.now).mockReturnValue(completed.confirmationDueAt);
  expect((await get('/api/orders')).body.find((o: any) => o.id === active.id).status).toBe('COMPLETED');
  expect(ctx.diamondWallets.provider.balance).toBe(8.25); expect(pending.id).not.toBe(active.id);
});

it.each([{ rating: 1.5 }, { rating: 0 }, { rating: 6 }, { rating: '5' }, { content: 'x'.repeat(2001) }, { tags: ['x'.repeat(41)] }, { tags: Array(11).fill('tag') }])('rejects invalid review fields %j', async (invalid) => {
  const { create, post, ctx } = setup(); const id = (await create()).body.id;
  Object.assign(ctx.orders[0], { status: 'COMPLETED', escrowState: 'SETTLED' });
  expect((await post('/api/reviews', { orderId: id, rating: 5, content: 'Great', ...invalid })).status).toBe(400);
  expect(ctx.reviews).toHaveLength(0);
});

it('keeps buyer-only completed duplicate review rules, tags and existing moderation', async () => {
  const { create, post, get, ctx } = setup(); const id = (await create()).body.id;
  const body = { orderId: id, rating: 4, content: 'Great', tags: ['Friendly'] };
  expect((await post('/api/reviews', body)).status).toBe(409);
  Object.assign(ctx.orders[0], { status: 'COMPLETED', escrowState: 'SETTLED' });
  expect((await post('/api/reviews', body, 'provider')).status).toBe(403);
  const review = await post('/api/reviews', body);
  expect(review.status).toBe(201); expect(review.body).toMatchObject({ ...body, status: 'APPROVED', createdAt: expect.any(Number) });
  expect((await post('/api/reviews', body)).status).toBe(409);
  expect((await get('/api/orders')).body[0]).toMatchObject({ reviewed: true, review: review.body });
  const second = (await create()).body.id; Object.assign(ctx.orders[1], { status: 'COMPLETED', escrowState: 'SETTLED' });
  expect((await post('/api/reviews', { ...body, orderId: second, content: 'fraud' })).body.status).toBe('REJECTED');
  const third = (await create()).body.id; Object.assign(ctx.orders[2], { status: 'COMPLETED', escrowState: 'SETTLED' });
  expect((await post('/api/reviews', { ...body, orderId: third, tags: ['scam'] })).body.status).toBe('REJECTED');
});

it('returns only owned active unexpired resolved coupon grants in the shared Coupon shape', async () => {
  const { app, ctx, get } = setup();
  ctx.couponTemplates.push({ id: 'fixed', name: 'Fixed', type: 'FIXED', value: 3, minSpend: 0 });
  ctx.couponGrants.push(...[
    { id: 'used', status: 'USED' }, { id: 'expired', expiresAt: Date.now() - 1 }, { id: 'invalid-expiry', expiresAt: Infinity },
    { id: 'boundary', expiresAt: Date.now() }, { id: 'foreign', userId: 'other' }, { id: 'missing', templateId: 'absent' },
    { id: 'fixed-grant', templateId: 'fixed' },
  ].map(g => ({ ...ctx.couponGrants[0], ...g })));
  expect((await request(app).get('/api/coupons/me')).status).toBe(401);
  const coupons = await get('/api/coupons/me'); expect(coupons.status).toBe(200);
  expect(coupons.body).toEqual([
    { id: 'grant', name: 'Welcome', discount: 10, type: 'PERCENTAGE', minSpend: 5 },
    { id: 'fixed-grant', name: 'Fixed', discount: 3, type: 'FIXED', minSpend: 0 },
  ]);
});
