import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { registerCompanionApplicationRoutes, registerCompanionReviewRoutes } from '../../backend/companions/applications';
import { quoteOrder } from '../../backend/orders/pricing';
import { registerBusinessRoutes } from '../../backend/routes/business';

function setup() {
  const state: any = {
    users: [
      { id: 'owner', role: 'USER', accountStatus: 'ACTIVE' },
      { id: 'admin', role: 'ADMIN', permissions: ['COMPANION_REVIEW'], accountStatus: 'ACTIVE' },
      { id: 'other', role: 'USER', accountStatus: 'ACTIVE' },
    ],
    companions: [], auditLogs: [], orders: [],
  };
  const ctx: any = {
    ...state,
    persistState: vi.fn(),
    authMiddleware: (req: any, res: any, next: any) => { const user = state.users.find((u: any) => u.id === req.headers.authorization); if (!user) return res.sendStatus(401); req.authUserId = user.id; req.authUser = user; next(); },
    requireAdmin: (permission: string) => (req: any, res: any, next: any) => req.authUser?.role === 'ADMIN' && req.authUser.permissions?.includes(permission) ? next() : res.sendStatus(403),
    sendError: (res: any, status: number, code: string) => res.status(status).json({ error: { code } }),
    getBanError: (user: any) => user?.banModules?.ORDER ? 'BANNED' : null,
    appendAuditLog: vi.fn((actor: string, action: string, type: string, id: string) => state.auditLogs.unshift({ actor, action, type, id })),
  };
  const app = express(); app.use(express.json()); registerCompanionApplicationRoutes(app, ctx); registerCompanionReviewRoutes(app, ctx);
  const apply = (body: any, actor = 'owner') => request(app).post('/api/companions/apply').set('Authorization', actor).send(body);
  const get = (actor = 'owner') => request(app).get('/api/companions/me/application').set('Authorization', actor);
  const review = (id: string, body: any, actor = 'admin') => request(app).post(`/api/admin/companions/${id}/review`).set('Authorization', actor).send(body);
  return { state, ctx, app, apply, get, review };
}

const input = { gameName: 'PUBG Mobile', intro: 'Duo sessions', hourlyRate: 8, requestId: 'attempt1', details: { gameId: 'pubg', serviceName: 'Ranked duo', unit: 'match' } };

it('creates a private pending application with configured service and no role elevation', async () => {
  const s = setup();
  expect((await s.get()).body).toEqual({ application: null });
  const response = await s.apply(input);
  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({ userId: 'owner', status: 'PENDING', details: input.details });
  expect(s.state.companions[0]).toMatchObject({ status: 'PENDING', availability: 'OFFLINE', services: [{ name: 'Ranked duo', unit: 'match', unitPrice: 8 }] });
  expect(s.state.users[0].role).toBe('USER');
  expect((await s.get()).body).toEqual({ application: response.body });
  expect((await s.get('other')).body).toEqual({ application: null });
  expect(response.body).not.toHaveProperty('requestId');
});

it('replays the same key and payload without writing, but rejects conflicts and injections', async () => {
  const s = setup(); const first = await s.apply(input);
  const count = s.ctx.persistState.mock.calls.length;
  expect((await s.apply(input)).body).toEqual(first.body);
  expect(s.ctx.persistState).toHaveBeenCalledTimes(count);
  for (const body of [{ ...input, requestId: 'another' }, { ...input, intro: 'Changed' }]) expect((await s.apply(body)).status).toBe(409);
  for (const body of [{ ...input, role: 'PLAYER' }, { ...input, details: { ...input.details, screenshot: 'fake' } }, { ...input, hourlyRate: 8.555 }]) expect((await s.apply(body)).status).toBe(400);
  expect(s.state.companions).toHaveLength(1);
});

it('rejects restricted applicants and keeps old approved minimal-body reapplication at 409', async () => {
  const s = setup();
  for (const status of ['FROZEN', 'RISK_HOLD']) { s.state.users[0].accountStatus = status; expect((await s.apply(input)).status).toBe(403); }
  s.state.users[0].accountStatus = 'ACTIVE';
  expect((await s.apply(input, 'admin')).status).toBe(403);
  const first = await s.apply(input); const id = first.body.id;
  expect((await s.review(id, { action: 'APPROVE' })).status).toBe(200);
  const old = await s.apply({ gameName: 'Other', intro: 'Bypass', hourlyRate: 9 });
  expect(old.status).toBe(409); expect(old.body.error.code).toBe('COMPANION_ALREADY_EXISTS');
});

