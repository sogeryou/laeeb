import { randomUUID } from 'node:crypto';
import type { AppContext } from '../app/context.js';
import type { CompanionEntity, OrderEntity } from '../domain/types.js';
import type { AppNotification, NotificationKind } from '../../shared/notifications.js';

// Partial test contexts may omit the additive store; the real server supplies its persisted array.
export function notificationRows(ctx: AppContext): AppContext['notifications'] {
  return ctx.notifications ||= [];
}

function emit(ctx: AppContext, eventKey: string, notification: Omit<AppNotification, 'id'>) {
  const rows = notificationRows(ctx);
  if (rows.some(row => row.eventKey === eventKey)) return;
  rows.push({ ...notification, id: `ntf_${randomUUID()}`, eventKey });
}

export function emitCompanionReviewNotification(ctx: AppContext, companion: CompanionEntity) {
  if (companion.status !== 'APPROVED' && companion.status !== 'REJECTED') return;
  const serviceName = companion.application?.details.serviceName;
  emit(ctx, JSON.stringify(['companion', companion.id, companion.updatedAt, companion.status]), {
    userId: companion.userId,
    kind: companion.status === 'APPROVED' ? 'COMPANION_APPROVED' : 'COMPANION_REJECTED',
    target: { type: 'APPLICATION', id: companion.id }, createdAt: companion.updatedAt,
    ...(serviceName ? { serviceName } : {}),
  });
}

const orderKinds: Partial<Record<OrderEntity['status'], NotificationKind>> = {
  CREATED: 'ORDER_CREATED', IN_SERVICE: 'ORDER_ACCEPTED',
  AWAITING_CONFIRMATION: 'ORDER_AWAITING_CONFIRMATION', COMPLETED: 'ORDER_COMPLETED',
  CANCELLED: 'ORDER_CANCELLED', DISPUTED: 'ORDER_DISPUTED', REFUNDED: 'ORDER_REFUNDED',
};

export function emitOrderNotification(ctx: AppContext, order: OrderEntity, now: number) {
  if (order.workflowVersion !== 2) return;
  const kind = orderKinds[order.status];
  if (!kind) return;
  const providerId = ctx.companions.find(companion => companion.id === order.companionId)?.userId;
  for (const userId of new Set([order.userId, providerId].filter((id): id is string => Boolean(id)))) {
    emit(ctx, JSON.stringify(['order', order.id, order.status, userId]), {
      userId, kind, target: { type: 'ORDER', id: order.id }, createdAt: now,
      ...(order.serviceName ? { serviceName: order.serviceName } : {}),
    });
  }
}
