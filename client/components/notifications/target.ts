import type { AppNotification } from '@shared/notifications';
import type { BusinessOrder } from '@shared/orders';
import type { CompanionApplication } from '@shared/companionApplications';
import { businessApi } from '../../services/businessApi';
import { validNotification } from './model';

export type NotificationDestination = { type: 'APPLICATION'; application: CompanionApplication } | { type: 'ORDER'; order: BusinessOrder };

export async function resolveNotificationTarget(token: string, notification: AppNotification, ownerId: string): Promise<NotificationDestination> {
  if (!token || !validNotification(notification, ownerId)) throw Error('NOTIFICATION_TARGET_UNAVAILABLE');
  if (notification.target.type === 'APPLICATION') {
    const { application } = await businessApi.getCompanionApplication(token);
    if (!application || application.id !== notification.target.id || application.userId !== ownerId) throw Error('NOTIFICATION_TARGET_UNAVAILABLE');
    return { type: 'APPLICATION', application };
  }
  const orders = await businessApi.listOrders(token);
  const order = Array.isArray(orders) ? orders.find(row => row.id === notification.target.id) : undefined;
  if (!order || order.workflowVersion !== 2 || (order.role !== 'COMPANION' && !(order.role === 'BUYER' && order.userId === ownerId))) throw Error('NOTIFICATION_TARGET_UNAVAILABLE');
  return { type: 'ORDER', order };
}
