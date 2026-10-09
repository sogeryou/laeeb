import type { AppContext } from '../app/context.js';
import type { OrderEntity } from '../domain/types.js';

export class OrderFlowError extends Error {}
const fail = (code: string): never => { throw new OrderFlowError(code); };
const cents = (n: number) => Math.round(n * 100);
const money = (n: number) => n / 100;
function evidence(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 9 || value.some(v => typeof v !== 'string' || !v.trim() || v.length > 2048)) return fail('EVIDENCE_REQUIRED');
  return value.map(v => v.trim());
}
function post(ctx: AppContext, order: OrderEntity, type: 'ORDER_PAY' | 'REFUND' | 'INCOME', userId: string, amount: number, balance: number, now: number) {
  ctx.walletTransactions.unshift({ id: `escrow:${order.id}:${type}`, userId, type, amount, balanceAfter: balance, referenceId: order.id, timestamp: now, description: `Order ${type.toLowerCase()} ${order.id}` });
}
export function freezeOrder(ctx: AppContext, order: OrderEntity, now = Date.now()) {
  if (order.workflowVersion === 2) return;
  if (order.status !== 'CREATED' || order.settlementDone) fail('ORDER_INVALID_TRANSITION');
  if (!Number.isFinite(order.totalPrice) || order.totalPrice < 0 || !Number.isSafeInteger(cents(order.totalPrice))) fail('ORDER_AMOUNT_INVALID');
  const wallet = ctx.wallets[order.userId];
  if (!wallet || cents(wallet.balance) < cents(order.totalPrice)) fail('WALLET_INSUFFICIENT_BALANCE');
  wallet.balance = money(cents(wallet.balance) - cents(order.totalPrice)); wallet.lastUpdated = now;
  Object.assign(order, { workflowVersion: 2, escrowState: 'FROZEN', frozenAmount: order.totalPrice, paidAt: now, updatedAt: now });
  post(ctx, order, 'ORDER_PAY', order.userId, -order.totalPrice, wallet.balance, now);
}
function release(ctx: AppContext, order: OrderEntity, refund: boolean, now: number) {
  if (order.escrowState !== 'FROZEN' || order.frozenAmount !== order.totalPrice) fail('ESCROW_INVALID');
  const amount = order.frozenAmount!;
  if (refund) {
    const wallet = ctx.wallets[order.userId];
    if (!wallet) fail('WALLET_NOT_FOUND');
    wallet.balance = money(cents(wallet.balance) + cents(amount)); wallet.lastUpdated = now;
    post(ctx, order, 'REFUND', order.userId, amount, wallet.balance, now);
    order.escrowState = 'RETURNED';
  } else {
    const player = ctx.companions.find(c => c.id === order.companionId);
    if (!player) fail('COMPANION_NOT_FOUND');
    const wallet = ctx.diamondWallets[player!.userId] ?? { userId: player!.userId, balance: 0, lastUpdated: now };
    wallet.balance = money(cents(wallet.balance) + cents(amount)); wallet.lastUpdated = now;
    ctx.diamondWallets[player!.userId] = wallet;
    post(ctx, order, 'INCOME', player!.userId, amount, wallet.balance, now);
    order.escrowState = 'SETTLED'; order.settlementDone = true; order.completedAt = now;
  }
  order.updatedAt = now;
}
export type OrderAction = 'accept' | 'complete' | 'confirm' | 'cancel' | 'dispute' | 'refund' | 'uphold';
export function actOnOrder(ctx: AppContext, order: OrderEntity, actor: string, action: OrderAction, body: { evidence?: unknown; reason?: unknown } = {}, now = Date.now(), admin = false) {
  if (order.workflowVersion !== 2) fail('LEGACY_ORDER_RECONCILIATION_REQUIRED');
  const player = ctx.companions.find(c => c.id === order.companionId);
  const allowed = action === 'refund' || action === 'uphold' ? admin : action === 'accept' || action === 'complete' ? actor === player?.userId : actor === order.userId;
  if (!allowed) fail('ORDER_FORBIDDEN');
  if (action === 'confirm' && order.status === 'COMPLETED' && order.escrowState === 'SETTLED') return order;
  if (action === 'cancel' && order.status === 'CANCELLED' && order.escrowState === 'RETURNED') return order;
  if (action === 'refund' && order.status === 'REFUNDED' && order.escrowState === 'RETURNED') return order;
  if (action === 'uphold' && order.status === 'COMPLETED' && order.escrowState === 'SETTLED') return order;
  if (action === 'accept') {
    if (order.status !== 'CREATED' || now >= order.paidAt! + 900_000) fail('ORDER_INVALID_TRANSITION');
    if (ctx.getBanError(ctx.getUserById(actor), 'ACCEPT_ORDER')) fail('ORDER_ACTION_BLOCKED');
    order.status = 'IN_SERVICE'; order.acceptedAt = now; order.startedAt = now;
  } else if (action === 'complete') {
    if (order.status !== 'IN_SERVICE') fail('ORDER_INVALID_TRANSITION');
    order.completionEvidence = evidence(body.evidence);
    order.status = 'AWAITING_CONFIRMATION'; order.submittedAt = now; order.confirmationDueAt = now + 7_200_000;
  } else if (action === 'confirm') {
    if (order.status !== 'AWAITING_CONFIRMATION') fail('ORDER_INVALID_TRANSITION');
    release(ctx, order, false, now); order.status = 'COMPLETED';
  } else if (action === 'cancel') {
    if (order.status !== 'CREATED') fail('ORDER_INVALID_TRANSITION');
    release(ctx, order, true, now); order.status = 'CANCELLED'; order.cancelledAt = now;
  } else if (action === 'dispute') {
    if (order.status !== 'AWAITING_CONFIRMATION' || now >= order.confirmationDueAt!) fail('ORDER_INVALID_TRANSITION');
    if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 1000) fail('DISPUTE_REASON_REQUIRED');
    const proof = evidence(body.evidence);
    order.disputeReason = (body.reason as string).trim(); order.disputeEvidence = proof; order.status = 'DISPUTED';
  } else {
    if (!['refund', 'uphold'].includes(action) || order.status !== 'DISPUTED') fail('ORDER_INVALID_TRANSITION');
    release(ctx, order, action === 'refund', now); order.status = action === 'refund' ? 'REFUNDED' : 'COMPLETED';
  }
  order.updatedAt = now;
  return order;
}
export function expireOrders(ctx: AppContext, now = Date.now()) {
  let changed = false;
  for (const order of ctx.orders) {
    if (order.workflowVersion !== 2 || order.escrowState !== 'FROZEN') continue;
    if (order.status === 'CREATED' && now >= order.paidAt! + 900_000) {
      actOnOrder(ctx, order, order.userId, 'cancel', {}, now); changed = true;
    } else if (order.status === 'AWAITING_CONFIRMATION' && now >= order.confirmationDueAt!) {
      actOnOrder(ctx, order, order.userId, 'confirm', {}, now); changed = true;
    }
  }
  if (changed) ctx.persistState();
}
