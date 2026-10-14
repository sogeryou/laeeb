import { randomUUID } from 'node:crypto';
import type express from 'express';
import type { AppContext } from '../app/context.js';
import type { Post, PostComment, ContentStatus } from '../../shared/types.js';
import { recordLevelEvent, weeklyActivity } from '../player-center/events.js';

export interface StoredContent {
  id: string; userId: string; content: string; timestamp: number; requestId: string;
  status?: ContentStatus; approvedAt?: number; reviewedAt?: number; reviewedBy?: string; moderationReason?: string;
  history?: Array<{ action: string; at: number; actor: string; reason: string }>;
}
export interface StoredComment extends StoredContent { postId: string }
export interface LevelReview {
  id: string; userId: string; postId: string; start: number; end: number; reason: string; createdAt: number;
  status: 'PENDING' | 'CONFIRMED' | 'DISMISSED' | 'APPLIED'; deduction?: number;
  reviewedAt?: number; reviewedBy?: string; reviewNote?: string;
  appliedAt?: number; appliedWeek?: number; appliedAmount?: number; discardedAmount?: number;
}
const avatar = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="#302044"/></svg>');
const owner = (req: express.Request) => (req as express.Request & { authUserId: string }).authUserId;
const validKey = (value: unknown): value is string => typeof value === 'string' && /^[\w-]{1,100}$/.test(value);

