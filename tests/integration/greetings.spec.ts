import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { registerSocialRoutes } from '../../backend/routes/social';
import { weeklyActivity } from '../../backend/player-center/events';
import { periodRange } from '../../backend/player-center/analytics';

function setup() {
  const ctx: any = {
    users: ['p', 'q', 'u', 'v', 'admin'].map(id => ({ id, username: id, role: id === 'admin' ? 'ADMIN' : id === 'p' || id === 'q' ? 'PLAYER' : 'USER', accountStatus: 'ACTIVE', email: `${id}@private.test` })),
    companions: [{ id: 'cp', userId: 'p', status: 'APPROVED' }, { id: 'cq', userId: 'q', status: 'APPROVED' }],
    orders: [], socialMessages: [], levelEvents: [], persistState: vi.fn(),
    getBanError: (user: any) => user?.accountStatus !== 'ACTIVE' || user?.banModules?.PRIVATE_CHAT ? 'BANNED' : null,
    authMiddleware: (req: any, res: any, next: any) => { if (!ctx.users.some((u: any) => u.id === req.headers.authorization)) return res.sendStatus(401); req.authUserId = req.headers.authorization; next(); },
    sendError: (res: any, status: number, code: string) => res.status(status).json({ error: code }),
  };
  const app = express(); app.use(express.json()); registerSocialRoutes(app, ctx);
  const send = (from: string, to: string, key: string, greeting = false) => request(app).post(greeting ? '/api/social/greetings' : '/api/social/messages').set('Authorization', from).send({ recipientId: to, requestId: key, content: 'Hi!', timestamp: 0, points: 999 });
  const candidates = (from = 'p') => request(app).get('/api/social/greetings/candidates').set('Authorization', from);
  return { app, ctx, send, candidates };
}

it('awards only a reply to an explicit greeting and deduplicates the pair for life', async () => {
  const { ctx, send } = setup();
  await send('p', 'v', 'ordinary'); await send('v', 'p', 'ordinary-reply');
  expect(ctx.levelEvents.filter((e: any) => e.kind === 'GREETING_REPLY')).toHaveLength(0);
  expect((await send('p', 'u', 'greet', true)).status).toBe(201);
  expect(ctx.levelEvents.filter((e: any) => e.kind === 'GREETING_REPLY')).toHaveLength(0);
  expect((await send('p', 'u', 'greet', true)).status).toBe(200);
  await send('u', 'p', 'reply'); await send('u', 'p', 'reply-again');
  const rewards = ctx.levelEvents.filter((e: any) => e.kind === 'GREETING_REPLY');
  expect(rewards).toHaveLength(1); expect(rewards[0].userId).toBe('p'); expect(rewards[0].referenceId).toBe('u');
  expect((await send('p', 'u', 'second-greeting', true)).status).toBe(409);
  expect((await send('q', 'u', 'other-player', true)).status).toBe(201);
  await send('u', 'q', 'reply-other-player');
  expect(ctx.levelEvents.filter((e: any) => e.kind === 'GREETING_REPLY')).toHaveLength(2);
});

it('uses the server reply time for the week and includes exactly 24 hours but not later', async () => {
  const { ctx, send } = setup();
  const monday = Date.parse('2026-10-11T21:00:00Z');
  const clock = vi.spyOn(Date, 'now').mockReturnValue(monday - 1000);
  try {
    await send('p', 'u', 'week-end', true);
    clock.mockReturnValue(monday + 1000); await send('u', 'p', 'next-week');
    const week = periodRange('WEEK', monday, 'Asia/Riyadh');
    expect(weeklyActivity(ctx.levelEvents, 'p', week.start, week.end, 'Asia/Riyadh').greet).toBe(5);
    expect(weeklyActivity(ctx.levelEvents, 'p', week.start - 7 * 86400000, week.start, 'Asia/Riyadh').greet).toBe(0);
    await send('p', 'v', 'boundary', true); clock.mockReturnValue(monday + 1000 + 86400000);
    await send('v', 'p', 'exact');
    expect(ctx.levelEvents.filter((e: any) => e.kind === 'GREETING_REPLY')).toHaveLength(2);
    await send('q', 'v', 'late-greet', true); clock.mockReturnValue(monday + 1000 + 2 * 86400000 + 1); await send('v', 'q', 'late');
    expect(ctx.levelEvents.filter((e: any) => e.kind === 'GREETING_REPLY' && e.userId === 'q')).toHaveLength(0);
    expect((await send('q', 'v', 'try-again', true)).status).toBe(201);
  } finally { clock.mockRestore(); }
});

