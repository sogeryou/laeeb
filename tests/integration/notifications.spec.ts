import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { defaultState } from '../../backend/state/jsonState';
import { registerBusinessRoutes } from '../../backend/routes/business';
import { registerCompanionReviewRoutes } from '../../backend/companions/applications';
import { initialLevel } from '../../backend/player-center/officialLevel';
import { registerNotificationRoutes } from '../../backend/notifications/routes';

function row(id: string, userId = 'buyer', createdAt = 1000, readAt?: number) {
  return { id, userId, kind: 'ORDER_CREATED', target: { type: 'ORDER', id: 'real-order' }, createdAt, eventKey: `private:${id}`, ...(readAt !== undefined ? { readAt } : {}) };
}
function setup(saved?: any) {
  const state: any = saved || { ...defaultState(), notifications: [],
    users: ['buyer', 'provider', 'other', 'admin'].map(id => ({ id, username: id, role: id === 'admin' ? 'ADMIN' : 'USER', accountStatus: 'ACTIVE' })),
    companions: [{ id: 'cp', userId: 'provider', gameName: 'Game', intro: 'Duo', hourlyRate: 8, status: 'APPROVED', availability: 'ONLINE', ranking: initialLevel(), services: [{ id: 'match', name: 'Ranked match', unitPrice: 5, unit: 'match' }] }],
    wallets: { buyer: { userId: 'buyer', balance: 100, lastUpdated: 1 } },
  };
  let persisted: any;
  const ctx: any = Object.assign(state, {
    persistState: vi.fn(() => { persisted = structuredClone(Object.fromEntries(Object.entries(state).filter(([, value]) => typeof value !== 'function'))); }),
    getUserById: (id: string) => state.users.find((u: any) => u.id === id),
    getBanError: () => null,
    createRiskEvent: (type: string, relatedEntityId: string) => state.riskEvents.push({ id: 'risk', type, relatedEntityId }),
    appendAuditLog: (actorUserId: string, action: string, targetType: string, targetId: string) => state.auditLogs.unshift({ id: `audit-${state.auditLogs.length}`, actorUserId, action, targetType, targetId }),
    authMiddleware: (req: any, res: any, next: any) => { const user = state.users.find((u: any) => u.id === req.headers.authorization); if (!user) return res.sendStatus(401); req.authUserId = user.id; req.authUser = user; next(); },
    requireAdmin: () => (req: any, res: any, next: any) => req.authUser.role === 'ADMIN' ? next() : res.sendStatus(403),
    sendError: (res: any, status: number, code: string) => res.status(status).json({ error: { code } }),
  });
  const app = express(); app.use(express.json()); registerBusinessRoutes(app, ctx); registerCompanionReviewRoutes(app, ctx); registerNotificationRoutes(app, ctx);
  const get = (query = '', actor = 'buyer') => request(app).get(`/api/notifications${query}`).set('Authorization', actor);
  const post = (path: string, body: any = {}, actor = 'buyer') => request(app).post(path).set('Authorization', actor).send(body);
  const create = (body: any = {}) => post('/api/orders', { companionId: 'cp', serviceId: 'match', quantity: 1, requestId: 'new-order', ...body });
  return { app, ctx, get, post, create, saved: () => persisted };
}

it('authenticates all notification endpoints and returns a no-store owner-scoped empty page', async () => {
  const s = setup();
  expect((await request(s.app).get('/api/notifications')).status).toBe(401);
  expect((await request(s.app).post('/api/notifications/read-all').send({})).status).toBe(401);
  expect((await request(s.app).post('/api/notifications/missing/read').send({})).status).toBe(401);
  const response = await s.get();
  expect(response.status).toBe(200); expect(response.headers['cache-control']).toBe('no-store');
  expect(response.body).toEqual({ ownerId: 'buyer', items: [], nextCursor: null, unreadCount: 0 });
});