export function registerSocialContentRoutes(app: express.Application, ctx: AppContext) {
  const fail = (res: express.Response, status: number, code: string) => ctx.sendError(res, status, code, code);
  app.use(['/api/social/posts', '/api/admin/social'], (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  const allowed = (p: StoredContent) => p.status === 'APPROVED' && !ctx.getBanError(ctx.users.find(u => u.id === p.userId), 'POST');
  const fields = (p: StoredContent, viewer?: string) => ({ id: p.id, userId: p.userId, userName: ctx.users.find(u => u.id === p.userId)?.username || 'User', userAvatar: ctx.users.find(u => u.id === p.userId)?.avatar || avatar,
    content: p.content, timestamp: p.timestamp, likes: 0, status: p.status || 'PENDING', approvedAt: p.approvedAt,
    ...(viewer === p.userId ? { moderationReason: p.moderationReason } : {}) });
  const postView = (p: StoredContent, viewer?: string): Post => ({ ...fields(p, viewer), comments: ctx.socialComments.filter(c => c.postId === p.id && allowed(c)).length });
  const page = <T extends { id: string }>(rows: T[], before: unknown) => {
    const start = before ? rows.findIndex(p => p.id === before) + 1 : 0;
    if (before && !start) return null;
    const items = rows.slice(start, start + 50);
    return { items, nextBefore: start + 50 < rows.length ? items.at(-1)!.id : null };
  };
  app.get('/api/social/posts', (req, res) => {
    const result = page(ctx.socialPosts.filter(allowed).slice().sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0) || b.id.localeCompare(a.id)), req.query.before);
    return result ? res.json({ ...result, items: result.items.map(p => postView(p)) }) : fail(res, 400, 'INVALID_CURSOR');
  });
  app.get('/api/social/posts/mine', ctx.authMiddleware, (req, res) => {
    const result = page(ctx.socialPosts.filter(p => p.userId === owner(req)).slice().reverse(), req.query.before);
    return result ? res.json({ ...result, items: result.items.map(p => postView(p, owner(req))) }) : fail(res, 400, 'INVALID_CURSOR');
  });
  app.get('/api/social/posts/:id', (req, res, next) => req.headers.authorization ? ctx.authMiddleware(req, res, next) : next(), (req, res) => {
    const p = ctx.socialPosts.find(p => p.id === req.params.id);
    if (!p || (!allowed(p) && p.userId !== owner(req))) return fail(res, 404, 'POST_NOT_FOUND');
    const commentsList: PostComment[] = ctx.socialComments.filter(c => c.postId === p.id && (allowed(c) || c.userId === owner(req))).map(c => fields(c, owner(req)));
    return res.json({ ...postView(p, owner(req)), commentsList });
  });
  const submit = (isComment: boolean): express.RequestHandler => (req, res) => {
    const userId = owner(req), requestId = req.body?.requestId, content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!validKey(requestId) || !content || content.length > (isComment ? 2000 : 5000)) return fail(res, 400, 'INVALID_CONTENT');
    if (ctx.getBanError(ctx.users.find(u => u.id === userId), 'POST')) return fail(res, 403, 'POST_UNAVAILABLE');
    const parent = isComment ? ctx.socialPosts.find(p => p.id === req.params.id) : undefined;
    if (isComment && (!parent || !allowed(parent))) return fail(res, 404, 'POST_NOT_FOUND');
    const rows: StoredContent[] = isComment ? ctx.socialComments : ctx.socialPosts;
    const old = rows.find(p => p.userId === userId && p.requestId === requestId);
    if (old) return old.content === content && (!isComment || (old as StoredComment).postId === parent!.id) ? res.json(isComment ? fields(old, userId) : postView(old, userId)) : fail(res, 409, 'REQUEST_ID_CONFLICT');
    const now = Date.now();
    if (rows.filter(p => p.userId === userId && p.timestamp > now - 60000).length >= 10) return fail(res, 429, 'CONTENT_RATE_LIMIT');
    const row = { id: randomUUID(), userId, content, requestId, timestamp: now, status: 'PENDING' as const, ...(isComment ? { postId: parent!.id } : {}) };
    rows.push(row);
    try { ctx.persistState(); } catch { rows.pop(); return fail(res, 503, 'SAVE_FAILED'); }
    return res.status(201).json(isComment ? fields(row, userId) : postView(row, userId));
  };
  app.post('/api/social/posts', ctx.authMiddleware, submit(false));
  app.post('/api/social/posts/:id/comments', ctx.authMiddleware, submit(true));
  app.get('/api/admin/social', ctx.authMiddleware, ctx.requireAdmin('REVIEW_MODERATE'), (req, res) => {
    const kind = req.query.kind || 'posts', status = req.query.status || 'PENDING';
    if (!['posts', 'comments', 'level-reviews'].includes(String(kind)) || !['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'REMOVED'].includes(String(status))) return fail(res, 400, 'INVALID_FILTER');
    if (kind === 'level-reviews') { const result = page(ctx.levelReviews.slice().reverse(), req.query.before); return result ? res.json(result) : fail(res, 400, 'INVALID_CURSOR'); }
    const rows = kind === 'posts' ? ctx.socialPosts : ctx.socialComments;
    const result = page(rows.filter(p => status === 'ALL' || (p.status || 'PENDING') === status).slice().reverse(), req.query.before);
    return result ? res.json({ ...result, items: result.items.map(p => ({ ...p, requestId: undefined, userName: ctx.users.find(u => u.id === p.userId)?.username || 'User' })) }) : fail(res, 400, 'INVALID_CURSOR');
  });
  app.post('/api/admin/social/level-reviews/:id', ctx.authMiddleware, ctx.requireAdmin('REVIEW_MODERATE'), (req, res) => {
    const action = req.body?.action, reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!['CONFIRM', 'DISMISS'].includes(action) || !reason || reason.length > 1000) return fail(res, 400, 'INVALID_REVIEW_DECISION');
    const review = ctx.levelReviews.find(r => r.id === req.params.id);
    if (!review) return fail(res, 404, 'REVIEW_NOT_FOUND');
    const next = action === 'CONFIRM' ? 'CONFIRMED' : 'DISMISSED';
    if (review.status === next || (action === 'CONFIRM' && review.status === 'APPLIED')) return res.json({ ok: true, status: review.status });
    if (review.status !== 'PENDING') return fail(res, 409, 'REVIEW_STATE_CONFLICT');
    if (action === 'CONFIRM' && (!Number.isSafeInteger(review.deduction) || review.deduction! < 0 || review.deduction! > 15)) return fail(res, 409, 'REVIEW_ESTIMATE_REQUIRED');
    const before = { ...review };
    Object.assign(review, { status: next, reviewedAt: Date.now(), reviewedBy: owner(req), reviewNote: reason });
    try { ctx.persistState(); } catch { for (const key of Object.keys(review)) delete (review as any)[key]; Object.assign(review, before); return fail(res, 503, 'SAVE_FAILED'); }
    return res.json({ ok: true, status: next });
  });
  app.post('/api/admin/social/:kind/:id', ctx.authMiddleware, ctx.requireAdmin('REVIEW_MODERATE'), (req, res) => {
    if (!['posts', 'comments'].includes(req.params.kind)) return fail(res, 400, 'INVALID_KIND');
    const action = req.body?.action, reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!['APPROVE', 'REJECT', 'REMOVE'].includes(action) || reason.length > 1000 || (action !== 'APPROVE' && !reason)) return fail(res, 400, 'INVALID_DECISION');
    const rows = req.params.kind === 'posts' ? ctx.socialPosts : ctx.socialComments, row = rows.find(p => p.id === req.params.id);
    if (!row) return fail(res, 404, 'CONTENT_NOT_FOUND');
    const next: ContentStatus = action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'REMOVED';
    if (row.status === next) return res.json({ ok: true, status: next });
    if ((action === 'REMOVE' && row.status !== 'APPROVED') || (action !== 'REMOVE' && (row.status || 'PENDING') !== 'PENDING')) return fail(res, 409, 'CONTENT_STATE_CONFLICT');
    if (action === 'APPROVE' && req.params.kind === 'comments' && !ctx.socialPosts.some(p => p.id === (row as StoredComment).postId && allowed(p))) return fail(res, 409, 'PARENT_NOT_PUBLIC');
    const before = structuredClone(row), eventsBefore = ctx.levelEvents.map(e => ({ ...e })), reviewCount = ctx.levelReviews.length, now = Date.now();
    row.status = next; row.reviewedAt = now; row.reviewedBy = owner(req); row.moderationReason = reason;
    row.history = [...(row.history || []), { action, at: now, actor: owner(req), reason }];
    if (action === 'APPROVE') {
      row.approvedAt = now;
      if (req.params.kind === 'posts' && ctx.companions.some(c => c.userId === row.userId && c.status === 'APPROVED')) recordLevelEvent(ctx, { id: `post-approved:${row.id}`, userId: row.userId, at: now, kind: 'POST', referenceId: row.id });
    }
    if (action === 'REMOVE' && req.params.kind === 'posts') {
      for (const event of ctx.levelEvents.filter(e => e.kind === 'POST' && e.referenceId === row.id && e.userId === row.userId && e.revokedAt === undefined)) {
        event.revokedAt = now;
        for (const settled of ctx.levelSettlements.filter(s => s.userId === row.userId && event.at >= s.start && event.at < s.end)) {
          if (!ctx.levelReviews.some(r => r.postId === row.id && r.start === settled.start && r.end === settled.end)) ctx.levelReviews.push({ id: randomUUID(), userId: row.userId, postId: row.id, start: settled.start, end: settled.end, reason, createdAt: now, status: 'PENDING' });
        }
      }
      for (const review of ctx.levelReviews.slice(reviewCount)) {
        const timezone = process.env.SETTLEMENT_TZ || 'Asia/Riyadh';
        const beforePoints = weeklyActivity(eventsBefore, row.userId, review.start, review.end, timezone).post;
        const afterPoints = weeklyActivity(ctx.levelEvents, row.userId, review.start, review.end, timezone).post;
        review.deduction = Math.max(0, beforePoints - afterPoints);
      }
    }
    try { ctx.persistState(); } catch {
      for (const key of Object.keys(row)) delete (row as any)[key]; Object.assign(row, before);
      ctx.levelEvents.splice(0, ctx.levelEvents.length, ...eventsBefore); ctx.levelReviews.splice(reviewCount);
      return fail(res, 503, 'SAVE_FAILED');
    }
    return res.json({ ok: true, status: next });
  });
}