it('enforces new-customer eligibility, player permissions, pending windows and public candidate fields', async () => {
  const { app, ctx, send, candidates } = setup();
  expect((await request(app).get('/api/social/greetings/candidates')).status).toBe(401);
  expect((await candidates('u')).status).toBe(403);
  expect((await send('u', 'p', 'not-player', true)).status).toBe(403);
  ctx.orders.push({ id: 'old', userId: 'u', companionId: 'cp', status: 'COMPLETED' });
  expect((await send('p', 'u', 'old-customer', true)).status).toBe(409);
  const list = await candidates();
  expect(list.status).toBe(200); expect(JSON.stringify(list.body)).not.toContain('@private.test');
  expect(list.body.items.some((i: any) => i.participant.userId === 'u' || i.participant.userId === 'p' || i.participant.userId === 'admin')).toBe(false);
  ctx.orders.push({ id: 'cancelled', userId: 'v', companionId: 'cp', status: 'CANCELLED' });
  expect((await send('p', 'v', 'new-user', true)).status).toBe(201);
  const pending = (await candidates()).body.items.find((i: any) => i.participant.userId === 'v');
  expect(pending.status).toBe('PENDING');
  expect((await send('p', 'v', 'do-not-extend', true)).status).toBe(409);
  expect((await send('p', 'v', 'new-user')).status).toBe(409);
  ctx.users.find((u: any) => u.id === 'q').banModules = { PRIVATE_CHAT: true };
  expect((await send('p', 'q', 'banned', true)).status).toBe(403);
});

it('freezes eligibility at greeting time and restores the greeting reward when saving a reply fails', async () => {
  const { ctx, send } = setup();
  ctx.persistState.mockImplementationOnce(() => { throw new Error('disk'); });
  expect((await send('p', 'u', 'failed-greet', true)).status).toBe(503);
  expect(ctx.socialMessages).toHaveLength(0); expect(ctx.levelEvents).toHaveLength(0);
  await send('p', 'u', 'greet', true);
  ctx.orders.push({ id: 'first-completed', userId: 'u', companionId: 'cp', status: 'COMPLETED' });
  const previousEvents = ctx.levelEvents.length;
  ctx.persistState.mockImplementationOnce(() => { throw new Error('disk'); });
  expect((await send('u', 'p', 'reply')).status).toBe(503);
  expect(ctx.socialMessages).toHaveLength(1); expect(ctx.levelEvents).toHaveLength(previousEvents);
  expect((await send('u', 'p', 'reply')).status).toBe(201);
  expect(ctx.levelEvents.filter((e: any) => e.kind === 'GREETING_REPLY')).toHaveLength(1);
});

it('caps greeting points at 50 per week', async () => {
  const { ctx, send } = setup();
  for (let i = 0; i < 11; i++) {
    const id = `new${i}`; ctx.users.push({ id, role: 'USER', accountStatus: 'ACTIVE' });
    await send('p', id, `g${i}`, true); await send(id, 'p', `r${i}`);
  }
  const now = Date.now(), week = periodRange('WEEK', now, 'Asia/Riyadh');
  expect(weeklyActivity(ctx.levelEvents, 'p', week.start, week.end, 'Asia/Riyadh').greetings).toBe(11);
  expect(weeklyActivity(ctx.levelEvents, 'p', week.start, week.end, 'Asia/Riyadh').greet).toBe(50);
});

it('paginates candidates without leaking private fields or losing the next eligible user', async () => {
  const { app, ctx, candidates } = setup();
  for (let i = 0; i < 25; i++) ctx.users.push({ id: `z${String(i).padStart(2, '0')}`, username: `Customer ${i}`, role: 'USER', accountStatus: 'ACTIVE', passwordHash: 'private-hash', phone: 'private-phone' });
  const first = await candidates();
  expect(first.body.items).toHaveLength(20); expect(first.body.nextAfter).toBeTruthy();
  const second = await request(app).get(`/api/social/greetings/candidates?after=${first.body.nextAfter}`).set('Authorization', 'p');
  expect(second.status).toBe(200); expect(second.body.nextAfter).toBeNull();
  const ids = [...first.body.items, ...second.body.items].map((i: any) => i.participant.userId);
  expect(ids).toHaveLength(28); expect(new Set(ids).size).toBe(28);
  expect(JSON.stringify([first.body, second.body])).not.toMatch(/private-hash|private-phone/);
  expect((await request(app).get('/api/social/greetings/candidates?after=missing').set('Authorization', 'p')).status).toBe(400);
});
