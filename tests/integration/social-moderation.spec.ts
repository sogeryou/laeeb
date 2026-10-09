import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { registerSocialContentRoutes } from '../../backend/routes/socialContent';
import { weeklyActivity } from '../../backend/player-center/events';

const start = Date.parse('2026-09-27T21:00:00Z'), end = start + 7 * 86400000;
function setup() {
  const ctx: any = { socialPosts: [], socialComments: [], levelEvents: [], levelSettlements: [], levelReviews: [],
    users: ['p', 'u', 'admin'].map(id => ({ id, username: id })), companions: [{ id: 'cp', userId: 'p', status: 'APPROVED' }],
    persistState: vi.fn(), getBanError: () => null,
    authMiddleware: (req: any, res: any, next: any) => { req.authUserId = req.headers.authorization; return req.authUserId ? next() : res.sendStatus(401); },
    requireAdmin: () => (req: any, res: any, next: any) => req.authUserId === 'admin' ? next() : res.sendStatus(403),
    sendError: (res: any, status: number, code: string) => res.status(status).json({ error: code }) };
  const app = express(); app.use(express.json()); registerSocialContentRoutes(app, ctx);
  const submit = (key: string) => request(app).post('/api/social/posts').set('Authorization', 'p').send({ content: 'A pending post', requestId: key });
  const moderate = (kind: string, id: string, action: string, reason = '') => request(app).post(`/api/admin/social/${kind}/${id}`).set('Authorization', 'admin').send({ action, reason });
  return { ctx, app, submit, moderate };
}
it('keeps submissions private and creates points only on approval in the new week', async () => {
  const { ctx, app, submit, moderate } = setup(); const clock = vi.spyOn(Date, 'now').mockReturnValue(start - 1000);
  try {
    const post = (await submit('a')).body; expect(post.status).toBe('PENDING');
    expect(ctx.levelEvents).toHaveLength(0);
    expect((await request(app).get('/api/social/posts')).body.items).toEqual([]);
    expect((await request(app).get('/api/social/posts/mine').set('Authorization', 'p')).body.items).toHaveLength(1);
    expect((await request(app).get(`/api/social/posts/${post.id}`).set('Authorization', 'u')).status).toBe(404);
    expect((await request(app).get('/api/admin/social').set('Authorization', 'u')).status).toBe(403);
    clock.mockReturnValue(start + 1000);
    expect((await moderate('posts', post.id, 'APPROVE')).status).toBe(200);
    expect((await moderate('posts', post.id, 'APPROVE')).status).toBe(200);
    expect(ctx.levelEvents).toHaveLength(1); expect(ctx.levelEvents[0].at).toBe(start + 1000);
    expect(weeklyActivity(ctx.levelEvents, 'p', start - 7 * 86400000, start, 'Asia/Riyadh').post).toBe(0);
    expect(weeklyActivity(ctx.levelEvents, 'p', start, end, 'Asia/Riyadh').post).toBe(5);
  } finally { clock.mockRestore(); }
});
it('keeps daily points while another approved post remains and revokes when none remain', async () => {
  const { ctx, submit, moderate } = setup(); const clock = vi.spyOn(Date, 'now').mockReturnValue(start + 1000);
  try {
    const a = (await submit('a')).body, b = (await submit('b')).body;
    await moderate('posts', a.id, 'APPROVE'); await moderate('posts', b.id, 'APPROVE');
    expect((await moderate('posts', a.id, 'REMOVE', 'Violation')).status).toBe(200);
    expect(weeklyActivity(ctx.levelEvents, 'p', start, end, 'Asia/Riyadh').post).toBe(5);
    await moderate('posts', b.id, 'REMOVE', 'Violation');
    expect(weeklyActivity(ctx.levelEvents, 'p', start, end, 'Asia/Riyadh').post).toBe(0);
  } finally { clock.mockRestore(); }
});
it('records a manual review for settled weeks without rewriting the settlement', async () => {
  const { ctx, submit, moderate } = setup(); const clock = vi.spyOn(Date, 'now').mockReturnValue(start + 1000);
  try {
    const post = (await submit('a')).body; await moderate('posts', post.id, 'APPROVE');
    const settled = { userId: 'p', start, end, points: 5, after: { score: 99 } }; ctx.levelSettlements.push(settled);
    clock.mockReturnValue(end + 1000); await moderate('posts', post.id, 'REMOVE', 'Violation'); await moderate('posts', post.id, 'REMOVE', 'Violation');
    expect(ctx.levelReviews).toHaveLength(1); expect(ctx.levelSettlements[0]).toEqual(settled);
    expect(ctx.levelReviews[0].status).toBe('PENDING');
    expect(ctx.levelReviews[0].deduction).toBe(5);
  } finally { clock.mockRestore(); }
});
it('moderates comments separately, requires reasons and rolls back failed decisions', async () => {
  const { ctx, app, submit, moderate } = setup(); const post = (await submit('a')).body; await moderate('posts', post.id, 'APPROVE');
  const c = await request(app).post(`/api/social/posts/${post.id}/comments`).set('Authorization', 'u').send({ content: 'Hello', requestId: 'comment' });
  expect(c.status).toBe(201); expect(c.body.status).toBe('PENDING');
  expect((await request(app).get(`/api/social/posts/${post.id}`).set('Authorization', 'p')).body.commentsList).toHaveLength(0);
  expect((await request(app).get(`/api/social/posts/${post.id}`).set('Authorization', 'u')).body.commentsList).toHaveLength(1);
  expect((await moderate('comments', c.body.id, 'REJECT')).status).toBe(400);
  ctx.persistState.mockImplementationOnce(() => { throw new Error('disk'); });
  expect((await moderate('comments', c.body.id, 'APPROVE')).status).toBe(503);
  expect(ctx.socialComments[0].status).toBe('PENDING');
  await moderate('comments', c.body.id, 'REJECT', 'Not appropriate');
  expect((await request(app).get(`/api/social/posts/${post.id}`).set('Authorization', 'u')).body.commentsList[0].moderationReason).toBe('Not appropriate');
  expect(ctx.levelEvents).toHaveLength(1);
});
it('confirms a computed deduction without changing historic levels and rejects conflicting decisions', async () => {
  const { ctx, app } = setup();
  ctx.levelReviews.push({ id: 'review', userId: 'p', postId: 'post', start, end, status: 'PENDING', deduction: 5 });
  const decide = (action: string, reason: string, actor = 'admin') => request(app).post('/api/admin/social/level-reviews/review').set('Authorization', actor).send({ action, reason, deduction: 999 });
  expect((await decide('CONFIRM', 'verified', 'u')).status).toBe(403);
  expect((await decide('CONFIRM', '')).status).toBe(400);
  ctx.persistState.mockImplementationOnce(() => { throw new Error('disk'); });
  expect((await decide('CONFIRM', 'verified')).status).toBe(503);
  expect(ctx.levelReviews[0].status).toBe('PENDING');
  expect((await decide('CONFIRM', 'verified')).status).toBe(200);
  expect((await decide('CONFIRM', 'verified')).status).toBe(200);
  expect(ctx.levelReviews[0]).toMatchObject({ status: 'CONFIRMED', deduction: 5, reviewedBy: 'admin', reviewNote: 'verified' });
  expect((await decide('DISMISS', 'changed')).status).toBe(409);
  expect(ctx.levelSettlements).toHaveLength(0);
});
