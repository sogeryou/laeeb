import { expect, it } from 'vitest';
import { freezeOrder, actOnOrder, expireOrders } from '../../backend/orders/escrow';

function setup() {
  const order: any = { id: 'o', userId: 'u', companionId: 'c', totalPrice: 100, status: 'CREATED', createdAt: 1000 };
  const ctx: any = { orders: [order], companions: [{ id: 'c', userId: 'p' }], wallets: { u: { balance: 200 } }, diamondWallets: {}, walletTransactions: [], persistState() {}, getBanError() { return null; }, getUserById() { return {}; } };
  return { ctx, order };
}
it('freezes coins once and credits diamonds only after buyer confirmation', () => {
  const { ctx, order } = setup(); freezeOrder(ctx, order, 1000); freezeOrder(ctx, order, 1000);
  expect(ctx.wallets.u.balance).toBe(100);
  expect(() => actOnOrder(ctx, order, 'u', 'accept', {}, 2000)).toThrow('FORBIDDEN');
  actOnOrder(ctx, order, 'p', 'accept', {}, 2000);
  expect(order.status).toBe('IN_SERVICE');
  expect(() => actOnOrder(ctx, order, 'u', 'cancel', {}, 2500)).toThrow();
  expect(() => actOnOrder(ctx, order, 'p', 'complete', {}, 3000)).toThrow('EVIDENCE');
  actOnOrder(ctx, order, 'p', 'complete', { evidence: ['https://example.test/proof.png'] }, 3000);
  expect(order.status).toBe('AWAITING_CONFIRMATION'); expect(ctx.diamondWallets.p).toBeUndefined();
  actOnOrder(ctx, order, 'u', 'confirm', {}, 4000); actOnOrder(ctx, order, 'u', 'confirm', {}, 4001);
  expect(ctx.diamondWallets.p.balance).toBe(100); expect(ctx.wallets.u.balance).toBe(100);
  expect(ctx.walletTransactions.filter((t: any) => t.type === 'INCOME')).toHaveLength(1);
});
it('returns frozen coins on cancellation and never refunds settled orders', () => {
  const { ctx, order } = setup(); freezeOrder(ctx, order, 1000);
  actOnOrder(ctx, order, 'u', 'cancel', {}, 2000); actOnOrder(ctx, order, 'u', 'cancel', {}, 2001);
  expect(ctx.wallets.u.balance).toBe(200); expect(order.escrowState).toBe('RETURNED');
});
it('keeps disputed funds frozen until arbitration returns coins', () => {
  const { ctx, order } = setup(); freezeOrder(ctx, order, 1000);
  actOnOrder(ctx, order, 'p', 'accept', {}, 2000);
  actOnOrder(ctx, order, 'p', 'complete', { evidence: ['proof'] }, 3000);
  actOnOrder(ctx, order, 'u', 'dispute', { reason: 'Not completed', evidence: ['proof'] }, 4000);
  expireOrders(ctx, 10_000_000); expect(order.status).toBe('DISPUTED');
  expect(() => actOnOrder(ctx, order, 'u', 'refund', {}, 5000)).toThrow('FORBIDDEN');
  actOnOrder(ctx, order, 'admin', 'refund', {}, 5000, true);
  expect(ctx.wallets.u.balance).toBe(200); expect(ctx.diamondWallets.p).toBeUndefined();
});
it('expires pending acceptance at 15 minutes and confirms at 2 hours', () => {
  const { ctx, order } = setup(); freezeOrder(ctx, order, 1000);
  expireOrders(ctx, 901000); expect(order.status).toBe('CANCELLED');
  const second = setup(); freezeOrder(second.ctx, second.order, 1000);
  actOnOrder(second.ctx, second.order, 'p', 'accept', {}, 2000);
  actOnOrder(second.ctx, second.order, 'p', 'complete', { evidence: ['proof'] }, 3000);
  expireOrders(second.ctx, 7_203_000); expect(second.order.status).toBe('COMPLETED');
  expect(second.ctx.diamondWallets.p.balance).toBe(100);
});
it('rejects insufficient funds and legacy orders without mutating balances', () => {
  const { ctx, order } = setup(); ctx.wallets.u.balance = 50;
  expect(() => freezeOrder(ctx, order, 1000)).toThrow('BALANCE');
  expect(ctx.wallets.u.balance).toBe(50);
  expect(() => actOnOrder(ctx, order, 'p', 'accept', {}, 2000)).toThrow('LEGACY');
});
