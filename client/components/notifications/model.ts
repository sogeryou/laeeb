import { NOTIFICATION_KINDS, type AppNotification, type NotificationsPage } from '@shared/notifications';

const nonnegativeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const timestamp = (value: unknown): value is number => nonnegativeInteger(value) && value <= 8_640_000_000_000_000;
const id = (value: unknown) => typeof value === 'string' && value.length > 0;
export function validNotification(value: unknown, owner: string): value is AppNotification {
  const row = value as AppNotification | null;
  return Boolean(row && id(row.id) && row.userId === owner && NOTIFICATION_KINDS.includes(row.kind)
    && row.target && id(row.target.id) && row.target.type === (row.kind.startsWith('COMPANION_') ? 'APPLICATION' : 'ORDER')
    && timestamp(row.createdAt) && (row.readAt === undefined || timestamp(row.readAt))
    && (row.serviceName === undefined || typeof row.serviceName === 'string'));
}
export function validCount(value: unknown): value is number { return nonnegativeInteger(value); }
export function validReadAt(value: unknown): value is number { return timestamp(value); }
export function validPage(value: NotificationsPage, owner: string) {
  return value?.ownerId === owner && Array.isArray(value.items) && value.items.every(row => validNotification(row, owner))
    && new Set(value.items.map(row => row.id)).size === value.items.length && validCount(value.unreadCount)
    && (value.nextCursor === null || id(value.nextCursor));
}
export function mergeNotifications(previous: AppNotification[], incoming: AppNotification[]) {
  const rows = new Map(previous.map(row => [row.id, row]));
  incoming.forEach(row => rows.set(row.id, row));
  return [...rows.values()].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
}
