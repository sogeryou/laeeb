import { expect, it, vi } from 'vitest';
import { defaultState, migrateState } from '../../backend/state/jsonState';
import { actOnOrder, expireOrders, freezeOrder } from '../../backend/orders/escrow';
import * as escrow from '../../backend/orders/escrow';
import { persistOrderMutation } from '../../backend/orders/persistence';

function setup() {
  const order: any = { id: 'o', userId: 'buyer', companionId: 'c', serviceName: 'Ranked duo', totalPrice: 100, status: 'CREATED', createdAt: 1000 };
  const ctx: any = { ...defaultState(), orders: [order], companions: [{ id: 'c', userId: 'provider', status: 'APPROVED' }],
    wallets: { buyer: { userId: 'buyer', balance: 200 } }, persistState: vi.fn(), getBanError: () => null, getUserById: () => ({}) };
  ctx.appendAuditLog = (actorUserId: string, action: string, targetType: string, targetId: string, metadata: any) => ctx.auditLogs.unshift({ id: `audit-${ctx.auditLogs.length}`, actorUserId, action, targetType, targetId, metadata });
  return { ctx, order };
}

it('initializes notifications without backfilling old reviews or orders', () => {
  expect((defaultState() as any).notifications).toEqual([]);
  const old: any = defaultState(); delete old.notifications;
  old.schemaVersion = 12; old.orders.push({ id: 'legacy', status: 'COMPLETED' });
  const migrated: any = migrateState(old);
  expect(migrated.notifications).toEqual([]);
  expect(migrated.orders).toBe(old.orders);
});

it('emits funded creation once to actual participants inside the order save', () => {
  const { ctx, order } = setup();
  persistOrderMutation(ctx, () => freezeOrder(ctx, order, 1000));
  expect(ctx.notifications).toHaveLength(2);
  expect(ctx.notifications.map((n: any) => n.userId).sort()).toEqual(['buyer', 'provider']);
  expect(ctx.notifications[0]).toMatchObject({ kind: 'ORDER_CREATED', target: { type: 'ORDER', id: 'o' }, serviceName: 'Ranked duo', createdAt: 1000 });
  freezeOrder(ctx, order, 1001);
  expect(ctx.notifications).toHaveLength(2);
});

it('uses the same events for participant completion and automatic confirmation', () => {
  const { ctx, order } = setup(); freezeOrder(ctx, order, 1000);
  actOnOrder(ctx, order, 'provider', 'accept', {}, 2000);
  actOnOrder(ctx, order, 'provider', 'complete', { evidence: ['private-proof'] }, 3000);
  expireOrders(ctx, 7_203_000);
  actOnOrder(ctx, order, 'buyer', 'confirm', {}, 7_203_001);
  expect(ctx.notifications.map((n: any) => n.kind)).toEqual([
    'ORDER_CREATED', 'ORDER_CREATED', 'ORDER_ACCEPTED', 'ORDER_ACCEPTED',
    'ORDER_AWAITING_CONFIRMATION', 'ORDER_AWAITING_CONFIRMATION', 'ORDER_COMPLETED', 'ORDER_COMPLETED',
  ]);
  expect(ctx.notifications.map((n: any) => n.eventKey).length).toBe(new Set(ctx.notifications.map((n: any) => n.eventKey)).size);
  expect(JSON.stringify(ctx.notifications)).not.toContain('private-proof');
  expect(JSON.stringify(ctx.notifications)).not.toContain('confirmed');
});

it('emits cancellation for deadline expiry once and ignores legacy records', () => {
  const { ctx, order } = setup(); freezeOrder(ctx, order, 1000);
  const legacy = { id: 'legacy', userId: 'buyer', companionId: 'c', totalPrice: 100, status: 'CREATED', paidAt: 1 };
  ctx.orders.push(legacy); expireOrders(ctx, 901000); expireOrders(ctx, 902000);
  expect(ctx.notifications.filter((n: any) => n.kind === 'ORDER_CANCELLED')).toHaveLength(2);
  expect(legacy.status).toBe('CREATED'); expect(ctx.wallets.buyer.balance).toBe(200);
});

it.each(['refund', 'uphold'] as const)('emits dispute then the same domain arbitration event for %s without replay events', action => {
  const { ctx, order } = setup(); freezeOrder(ctx, order, 1000);
  actOnOrder(ctx, order, 'provider', 'accept', {}, 2000);
  actOnOrder(ctx, order, 'provider', 'complete', { evidence: ['proof'] }, 3000);
  actOnOrder(ctx, order, 'buyer', 'dispute', { reason: 'Private reason', evidence: ['proof'] }, 4000);
  actOnOrder(ctx, order, 'admin', action, {}, 5000, true);
  actOnOrder(ctx, order, 'admin', action, {}, 5001, true);
  expect(ctx.notifications.filter((n: any) => n.kind === 'ORDER_DISPUTED')).toHaveLength(2);
  expect(ctx.notifications.filter((n: any) => n.kind === (action === 'refund' ? 'ORDER_REFUNDED' : 'ORDER_COMPLETED'))).toHaveLength(2);
  expect(JSON.stringify(ctx.notifications)).not.toContain('Private reason');
  expect(JSON.stringify(ctx.notifications)).not.toContain('admin');
});