it('sorts stable pages by descending timestamp/id, excludes eventKey, and counts all owner unread rows', async () => {
  const s = setup(); s.ctx.notifications.push(row('a', 'buyer', 1000), row('c', 'buyer', 2000, 1), row('b', 'buyer', 2000), row('foreign', 'other', 3000));
  const first = await s.get('?limit=2');
  expect(first.status).toBe(200); expect(first.body.items.map((n: any) => n.id)).toEqual(['c', 'b']);
  expect(first.body).toMatchObject({ ownerId: 'buyer', nextCursor: 'b', unreadCount: 2 });
  expect(first.body.items[0]).not.toHaveProperty('eventKey');
  const second = await s.get('?limit=2&cursor=b');
  expect(second.body.items.map((n: any) => n.id)).toEqual(['a']); expect(second.body.nextCursor).toBeNull(); expect(second.body.unreadCount).toBe(2);
  expect((await s.get('', 'provider')).body.items).toEqual([]);
  expect((await s.get('?cursor=a')).body.items).toEqual([]);
});

it('defaults to 20 rows and permits at most 50', async () => {
  const s = setup(); for (let i = 0; i < 55; i++) s.ctx.notifications.push(row(`n${i}`, 'buyer', i));
  expect((await s.get()).body.items).toHaveLength(20);
  expect((await s.get('?limit=50')).body.items).toHaveLength(50);
});

it.each(['0', '-1', '51', '1.5', 'abc', '', 'Infinity', '1e1', '2&limit=3'])('rejects invalid notification limit %s', async limit => {
  const response = await setup().get(`?limit=${limit}`);
  expect(response.status).toBe(400); expect(response.body.error.code).toBe('INPUT_INVALID');
});

it('does not reveal whether a cursor belongs to another owner', async () => {
  const s = setup(); s.ctx.notifications.push(row('foreign', 'other'));
  const foreign = await s.get('?cursor=foreign'), missing = await s.get('?cursor=missing');
  expect(foreign.status).toBe(400); expect(missing.status).toBe(400); expect(foreign.body).toEqual(missing.body);
  expect(foreign.body.error.code).toBe('NOTIFICATION_CURSOR_INVALID');
});

