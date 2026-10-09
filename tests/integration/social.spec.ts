import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { registerSocialRoutes } from '../../backend/routes/social';
import { registerSocialContentRoutes } from '../../backend/routes/socialContent';
import { weeklyActivity } from '../../backend/player-center/events';

function setup() {
  const ctx: any = { socialMessages: [], socialPosts: [], socialComments: [], levelEvents: [], levelReviews: [], levelSettlements: [], requireAdmin: () => (_req: any, res: any) => res.sendStatus(403),
    users: ['u', 'p', 'outsider'].map(id => ({ id, username: id })),
    companions: [{ id: 'cp', userId: 'p', status: 'APPROVED' }],
    persistState: vi.fn(), getBanError: (u: any, module: string) => u?.banModules?.[module] ? 'BANNED' : null,
    authMiddleware: (req: any, res: any, next: any) => { const id = req.headers.authorization; if (!['u', 'p', 'outsider'].includes(id)) return res.sendStatus(401); req.authUserId = id; next(); },
    sendError: (res: any, status: number, code: string) => res.status(status).json({ error: code }) };
  const app = express(); app.use(express.json()); registerSocialRoutes(app, ctx); registerSocialContentRoutes(app, ctx);
  const send = (from: string, to: string, key: string, content = key) => request(app).post('/api/social/messages').set('Authorization', from).send({ recipientId: to, requestId: key, content });
  return { app, ctx, send };
}
it('requires auth, isolates history and marks only received messages as read', async () => {
  const { app, send } = setup();
  expect((await request(app).get('/api/social/conversations')).status).toBe(401);
  await send('u', 'p', 'first');
  expect((await request(app).get('/api/social/messages/u').set('Authorization', 'outsider')).body.items).toEqual([]);
  expect((await request(app).get('/api/social/conversations').set('Authorization', 'p')).body.items[0].unreadCount).toBe(1);
  await request(app).post('/api/social/messages/u/read').set('Authorization', 'p').send({ ids: ['nonexistent'] });
  const history = await request(app).get('/api/social/messages/u').set('Authorization', 'p');
  await request(app).post('/api/social/messages/u/read').set('Authorization', 'p').send({ ids: history.body.items.map((m: any) => m.id) });
  expect((await request(app).get('/api/social/conversations').set('Authorization', 'p')).body.items[0].unreadCount).toBe(0);
});
it('groups consecutive incoming messages until reply, with timing from the first message', async () => {
  const { ctx, send } = setup(); const start = Date.now(); const clock = vi.spyOn(Date, 'now').mockReturnValue(start);
  try {
    await send('u', 'p', 'one'); clock.mockReturnValue(start + 240000); await send('u', 'p', 'two');
    expect(ctx.levelEvents.filter((e: any) => e.kind === 'REPLY_OPPORTUNITY')).toHaveLength(1);
    clock.mockReturnValue(start + 300001); await send('p', 'u', 'late');
    expect(weeklyActivity(ctx.levelEvents, 'p', start, start + 900000, 'Asia/Riyadh').replyRate).toBe(0);
    await send('u', 'p', 'three'); await send('p', 'u', 'ontime');
    expect(weeklyActivity(ctx.levelEvents, 'p', start, start + 900000, 'Asia/Riyadh').replyRate).toBe(.5);
  } finally { clock.mockRestore(); }
});
it('deduplicates retries and rejects changed payload, self messages and bans', async () => {
  const { send, ctx } = setup();
  expect((await send('u', 'p', 'key')).status).toBe(201);
  expect((await send('u', 'p', 'key')).status).toBe(200);
  expect((await send('u', 'p', 'key', 'different')).status).toBe(409);
  expect((await send('u', 'u', 'self')).status).toBe(400);
  ctx.users[0].banModules = { PRIVATE_CHAT: true };
  expect((await send('u', 'p', 'blocked')).status).toBe(403);
  expect(ctx.socialMessages).toHaveLength(1);
});
it('persists pending posts without exposing or awarding them before moderation', async () => {
  const { app, ctx } = setup();
  const publish = (key: string) => request(app).post('/api/social/posts').set('Authorization', 'p').send({ content: 'Looking for a duo!', requestId: key });
  expect((await publish('a')).status).toBe(201); expect((await publish('a')).status).toBe(200); await publish('b');
  expect((await request(app).get('/api/social/posts')).body.items).toHaveLength(0);
  const now = Date.now(); expect(weeklyActivity(ctx.levelEvents, 'p', now - 86400000, now + 1, 'Asia/Riyadh').post).toBe(0);
  expect(ctx.socialPosts).toHaveLength(2);
});
it('rolls back messages and task events if persistence fails', async () => {
  const { send, ctx } = setup(); ctx.persistState.mockImplementation(() => { throw new Error('disk failure'); });
  expect((await send('u', 'p', 'failed')).status).toBe(503);
  expect(ctx.socialMessages).toHaveLength(0); expect(ctx.levelEvents).toHaveLength(0);
});
