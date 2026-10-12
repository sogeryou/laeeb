import type { BusinessOrder } from '@shared/orders';
import type { IMOrder } from '@shared/types';

export function blocksCompanionCheckout(order: IMOrder, companionId: string): boolean {
  return order.epalId === companionId && order.role === 'BUYER' &&
    order.source?.workflowVersion === 2 &&
    ['CREATED', 'IN_SERVICE', 'AWAITING_CONFIRMATION', 'DISPUTED'].includes(order.businessStatus ?? '');
}

export function toIMOrder(order: BusinessOrder): IMOrder {
  const status: IMOrder['status'] = order.status === 'CREATED' ? 'PENDING'
    : order.status === 'COMPLETED' ? 'COMPLETED'
    : ['CANCELLED', 'REFUNDED'].includes(order.status) ? 'CANCELLED' : 'ONGOING';
  return {
    id: order.id, epalId: order.companionId, serviceName: order.serviceName,
    price: order.totalPrice, totalPrice: order.totalPrice,
    timestamp: order.createdAt, endTime: order.completedAt,
    unit: order.unit ?? 'hr', unitPrice: order.unitPrice, quantity: order.quantity,
    status, businessStatus: order.status, role: order.role, participant: order.participant,
    reviewed: order.reviewed, reviewRating: order.review?.rating,
    reviewFeedback: order.review?.content, reviewTags: order.review?.tags,
    source: order,
  };
}
