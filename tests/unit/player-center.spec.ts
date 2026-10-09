import { describe, expect, it } from 'vitest';
import { periodRange, buildAnalytics } from '../../backend/player-center/analytics.js';
import { previewSettlement, taskPoints } from '../../backend/player-center/level.js';

describe('player center PRD rules', () => {
  it('uses Riyadh Monday midnight, not UTC midnight', () => {
    expect(periodRange('WEEK', Date.parse('2026-09-20T22:00Z'), 'Asia/Riyadh').start)
      .toBe(Date.parse('2026-09-20T21:00Z'));
  });
  it('supports DST calendar boundaries', () => {
    const range = periodRange('DAY', Date.parse('2026-03-08T20:00Z'), 'America/New_York');
    expect(range.end - range.start).toBe(23 * 3600000);
  });
  const now = Date.parse('2026-09-20T12:00Z');
  const order = (id: string, userId: string, days: number, settled = true) => ({
    id, userId, companionId: 'cp', serviceName: 'Game', totalPrice: 100,
    status: 'COMPLETED', settlementDone: settled, completedAt: now - days * 86400000,
    createdAt: now - days * 86400000, unitPrice: 100, quantity: 1,
  });
  const source = {
    companions: [{ id: 'cp', userId: 'player' }],
    users: [{ id: 'old', username: 'Old', email: 'private@test' }, { id: 'new', username: 'New' }],
    orders: [order('past', 'old', 10), order('current', 'old', 1), order('first', 'new', 2), order('repeat', 'new', 1), order('pending', 'other', 0, false)],
    reviews: [{ id: 'r', orderId: 'first', rating: 5, status: 'APPROVED', createdAt: now - 100 }],
    walletTransactions: ['past', 'current', 'first', 'repeat'].map((referenceId, i) => ({ id: `t${i}`, userId: 'player', type: 'INCOME', referenceId, amount: 100, timestamp: now - (i === 0 ? 10 : 1) * 86400000 })),
  };
  it('excludes unsettled orders and gives mutually exclusive period cohorts', () => {
    const result = buildAnalytics(source as any, 'player', 'WEEK', now, 'Asia/Riyadh');
    expect(result.income.total).toBe(300);
    expect(result.customers.counts).toEqual({ total: 2, new: 1, old: 1 });
    expect(result.tasks.newCustomers).toBe(1);
    expect(result.tasks.repeatCustomers).toBe(2);
    expect(JSON.stringify(result.customers.items)).not.toContain('private@test');
    expect(result.customers.items.find(c => c.id === 'new')?.rating).toBe(5);
  });
  it('ALL has no OLD customers and no invented income when ledger is missing', () => {
    const result = buildAnalytics({ ...source, walletTransactions: [] } as any, 'player', 'ALL', now, 'Asia/Riyadh');
    expect(result.customers.counts).toEqual({ total: 0, new: 0, old: 0 });
    expect(result.income.total).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it('does not leak another companion data', () => {
    expect(buildAnalytics(source as any, 'stranger', 'ALL', now, 'Asia/Riyadh').customers.items).toEqual([]);
  });
  it('uses actual settlement time, deduplicates ledger IDs and masks restricted users', () => {
    const ledger = { id: 'late', userId: 'player', type: 'INCOME', referenceId: 'past', amount: 80, timestamp: now - 1000 };
    const result = buildAnalytics({ ...source, users: [{ id: 'old', username: 'Hidden', accountStatus: 'FROZEN' }], walletTransactions: [ledger, ledger] } as any, 'player', 'WEEK', now, 'Asia/Riyadh');
    expect(result.income.total).toBe(80);
    expect(result.customers.counts).toEqual({ total: 1, new: 1, old: 0 });
    expect(result.customers.items[0].name).toBe('Unavailable user');
  });
  it('keeps services with the same name but distinct IDs separate', () => {
    const result = buildAnalytics({ ...source, orders: source.orders.map((o, i) => ({ ...o, serviceId: `service-${i}` })) } as any, 'player', 'ALL', now, 'Asia/Riyadh');
    expect(result.income.services).toHaveLength(4);
    expect(result.customers.services).toHaveLength(4);
  });
  it('upgrades at most once and waives decay on qualifying upgrades', () => {
    expect(previewSettlement({ level: 1, score: 190, points: 700, income: 5000, noOrderWeeks: 0, hasOrders: true, lv1Weeks: 0 }))
      .toMatchObject({ level: 2, score: 890, decay: 0, penalty: 0 });
  });
  it('blocks upgrade without income and applies decay before weekly points', () => {
    expect(previewSettlement({ level: 2, score: 390, points: 40, income: 299, noOrderWeeks: 0, hasOrders: true, lv1Weeks: 0 }))
      .toMatchObject({ level: 2, score: 414, decay: 16 });
  });
  it('downgrades at most once and suspends after four LV1 settlements', () => {
    expect(previewSettlement({ level: 6, score: 0, points: 0, income: 0, noOrderWeeks: 8, hasOrders: false, lv1Weeks: 0 }).level).toBe(5);
    expect(previewSettlement({ level: 1, score: 0, points: 0, income: 0, noOrderWeeks: 3, hasOrders: false, lv1Weeks: 3 }))
      .toMatchObject({ penalty: 200, suspend: true, lv1Weeks: 0 });
  });
  it('freezes full suspended weeks and does not reward missing samples', () => {
    expect(previewSettlement({ level: 1, score: 0, points: 0, income: 0, noOrderWeeks: 2, hasOrders: false, lv1Weeks: 0, suspendedFullWeek: true }))
      .toMatchObject({ noOrderWeeks: 2, penalty: 0, score: 0 });
    expect(taskPoints({ newCustomers: 0, repeatCustomers: 0, ratingStars: 0, income: 0, giftIncome: 0 }).total).toBe(0);
    expect(taskPoints({ newCustomers: 20, repeatCustomers: 30, ratingStars: 150, income: 10000, giftIncome: 1000 }).service).toBe(550);
  });
});
