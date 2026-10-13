export const NOTIFICATION_KINDS = [
  'COMPANION_APPROVED', 'COMPANION_REJECTED',
  'ORDER_CREATED', 'ORDER_ACCEPTED', 'ORDER_AWAITING_CONFIRMATION',
  'ORDER_COMPLETED', 'ORDER_CANCELLED', 'ORDER_DISPUTED', 'ORDER_REFUNDED',
] as const;

export type NotificationKind = typeof NOTIFICATION_KINDS[number];
export type NotificationTarget = { type: 'APPLICATION' | 'ORDER'; id: string };
export type AppNotification = {
  id: string;
  userId: string;
  kind: NotificationKind;
  target: NotificationTarget;
  serviceName?: string;
  createdAt: number;
  readAt?: number;
};
export type NotificationsPage = { ownerId: string; items: AppNotification[]; nextCursor: string | null; unreadCount: number };
export type NotificationReadResult = { ownerId: string; notification: AppNotification; unreadCount: number };
export type NotificationsReadAllResult = { ownerId: string; updatedIds: string[]; readAt: number; unreadCount: number };
