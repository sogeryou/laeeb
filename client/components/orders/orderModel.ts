import type { BusinessOrder } from '@shared/orders';

export function canReview(order: BusinessOrder) {
  return order.workflowVersion === 2 && order.role === 'BUYER' && order.status === 'COMPLETED' && !order.reviewed && !order.review;
}
export function evidenceEntries(value: string) { return value.split('\n').map(entry => entry.trim()).filter(Boolean); }
export function validEvidence(entries: string[], required: boolean) {
  return entries.length >= (required ? 1 : 0) && entries.length <= 9 && entries.every(entry => entry.length <= 2048);
}
export function orderDate(value: number | undefined, locale: string) {
  return value ? new Date(value).toLocaleString(locale.toLowerCase().startsWith('ar') ? 'ar' : 'en') : '-';
}
export function reviewMessage(status: string, copy: ReturnType<typeof import('./orderCopy').orderCopy>) {
  return status === 'APPROVED' ? copy.reviewApproved : status === 'REJECTED' ? copy.reviewRejected : copy.reviewPending;
}