it('deduplicates coincident recipients and omits absent service snapshots', () => {
  const { ctx, order } = setup(); ctx.companions[0].userId = 'buyer'; delete order.serviceName;
  freezeOrder(ctx, order, 1000); expect(ctx.notifications).toHaveLength(1);
  expect(ctx.notifications[0].userId).toBe('buyer'); expect(ctx.notifications[0]).not.toHaveProperty('serviceName');
});

it('emits no events for insufficient funds, legacy or unauthorized/failed transitions', () => {
  const { ctx, order } = setup(); ctx.wallets.buyer.balance = 0;
  expect(() => freezeOrder(ctx, order, 1000)).toThrow('BALANCE'); expect(ctx.notifications).toEqual([]);
  expect(() => actOnOrder(ctx, order, 'provider', 'accept', {}, 2000)).toThrow('LEGACY'); expect(ctx.notifications).toEqual([]);
  ctx.wallets.buyer.balance = 200; freezeOrder(ctx, order, 1000); const before = structuredClone(ctx.notifications);
  expect(() => actOnOrder(ctx, order, 'other', 'accept', {}, 2000)).toThrow('FORBIDDEN');
  expect(() => actOnOrder(ctx, order, 'provider', 'complete', {}, 3000)).toThrow('TRANSITION');
  actOnOrder(ctx, order, 'provider', 'accept', {}, 2000); const accepted = structuredClone(ctx.notifications);
  expect(() => actOnOrder(ctx, order, 'provider', 'complete', {}, 3000)).toThrow('EVIDENCE');
  expect(ctx.notifications).toEqual(accepted); expect(before).toHaveLength(2);
});

it('restores notification/audit/fund/order rows and collections in place when a save fails', () => {
  const { ctx, order } = setup(); freezeOrder(ctx, order, 1000);
  ctx.auditLogs.push({ id: 'old', action: 'OLD' });
  const collections = [ctx.notifications, ctx.auditLogs, ctx.orders, ctx.walletTransactions];
  const notification = ctx.notifications[0], audit = ctx.auditLogs[0], wallet = ctx.wallets.buyer;
  const before = structuredClone({ notifications: ctx.notifications, auditLogs: ctx.auditLogs, order, wallet });
  ctx.persistState.mockImplementationOnce(() => { throw Error('disk'); });
  expect(() => persistOrderMutation(ctx, () => {
    actOnOrder(ctx, order, 'buyer', 'cancel', {}, 2000);
    ctx.notifications[0].readAt = 2000; ctx.auditLogs[0].action = 'CHANGED'; ctx.auditLogs.unshift({ id: 'new' });
  })).toThrow('ORDER_PERSISTENCE_UNAVAILABLE');
  expect([ctx.notifications, ctx.auditLogs, ctx.orders, ctx.walletTransactions]).toEqual(collections);
  collections.forEach((collection, i) => expect([ctx.notifications, ctx.auditLogs, ctx.orders, ctx.walletTransactions][i]).toBe(collection));
  expect(ctx.notifications[0]).toBe(notification); expect(ctx.auditLogs[0]).toBe(audit); expect(ctx.orders[0]).toBe(order); expect(ctx.wallets.buyer).toBe(wallet);
  expect({ notifications: ctx.notifications, auditLogs: ctx.auditLogs, order, wallet }).toEqual(before);
});

it('safely initializes a partial context before snapshotting notification emissions and restores failed mutation callbacks', () => {
  const { ctx, order } = setup(); delete ctx.notifications;
  expect(() => persistOrderMutation(ctx, () => { freezeOrder(ctx, order, 1000); throw Error('after funding'); })).toThrow('after funding');
  expect(ctx.notifications).toEqual([]); expect(order).not.toHaveProperty('workflowVersion'); expect(ctx.wallets.buyer.balance).toBe(200);
  persistOrderMutation(ctx, () => freezeOrder(ctx, order, 1000)); const rows = ctx.notifications;
  expect(rows).toHaveLength(2); expect(ctx.notifications).toBe(rows);
});

it('preserves an existing persisted notification array on migration', () => {
  const notifications = [{ id: 'stored', eventKey: 'key' }];
  const state: any = migrateState({ ...defaultState(), schemaVersion: 12, notifications });
  expect(state.notifications).toBe(notifications); expect(state.notifications).toEqual([{ id: 'stored', eventKey: 'key' }]);
});

