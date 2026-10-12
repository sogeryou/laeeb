import type { EPal } from './types.js';

export type OrderStatus = 'CREATED' | 'ACCEPTED' | 'IN_SERVICE' | 'AWAITING_CONFIRMATION' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED' | 'REFUNDED';
export type OrderAction = 'accept' | 'complete' | 'confirm' | 'cancel' | 'dispute';

export interface CreateOrderInput {
  requestId?: string;
  expectedTotal?: number;
  companionId: string;
  serviceId?: string;
  serviceName?: string;
  quantity: number;
  couponGrantId?: string;
}

// Amounts use existing wallet units; the server calculates in integer hundredths.
export interface OrderQuote {
  companionId: string;
  serviceId?: string;
  serviceName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  totalPrice: number;
  couponGrantId?: string;
}

export interface BusinessReview {
  id: string;
  orderId: string;
  userId: string;
  companionId: string;
  rating: number;
  content: string;
  tags?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  moderationReason?: string;
  createdAt: number;
  updatedAt?: number;
}

export type PersistedOrder = {
  id: string;
  userId: string;
  companionId: string;
  serviceName: string;
  serviceId?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
  discount?: number;
  totalPrice: number;
  couponGrantId?: string;
  requestId?: string;
  requestPayload?: string;
  status: OrderStatus;
  workflowVersion?: 2;
  escrowState?: 'FROZEN' | 'SETTLED' | 'RETURNED';
  frozenAmount?: number;
  paidAt?: number;
  submittedAt?: number;
  confirmationDueAt?: number;
  completionEvidence?: string[];
  disputeEvidence?: string[];
  createdAt: number;
  acceptedAt?: number;
  startedAt?: number;
  completedAt?: number;
  cancelledAt?: number;
  disputeReason?: string;
  settlementDone?: boolean;
  updatedAt?: number;
};

export interface BusinessOrder extends Omit<PersistedOrder, 'requestPayload'> {
  role: 'BUYER' | 'COMPANION';
  participant: EPal;
  reviewed: boolean;
  review?: BusinessReview;
}