it('requires permission, reason and revision; locks terminal decisions without duplicate audit', async () => {
  const s = setup(); const first = await s.apply(input); const id = first.body.id;
  expect((await s.review(id, { action: 'REJECT' }, 'owner')).status).toBe(403);
  expect((await s.review(id, { action: 'REJECT' })).status).toBe(400);
  expect((await s.review(id, { action: 'APPROVE', expectedUpdatedAt: first.body.updatedAt - 1 })).status).toBe(409);
  const rejected = await s.review(id, { action: 'REJECT', reason: 'Needs more detail', expectedUpdatedAt: first.body.updatedAt });
  expect(rejected.status).toBe(200);
  expect(rejected.body).toMatchObject({ status: 'REJECTED', rejectionReason: 'Needs more detail' });
  expect(s.state.users[0].role).toBe('USER');
  expect(s.state.auditLogs).toHaveLength(1);
  expect((await s.review(id, { action: 'REJECT', reason: 'Needs more detail' })).status).toBe(200);
  expect((await s.review(id, { action: 'APPROVE' })).status).toBe(409);
  expect(s.state.auditLogs).toHaveLength(1);
  const resubmitted = await s.apply({ ...input, requestId: 'attempt2' });
  expect(resubmitted.body).toMatchObject({ id, status: 'PENDING' });
  expect(resubmitted.body).not.toHaveProperty('rejectionReason');
  const approved = await s.review(id, { action: 'APPROVE', expectedUpdatedAt: resubmitted.body.updatedAt });
  expect(approved.status).toBe(200);
  expect(approved.body.status).toBe('APPROVED');
  expect(s.state.users[0].role).toBe('PLAYER');
  expect(s.state.companions[0].availability).toBe('OFFLINE');
  expect(s.state.auditLogs).toHaveLength(2);
});

it('restores entity and collection references on failed application and review persistence', async () => {
  const s = setup(); const collection = s.state.companions;
  s.ctx.persistState.mockImplementationOnce(() => { throw Error('disk'); });
  expect((await s.apply(input)).status).toBe(503);
  expect(s.state.companions).toBe(collection); expect(collection).toHaveLength(0);
  const first = await s.apply(input); const entity = collection[0], before = structuredClone(entity), audit = s.state.auditLogs;
  s.ctx.persistState.mockImplementationOnce(() => { throw Error('disk'); });
  expect((await s.review(first.body.id, { action: 'APPROVE' })).status).toBe(503);
  expect(collection[0]).toBe(entity); expect(entity).toEqual(before);
  expect(s.state.users[0].role).toBe('USER'); expect(s.state.auditLogs).toBe(audit); expect(audit).toHaveLength(0);
});

it('does not quote a pending configured service and keeps legacy owner reads grounded in stored fields', async () => {
  const s = setup(); const applied = await s.apply(input);
  expect(() => quoteOrder(s.ctx, 'other', { companionId: applied.body.id, serviceId: `${applied.body.id}_configured`, quantity: 1 })).toThrow();
  const legacy = { id: 'legacy', userId: 'other', gameName: 'Valorant', intro: 'Coaching', hourlyRate: 10, status: 'APPROVED', availability: 'ONLINE', createdAt: 10, updatedAt: 20 };
  s.state.companions.push(legacy);
  expect((await s.get('other')).body.application).toEqual({ id: 'legacy', userId: 'other', status: 'APPROVED', gameName: 'Valorant', intro: 'Coaching', hourlyRate: 10, details: {}, submittedAt: 10, updatedAt: 20 });
});

it('requires a fresh request key after rejection and rolls failed resubmission back', async () => {
  const s = setup(); const first = await s.apply(input);
  await s.review(first.body.id, { action: 'REJECT', reason: 'More detail' });
  const entity = s.state.companions[0], before = structuredClone(entity), services = entity.services;
  expect((await s.apply(input)).status).toBe(409);
  expect((await s.apply({ ...input, requestId: undefined })).status).toBe(409);
  s.ctx.persistState.mockImplementationOnce(() => { throw Error('disk'); });
  expect((await s.apply({ ...input, requestId: 'attempt2' })).status).toBe(503);
  expect(s.state.companions[0]).toBe(entity); expect(entity).toEqual(before); expect(entity.services).toBe(services);
});

it('does not expose request fingerprints in ordinary companion responses', async () => {
  const s = setup();
  const app = express(); app.use(express.json()); registerBusinessRoutes(app, s.ctx);
  const applied = await request(app).post('/api/companions/apply').set('Authorization', 'owner').send(input);
  await s.review(applied.body.id, { action: 'APPROVE' });
  const availability = await request(app).patch(`/api/companions/${applied.body.id}/availability`).set('Authorization', 'owner').send({ availability: 'OFFLINE' });
  expect(availability.status).toBe(200);
  expect(availability.body).not.toHaveProperty('application');
  const publicList = await request(app).get('/api/companions');
  expect(publicList.body[0]).not.toHaveProperty('application');
});

