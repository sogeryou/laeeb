import { randomUUID } from 'node:crypto';
import type express from 'express';
import type { AppContext } from '../app/context.js';
import type { Message, EPal } from '../../shared/types.js';
import type { StoredContent } from './socialContent.js';
import { recordLevelEvent } from '../player-center/events.js';
import { GREETING_WINDOW_MS, hasGreetingReward, isNewGreetingCustomer, latestGreeting, recordGreetingReply } from './greetings.js';

export interface StoredMessage extends Message { requestId: string; readAt?: number }
export type StoredPost = StoredContent;
const avatar = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="#302044"/><circle cx="40" cy="30" r="14" fill="#ae95c5"/><path d="M14 74c0-34 52-34 52 0" fill="#ae95c5"/></svg>');
const owner = (req: express.Request) => (req as express.Request & { authUserId: string }).authUserId;
const validKey = (value: unknown): value is string => typeof value === 'string' && /^[\w-]{1,100}$/.test(value);
const messageView = ({ requestId: _, ...message }: StoredMessage) => message;

export function registerSocialRoutes(app: express.Application, ctx: AppContext) {
  const fail = (res: express.Response, status: number, code: string) => ctx.sendError(res, status, code, code);
  const player = (id: string) => ctx.companions.some(c => c.userId === id && c.status === 'APPROVED');
  const pair = (m: StoredMessage, a: string, b: string) => (m.senderId === a && m.receiverId === b) || (m.senderId === b && m.receiverId === a);
  const person = (id: string): EPal => {
    const user = ctx.users.find(u => u.id === id), companion = ctx.companions.find(c => c.userId === id);
    return { id: companion?.id || id, userId: id, name: user?.username || 'User', avatarUrl: avatar,
      rating: 0, orderCount: '0', price: companion?.hourlyRate || 0, game: companion?.gameName || '', tags: [] };
  };
  app.use('/api/social', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.get('/api/social/greetings/candidates', ctx.authMiddleware, (req, res) => {
    const id = owner(req);
    if (!player(id)) return fail(res, 403, 'PLAYER_REQUIRED');
    if (ctx.getBanError(ctx.users.find(u => u.id === id), 'PRIVATE_CHAT')) return fail(res, 403, 'CHAT_UNAVAILABLE');
    const after = req.query.after;
    if (after !== undefined && (typeof after !== 'string' || !ctx.users.some(u => u.id === after))) return fail(res, 400, 'INVALID_CURSOR');
    const now = Date.now();
    const eligible = ctx.users.filter(u => u.id !== id && u.role !== 'ADMIN' && !ctx.getBanError(u, 'PRIVATE_CHAT') &&
      isNewGreetingCustomer(ctx, id, u.id) && !hasGreetingReward(ctx, id, u.id) && (after === undefined || u.id > after))
      .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const items = eligible.slice(0, 20).map(u => {
      const greeting = latestGreeting(ctx, id, u.id);
      return { participant: person(u.id), status: !greeting ? 'ELIGIBLE' : now <= greeting.greeting!.expiresAt ? 'PENDING' : 'EXPIRED', expiresAt: greeting?.greeting?.expiresAt };
    });
    res.json({ items, nextAfter: eligible.length > 20 ? eligible[19].id : null, asOf: now });
  });
  app.get('/api/social/peer/:id', ctx.authMiddleware, (req, res) => {
    const id = ctx.companions.find(c => c.id === req.params.id)?.userId || req.params.id;
    if (!ctx.users.some(u => u.id === id)) return fail(res, 404, 'USER_NOT_FOUND');
    return res.json(person(id));
  });
  app.get('/api/social/conversations', ctx.authMiddleware, (req, res) => {
    const id = owner(req), rows = new Map<string, { last: StoredMessage; unread: number }>();
    for (const message of ctx.socialMessages) {
      if (message.senderId !== id && message.receiverId !== id) continue;
      const peer = message.senderId === id ? message.receiverId : message.senderId;
      const row = rows.get(peer) || { last: message, unread: 0 };
      row.last = message;
      if (message.receiverId === id && !message.readAt) row.unread++;
      rows.set(peer, row);
    }
    res.json({ items: [...rows].map(([peer, row]) => ({ id: peer, participantId: peer, participant: person(peer), lastMessage: row.last.content, lastTimestamp: row.last.timestamp, unreadCount: row.unread })).sort((a, b) => b.lastTimestamp - a.lastTimestamp) });
  });
  app.get('/api/social/messages/:peer', ctx.authMiddleware, (req, res) => {
    const rows = ctx.socialMessages.filter(m => pair(m, owner(req), req.params.peer));
    const before = req.query.before ? rows.findIndex(m => m.id === req.query.before) : rows.length;
    if (before < 0) return fail(res, 400, 'INVALID_CURSOR');
    const items = rows.slice(Math.max(0, before - 50), before);
    res.json({ items: items.map(messageView), nextBefore: before > 50 ? items[0].id : null });
  });
  app.post('/api/social/messages/:peer/read', ctx.authMiddleware, (req, res) => {
    if (!Array.isArray(req.body?.ids) || req.body.ids.length > 100 || req.body.ids.some((id: unknown) => typeof id !== 'string')) return fail(res, 400, 'INVALID_MESSAGE_IDS');
    const ids = new Set(req.body.ids), changed = ctx.socialMessages.filter(m => m.senderId === req.params.peer && m.receiverId === owner(req) && ids.has(m.id) && !m.readAt);
    for (const m of changed) m.readAt = Date.now();
    try { if (changed.length) ctx.persistState(); } catch { for (const m of changed) delete m.readAt; return fail(res, 503, 'SAVE_FAILED'); }
    res.json({ ok: true });
  });
  const sendMessage = (isGreeting: boolean): express.RequestHandler => (req, res) => {
    const senderId = owner(req), { recipientId, requestId } = req.body || {}, content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (isGreeting && !player(senderId)) return fail(res, 403, 'PLAYER_REQUIRED');
    if (!validKey(requestId) || !content || content.length > 2000 || typeof recipientId !== 'string' || recipientId === senderId) return fail(res, 400, 'INVALID_MESSAGE');
    const recipient = ctx.users.find(u => u.id === recipientId);
    if (!recipient) return fail(res, 404, 'USER_NOT_FOUND');
    if (ctx.getBanError(ctx.users.find(u => u.id === senderId), 'PRIVATE_CHAT') || ctx.getBanError(recipient, 'PRIVATE_CHAT')) return fail(res, 403, 'CHAT_UNAVAILABLE');
    const old = ctx.socialMessages.find(m => m.senderId === senderId && m.requestId === requestId);
    if (old) return old.receiverId === recipientId && old.content === content && !!old.greeting === isGreeting ? res.json(messageView(old)) : fail(res, 409, 'REQUEST_ID_CONFLICT');
    const now = Date.now();
    if (isGreeting) {
      if (recipient.role === 'ADMIN' || !isNewGreetingCustomer(ctx, senderId, recipientId)) return fail(res, 409, 'GREETING_NOT_ELIGIBLE');
      if (hasGreetingReward(ctx, senderId, recipientId)) return fail(res, 409, 'GREETING_ALREADY_REWARDED');
      const pending = latestGreeting(ctx, senderId, recipientId);
      if (pending?.greeting && now <= pending.greeting.expiresAt) return fail(res, 409, 'GREETING_PENDING');
    }
    if (ctx.socialMessages.filter(m => m.senderId === senderId && m.timestamp > now - 60000).length >= 60) return fail(res, 429, 'MESSAGE_RATE_LIMIT');
    const previous = ctx.socialMessages.filter(m => pair(m, senderId, recipientId));
    const message: StoredMessage = { id: randomUUID(), senderId, receiverId: recipientId, requestId, content, timestamp: now, type: 'text' };
    if (isGreeting) message.greeting = { eligibleAt: now, expiresAt: now + GREETING_WINDOW_MS };
    const eventCount = ctx.levelEvents.length;
    // The first incoming message after the other participant's reply opens a new opportunity.
    if (player(recipientId) && previous.at(-1)?.senderId !== senderId) recordLevelEvent(ctx, { id: `reply-opportunity:${message.id}`, userId: recipientId, at: now, kind: 'REPLY_OPPORTUNITY', referenceId: message.id });
    if (player(senderId) && previous.at(-1)?.senderId === recipientId) {
      let first = previous.length - 1;
      while (first > 0 && previous[first - 1].senderId === recipientId) first--;
      const referenceId = previous[first].id;
      if (ctx.levelEvents.some(e => e.kind === 'REPLY_OPPORTUNITY' && e.userId === senderId && e.referenceId === referenceId)) recordLevelEvent(ctx, { id: `reply:${referenceId}`, userId: senderId, at: now, kind: 'REPLY', referenceId });
    }
    recordGreetingReply(ctx, message);
    ctx.socialMessages.push(message);
    try { ctx.persistState(); } catch { ctx.socialMessages.pop(); ctx.levelEvents.splice(eventCount); return fail(res, 503, 'SAVE_FAILED'); }
    return res.status(201).json(messageView(message));
  };
  app.post('/api/social/messages', ctx.authMiddleware, sendMessage(false));
  app.post('/api/social/greetings', ctx.authMiddleware, sendMessage(true));
}
