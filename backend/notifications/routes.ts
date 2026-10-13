import type express from 'express';
import { z } from 'zod';
import type { AppContext } from '../app/context.js';
import type { AppNotification, NotificationReadResult, NotificationsPage, NotificationsReadAllResult } from '../../shared/notifications.js';
import { zValidate } from '../middleware/validate.js';
import { notificationRows } from './events.js';

const querySchema = z.object({
  limit: z.string().regex(/^\d+$/).refine(value => Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 50).optional(),
  cursor: z.string().min(1).optional(),
}).strict();
const emptyBody = z.object({}).strict();
type NotificationRow = AppContext['notifications'][number];

function dto(row: NotificationRow): AppNotification {
  return {
    id: row.id, userId: row.userId, kind: row.kind,
    target: { type: row.target.type, id: row.target.id }, createdAt: row.createdAt,
    ...(row.serviceName !== undefined ? { serviceName: row.serviceName } : {}),
    ...(row.readAt !== undefined ? { readAt: row.readAt } : {}),
  };
}
function unreadCount(ctx: AppContext, ownerId: string) {
  return notificationRows(ctx).filter(row => row.userId === ownerId && row.readAt === undefined).length;
}
function markRead(ctx: AppContext, rows: NotificationRow[], readAt: number) {
  if (!rows.length) return;
  const previous = rows.map(row => ({ row, readAt: row.readAt, hadReadAt: Object.hasOwn(row, 'readAt') }));
  try {
    rows.forEach(row => { row.readAt = readAt; });
    ctx.persistState();
  } catch (error) {
    previous.forEach(saved => { if (saved.hadReadAt) saved.row.readAt = saved.readAt; else delete saved.row.readAt; });
    throw error;
  }
}
const noStore: express.RequestHandler = (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); };

export function registerNotificationRoutes(app: express.Application, ctx: AppContext) {
  notificationRows(ctx);
  app.get('/api/notifications', noStore, ctx.authMiddleware, zValidate(querySchema, 'query'), (req, res) => {
    const ownerId = (req as any).authUserId as string;
    const { cursor, limit: rawLimit } = (req as express.Request & { validatedQuery: z.infer<typeof querySchema> }).validatedQuery;
    const limit = rawLimit === undefined ? 20 : Number(rawLimit);
    const owned = ctx.notifications.filter(row => row.userId === ownerId)
      .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
    const cursorIndex = cursor === undefined ? -1 : owned.findIndex(row => row.id === cursor);
    if (cursor !== undefined && cursorIndex === -1) return ctx.sendError(res, 400, 'NOTIFICATION_CURSOR_INVALID', 'Invalid notification cursor');
    const start = cursorIndex + 1;
    const items = owned.slice(start, start + limit);
    return res.json({ ownerId, items: items.map(dto), nextCursor: start + items.length < owned.length ? items[items.length - 1].id : null, unreadCount: unreadCount(ctx, ownerId) } satisfies NotificationsPage);
  });

  app.post('/api/notifications/read-all', noStore, ctx.authMiddleware, zValidate(emptyBody), (req, res) => {
    const ownerId = (req as any).authUserId as string;
    const rows = ctx.notifications.filter(row => row.userId === ownerId && row.readAt === undefined);
    const readAt = Date.now();
    try { markRead(ctx, rows, readAt); } catch { return ctx.sendError(res, 503, 'NOTIFICATION_SAVE_FAILED', 'Notifications could not be saved'); }
    return res.json({ ownerId, updatedIds: rows.map(row => row.id), readAt, unreadCount: unreadCount(ctx, ownerId) } satisfies NotificationsReadAllResult);
  });

  app.post('/api/notifications/:id/read', noStore, ctx.authMiddleware, zValidate(emptyBody), (req, res) => {
    const ownerId = (req as any).authUserId as string;
    const row = ctx.notifications.find(item => item.id === req.params.id && item.userId === ownerId);
    if (!row) return ctx.sendError(res, 404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    try { markRead(ctx, row.readAt === undefined ? [row] : [], Date.now()); } catch { return ctx.sendError(res, 503, 'NOTIFICATION_SAVE_FAILED', 'Notifications could not be saved'); }
    return res.json({ ownerId, notification: dto(row), unreadCount: unreadCount(ctx, ownerId) } satisfies NotificationReadResult);
  });
}