it('corrects a legacy rejected PLAYER only when its resubmission is persisted', async () => {
  const s = setup();
  const user = s.state.users[0];
  user.role = 'PLAYER';
  const legacy = { id: 'legacy-rejected', userId: user.id, gameName: 'PUBG Mobile', intro: 'Old service', hourlyRate: 8, status: 'REJECTED', availability: 'OFFLINE', createdAt: 10, updatedAt: 20 };
  s.state.companions.push(legacy);
  const response = await s.apply(input);
  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({ id: legacy.id, status: 'PENDING' });
  expect(s.state.users[0]).toBe(user);
  expect(user.role).toBe('USER');
});

it('restores the legacy PLAYER role and rejected entity if resubmission cannot save', async () => {
  const s = setup();
  const user = s.state.users[0];
  user.role = 'PLAYER';
  const legacy = { id: 'legacy-rejected', userId: user.id, gameName: 'PUBG Mobile', intro: 'Old service', hourlyRate: 8, status: 'REJECTED', availability: 'OFFLINE', createdAt: 10, updatedAt: 20 };
  s.state.companions.push(legacy);
  const before = structuredClone(legacy);
  let roleAtSave = '';
  s.ctx.persistState.mockImplementationOnce(() => { roleAtSave = user.role; throw Error('disk'); });
  expect((await s.apply(input)).status).toBe(503);
  expect(roleAtSave).toBe('USER');
  expect(s.state.users[0]).toBe(user);
  expect(user.role).toBe('PLAYER');
  expect(s.state.companions[0]).toBe(legacy);
  expect(legacy).toEqual(before);
});

it('keeps an orphaned legacy PLAYER unqualified on new submission and restores it on save failure', async () => {
  const s = setup();
  const user = s.state.users[0];
  user.role = 'PLAYER';
  let roleAtSave = '';
  s.ctx.persistState.mockImplementationOnce(() => { roleAtSave = user.role; throw Error('disk'); });
  expect((await s.apply(input)).status).toBe(503);
  expect(roleAtSave).toBe('USER');
  expect(user.role).toBe('PLAYER');
  expect(s.state.companions).toHaveLength(0);
  expect((await s.apply(input)).status).toBe(201);
  expect(user.role).toBe('USER');
  expect(s.state.companions[0].status).toBe('PENDING');
});

it('keeps pending and rejected applicants offline through the availability endpoint', async () => {
  const s = setup();
  const app = express(); app.use(express.json()); registerBusinessRoutes(app, s.ctx);
  const applied = await s.apply(input);
  const availability = (value: string) => request(app).patch(`/api/companions/${applied.body.id}/availability`).set('Authorization', 'owner').send({ availability: value });
  expect((await availability('ONLINE')).status).toBe(403);
  expect(s.state.companions[0].availability).toBe('OFFLINE');
  await s.review(applied.body.id, { action: 'REJECT', reason: 'Clarify your experience' });
  expect((await availability('ONLINE')).status).toBe(403);
  expect(s.state.companions[0].availability).toBe('OFFLINE');
  const resubmitted = await s.apply({ ...input, requestId: 'new-attempt' });
  await s.review(applied.body.id, { action: 'APPROVE', expectedUpdatedAt: resubmitted.body.updatedAt });
  expect((await availability('ONLINE')).status).toBe(200);
  expect(s.state.companions[0].availability).toBe('ONLINE');
  expect((await availability('INVALID')).status).toBe(400);
  expect(s.state.companions[0].availability).toBe('ONLINE');
});

it('removes newly added optional fields when a legacy review save fails', async () => {
  const s = setup();
  const legacy = { id: 'legacy', userId: 'owner', gameName: 'PUBG Mobile', intro: 'Stored introduction', hourlyRate: 8, status: 'PENDING', availability: 'OFFLINE', createdAt: 1, updatedAt: 2 };
  s.state.companions.push(legacy);
  const before = structuredClone(legacy);
  s.ctx.persistState.mockImplementationOnce(() => { throw new Error('disk unavailable'); });
  expect((await s.review(legacy.id, { action: 'APPROVE' })).status).toBe(503);
  expect(s.state.companions[0]).toBe(legacy);
  expect(legacy).toEqual(before);
  expect(legacy).not.toHaveProperty('application');
  expect(s.state.users[0].role).toBe('USER');
  expect(s.state.auditLogs).toEqual([]);
});

it('removes newly added services and application metadata on a failed legacy resubmission', async () => {
  const s = setup();
  const legacy = { id: 'legacy', userId: 'owner', gameName: 'PUBG Mobile', intro: 'Stored introduction', hourlyRate: 8, status: 'REJECTED', availability: 'OFFLINE', createdAt: 1, updatedAt: 2 };
  s.state.companions.push(legacy);
  const before = structuredClone(legacy);
  s.ctx.persistState.mockImplementationOnce(() => { throw new Error('disk unavailable'); });
  expect((await s.apply({ ...input, requestId: 'legacy-new-attempt' })).status).toBe(503);
  expect(s.state.companions[0]).toBe(legacy);
  expect(legacy).toEqual(before);
  expect(legacy).not.toHaveProperty('application');
  expect(legacy).not.toHaveProperty('services');
});