it('restores deadline notifications and funds on failed saving, then emits each expiry only once on retry', () => {
  const { ctx, order } = setup(); freezeOrder(ctx, order, 1000);
  const rows = ctx.notifications, first = rows[0], before = structuredClone(rows), wallet = ctx.wallets.buyer;
  ctx.persistState.mockImplementationOnce(() => { throw Error('disk'); });
  expect(() => expireOrders(ctx, 901000)).toThrow('ORDER_PERSISTENCE_UNAVAILABLE');
  expect(ctx.notifications).toBe(rows); expect(rows[0]).toBe(first); expect(rows).toEqual(before);
  expect(ctx.orders[0]).toBe(order); expect(order.status).toBe('CREATED'); expect(ctx.wallets.buyer).toBe(wallet); expect(wallet.balance).toBe(100);
  expireOrders(ctx, 901001); expireOrders(ctx, 901002);
  expect(rows.filter((n: any) => n.kind === 'ORDER_CANCELLED')).toHaveLength(2); expect(wallet.balance).toBe(200);
});

it.each(['refund', 'uphold'] as const)('persists administrative %s arbitration atomically and skips saves/audit/events on terminal replay', action => {
  const arbitrate = (escrow as any).arbitrateOrder;
  expect(typeof arbitrate).toBe('function');
  const { ctx, order } = setup(); freezeOrder(ctx, order, 1000);
  actOnOrder(ctx, order, 'provider', 'accept', {}, 2000);
  actOnOrder(ctx, order, 'provider', 'complete', { evidence: ['proof'] }, 3000);
  actOnOrder(ctx, order, 'buyer', 'dispute', { reason: 'Not delivered', evidence: ['proof'] }, 4000);
  const before = structuredClone({ order, notifications: ctx.notifications, auditLogs: ctx.auditLogs, wallets: ctx.wallets, diamondWallets: ctx.diamondWallets, walletTransactions: ctx.walletTransactions });
  const collections = [ctx.notifications, ctx.auditLogs, ctx.walletTransactions], existing = ctx.notifications[0], wallet = ctx.wallets.buyer;
  ctx.persistState.mockImplementationOnce(() => {
    expect(ctx.auditLogs).toHaveLength(1); expect(ctx.notifications).toHaveLength(10);
    expect(order.status).toBe(action === 'refund' ? 'REFUNDED' : 'COMPLETED'); throw Error('disk');
  });
  expect(() => arbitrate(ctx, order, 'admin', action, 5000)).toThrow('ORDER_PERSISTENCE_UNAVAILABLE');
  expect({ order, notifications: ctx.notifications, auditLogs: ctx.auditLogs, wallets: ctx.wallets, diamondWallets: ctx.diamondWallets, walletTransactions: ctx.walletTransactions }).toEqual(before);
  collections.forEach((collection, i) => expect([ctx.notifications, ctx.auditLogs, ctx.walletTransactions][i]).toBe(collection));
  expect(ctx.orders[0]).toBe(order); expect(ctx.notifications[0]).toBe(existing); expect(ctx.wallets.buyer).toBe(wallet);
  expect(arbitrate(ctx, order, 'admin', action, 5000)).toBe(order);
  expect(ctx.auditLogs).toHaveLength(1); expect(ctx.notifications).toHaveLength(10);
  expect(ctx.auditLogs[0]).toMatchObject({ action: `ORDER_ARBITRATION_${action === 'refund' ? 'REFUND' : 'UPHOLD'}`, targetId: 'o' });
  const saves = ctx.persistState.mock.calls.length;
  expect(arbitrate(ctx, order, 'admin', action, 5001)).toBe(order);
  expect(ctx.persistState).toHaveBeenCalledTimes(saves); expect(ctx.auditLogs).toHaveLength(1); expect(ctx.notifications).toHaveLength(10);
});

it('restores funded arbitration on a partially prepared audit failure without saving', () => {
  const arbitrate = (escrow as any).arbitrateOrder;
  expect(typeof arbitrate).toBe('function');
  const { ctx, order } = setup(); freezeOrder(ctx, order, 1000);
  actOnOrder(ctx, order, 'provider', 'accept', {}, 2000);
  actOnOrder(ctx, order, 'provider', 'complete', { evidence: ['proof'] }, 3000);
  actOnOrder(ctx, order, 'buyer', 'dispute', { reason: 'Not delivered', evidence: ['proof'] }, 4000);
  const before = structuredClone(ctx.notifications);
  ctx.appendAuditLog = () => { ctx.auditLogs.unshift({ id: 'partial' }); throw Error('audit'); };
  expect(() => arbitrate(ctx, order, 'admin', 'refund', 5000)).toThrow('audit');
  expect(order.status).toBe('DISPUTED'); expect(order.escrowState).toBe('FROZEN'); expect(ctx.wallets.buyer.balance).toBe(100);
  expect(ctx.auditLogs).toEqual([]); expect(ctx.notifications).toEqual(before); expect(ctx.persistState).not.toHaveBeenCalled();
});