it('fails closed for foreign/missing reads and content/owner injection without persisting', async () => {
  const s = setup(); s.ctx.notifications.push(row('foreign', 'other'));
  const foreign = await s.post('/api/notifications/foreign/read'), missing = await s.post('/api/notifications/missing/read');
  expect(foreign.status).toBe(404); expect(missing.status).toBe(404); expect(foreign.body).toEqual(missing.body);
  expect(foreign.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
  for (const body of [{ ownerId: 'other' }, { userId: 'other' }, { eventKey: 'fake' }, { target: { type: 'ORDER', id: 'fake' } }, { kind: 'ORDER_CREATED' }, { readAt: 1 }, []]) {
    for (const path of ['/api/notifications/foreign/read', '/api/notifications/read-all']) {
      const response = await s.post(path, body); expect(response.status).toBe(400); expect(response.body.error.code).toBe('INPUT_INVALID');
    }
  }
  expect(s.ctx.persistState).not.toHaveBeenCalled(); expect(s.ctx.notifications[0]).not.toHaveProperty('readAt');
});

it('acknowledges a persisted single read, replays without saving, and recovers on reload', async () => {
  const s = setup(); const entity = row('own'); s.ctx.notifications.push(entity, row('foreign', 'other'));
  const response = await s.post('/api/notifications/own/read');
  expect(response.status).toBe(200); expect(response.headers['cache-control']).toBe('no-store');
  expect(response.body).toMatchObject({ ownerId: 'buyer', notification: { id: 'own', readAt: expect.any(Number) }, unreadCount: 0 });
  expect(response.body.notification).not.toHaveProperty('eventKey'); expect(s.ctx.notifications[0]).toBe(entity);
  expect((await s.post('/api/notifications/own/read')).body).toEqual(response.body); expect(s.ctx.persistState).toHaveBeenCalledTimes(1);
  expect((await setup(s.saved()).get()).body.items[0]).toEqual(response.body.notification);
});

it('marks only the current owner unread rows and returns the exact read-all DTO with idempotent no-op saves', async () => {
  const s = setup(); s.ctx.notifications.push(row('a'), row('b'), row('read', 'buyer', 1000, 123), row('foreign', 'other'));
  const response = await s.post('/api/notifications/read-all');
  expect(response.status).toBe(200); expect(response.headers['cache-control']).toBe('no-store');
  expect(response.body).toEqual({ ownerId: 'buyer', updatedIds: ['a', 'b'], readAt: expect.any(Number), unreadCount: 0 });
  expect(s.ctx.notifications.slice(0, 2).map((n: any) => n.readAt)).toEqual([response.body.readAt, response.body.readAt]);
  expect(s.ctx.notifications[2].readAt).toBe(123); expect(s.ctx.notifications[3]).not.toHaveProperty('readAt');
  const noOp = await s.post('/api/notifications/read-all'); expect(noOp.body).toEqual({ ownerId: 'buyer', updatedIds: [], readAt: expect.any(Number), unreadCount: 0 });
  expect(s.ctx.persistState).toHaveBeenCalledTimes(1); expect(s.ctx.notifications).toHaveLength(4);
});

it('does not persist empty-owner read-all or overwrite an acknowledged zero timestamp', async () => {
  const s = setup(); s.ctx.notifications.push(row('read', 'buyer', 1000, 0), row('foreign', 'other'));
  const single = await s.post('/api/notifications/read/read');
  expect(single.body).toMatchObject({ ownerId: 'buyer', notification: { id: 'read', readAt: 0 }, unreadCount: 0 });
  const empty = await s.post('/api/notifications/read-all', {}, 'provider');
  expect(empty.body).toEqual({ ownerId: 'provider', updatedIds: [], readAt: expect.any(Number), unreadCount: 0 });
  expect(s.ctx.persistState).not.toHaveBeenCalled(); expect(s.ctx.notifications[1]).not.toHaveProperty('readAt');
});

it('uses owner cursor positions after newer inserts without duplicating a previous page', async () => {
  const s = setup(); s.ctx.notifications.push(row('old', 'buyer', 1), row('middle', 'buyer', 2), row('new', 'buyer', 3));
  const first = await s.get('?limit=2'); expect(first.body.nextCursor).toBe('middle');
  s.ctx.notifications.push(row('newest', 'buyer', 4));
  const next = await s.get(`?limit=2&cursor=${first.body.nextCursor}`);
  expect(next.body.items.map((n: any) => n.id)).toEqual(['old']); expect(next.body.nextCursor).toBeNull(); expect(next.body.unreadCount).toBe(4);
});

it.each(['/api/notifications/a/read', '/api/notifications/read-all'])('restores read fields and row/array identity after failed saving at %s', async path => {
  const s = setup(); s.ctx.notifications.push(row('a'), row('b'), row('read', 'buyer', 1000, 123));
  const collection = s.ctx.notifications, entities = collection.slice(), before = structuredClone(collection);
  s.ctx.persistState.mockImplementationOnce(() => { throw Error('disk'); });
  const response = await s.post(path); expect(response.status).toBe(503); expect(response.body.error.code).toBe('NOTIFICATION_SAVE_FAILED');
  expect(s.ctx.notifications).toBe(collection); expect(collection).toEqual(before); entities.forEach((entity: any, i: number) => expect(collection[i]).toBe(entity));
  expect((await s.get()).body.unreadCount).toBe(2); expect((await s.post(path)).status).toBe(200);
});

const application = { gameName: 'Game', intro: 'Duo sessions', hourlyRate: 8, requestId: 'review-cycle-1', details: { serviceName: 'Ranked duo' } };

it('emits private review results in the role/audit save and emits new results after resubmission', async () => {
  const s = setup(); const applied = await s.post('/api/companions/apply', application);
  expect(applied.status).toBe(201); const id = applied.body.id;
  expect(s.ctx.notifications).toEqual([]);
  const review = (body: any) => s.post(`/api/admin/companions/${id}/review`, body, 'admin');
  const first = await review({ action: 'REJECT', reason: 'Private reason' });
  expect(first.status).toBe(200);
  expect(s.ctx.notifications).toHaveLength(1);
  expect(s.ctx.notifications[0]).toMatchObject({ userId: 'buyer', kind: 'COMPANION_REJECTED', target: { type: 'APPLICATION', id }, createdAt: first.body.updatedAt });
  const key = s.ctx.notifications[0].eventKey, saves = s.ctx.persistState.mock.calls.length;
  await review({ action: 'REJECT', reason: 'Private reason' });
  expect(s.ctx.persistState).toHaveBeenCalledTimes(saves); expect(s.ctx.notifications).toHaveLength(1);
  const second = await s.post('/api/companions/apply', { ...application, requestId: 'review-cycle-2' });
  expect(second.status).toBe(201); await review({ action: 'REJECT', reason: 'Still private' });
  expect(s.ctx.notifications).toHaveLength(2); expect(s.ctx.notifications[1].eventKey).not.toBe(key);
  await s.post('/api/companions/apply', { ...application, requestId: 'review-cycle-3' });
  await review({ action: 'APPROVE' });
  expect(s.ctx.users[0].role).toBe('PLAYER'); expect(s.ctx.auditLogs).toHaveLength(3);
  expect(s.ctx.notifications[2].kind).toBe('COMPANION_APPROVED');
  const json = JSON.stringify((await s.get()).body);
  for (const privateField of ['eventKey', 'Private reason', 'Still private', 'review-cycle', 'requestFingerprint', 'admin']) expect(json).not.toContain(privateField);
  expect((await s.get('', 'other')).body.items).toEqual([]);
  expect((await setup(s.saved()).get()).body.items).toHaveLength(3);
});

it('does not notify failed, stale, unauthorized or conflicting companion reviews', async () => {
  const s = setup(); const applied = await s.post('/api/companions/apply', application); const id = applied.body.id;
  const entity = s.ctx.companions.find((c: any) => c.id === id), before = structuredClone(entity), notifications = s.ctx.notifications, audit = s.ctx.auditLogs;
  expect((await s.post(`/api/admin/companions/${id}/review`, { action: 'APPROVE' }, 'other')).status).toBe(403);
  expect((await s.post(`/api/admin/companions/${id}/review`, { action: 'APPROVE', expectedUpdatedAt: 0 }, 'admin')).status).toBe(409);
  s.ctx.persistState.mockImplementationOnce(() => { expect(s.ctx.notifications).toHaveLength(1); expect(s.ctx.users[0].role).toBe('PLAYER'); expect(s.ctx.auditLogs).toHaveLength(1); throw Error('disk'); });
  const failed = await s.post(`/api/admin/companions/${id}/review`, { action: 'APPROVE' }, 'admin');
  expect(failed.status).toBe(503); expect(failed.body.error.code).toBe('COMPANION_SAVE_FAILED');
  expect(s.ctx.notifications).toBe(notifications); expect(notifications).toEqual([]); expect(s.ctx.auditLogs).toBe(audit); expect(audit).toEqual([]);
  expect(s.ctx.companions.find((c: any) => c.id === id)).toBe(entity); expect(entity).toEqual(before); expect(s.ctx.users[0].role).toBe('USER');
  expect((await s.post(`/api/admin/companions/${id}/review`, { action: 'APPROVE' }, 'admin')).status).toBe(200);
  expect((await s.post(`/api/admin/companions/${id}/review`, { action: 'REJECT', reason: 'Conflict' }, 'admin')).status).toBe(409);
  expect(s.ctx.notifications).toHaveLength(1);
});

it('rolls back a prepared review notification if audit preparation throws', async () => {
  const s = setup(); const applied = await s.post('/api/companions/apply', application); const id = applied.body.id;
  s.ctx.appendAuditLog = () => { s.ctx.auditLogs.push({ id: 'partial' }); throw Error('audit'); };
  const response = await s.post(`/api/admin/companions/${id}/review`, { action: 'APPROVE' }, 'admin');
  expect(response.status).toBe(503); expect(s.ctx.notifications).toEqual([]); expect(s.ctx.auditLogs).toEqual([]);
  expect(s.ctx.users[0].role).toBe('USER'); expect(s.ctx.companions.find((c: any) => c.id === id).status).toBe('PENDING');
});

it('persists real funded participant events and excludes quotes, replays, unauthorized writes and legacy records', async () => {
  const s = setup();
  s.ctx.orders.push({ id: 'legacy', userId: 'buyer', companionId: 'cp', status: 'CREATED', serviceName: 'Historical', totalPrice: 8, createdAt: 1 });
  expect((await s.post('/api/orders/quote', { companionId: 'cp', quantity: 1 })).status).toBe(200); expect(s.ctx.notifications).toEqual([]);
  const created = await s.create(); expect(created.status).toBe(201); const id = created.body.id;
  expect(s.ctx.notifications).toHaveLength(2); expect((await s.get('', 'provider')).body.items[0]).toMatchObject({ userId: 'provider', kind: 'ORDER_CREATED', target: { type: 'ORDER', id }, serviceName: 'Ranked match' });
  expect((await s.create()).status).toBe(200); expect(s.ctx.notifications).toHaveLength(2);
  expect((await s.post(`/api/orders/${id}/accept`, {}, 'other')).status).toBe(403);
  expect((await s.post('/api/orders/legacy/accept', {}, 'provider')).status).toBe(409); expect(s.ctx.notifications).toHaveLength(2);
  await s.post(`/api/orders/${id}/accept`, {}, 'provider');
  await s.post(`/api/orders/${id}/complete`, { evidence: ['secret-proof'] }, 'provider');
  await s.post(`/api/orders/${id}/confirm`); await s.post(`/api/orders/${id}/confirm`);
  expect(s.ctx.notifications).toHaveLength(8);
  expect((await s.get()).body.items.map((n: any) => n.kind).sort()).toEqual(['ORDER_ACCEPTED', 'ORDER_AWAITING_CONFIRMATION', 'ORDER_COMPLETED', 'ORDER_CREATED']);
  expect((await s.get('', 'other')).body.items).toEqual([]);
  expect(JSON.stringify((await s.get()).body)).not.toContain('secret-proof');
  expect((await setup(s.saved()).get()).body.items).toHaveLength(4);
});

it('rolls failed funded creation and transitions back with notification identities retained', async () => {
  const s = setup(); const rows = s.ctx.notifications;
  s.ctx.persistState.mockImplementationOnce(() => { expect(rows).toHaveLength(2); throw Error('disk'); });
  expect((await s.create()).status).toBe(503); expect(s.ctx.orders).toEqual([]); expect(rows).toEqual([]); expect(s.ctx.wallets.buyer.balance).toBe(100);
  const id = (await s.create()).body.id, entity = rows[0], before = structuredClone(rows);
  s.ctx.persistState.mockImplementationOnce(() => { expect(rows).toHaveLength(4); throw Error('disk'); });
  expect((await s.post(`/api/orders/${id}/accept`, {}, 'provider')).status).toBe(503);
  expect(s.ctx.notifications).toBe(rows); expect(rows[0]).toBe(entity); expect(rows).toEqual(before); expect(s.ctx.orders[0].status).toBe('CREATED');
  expect(s.ctx.levelEvents.filter((event: any) => event.kind === 'ACCEPT')).toEqual([]);
});
