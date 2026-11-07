import { describe, expect, it } from 'vitest';
import { analyzeFinanceSnapshot } from '../../backend/finance/reconciliation.js';
import type { PersistedOrder } from '../../shared/orders.js';

const snapshot = () => ({ users: [{ id: 'u' }], wallets: {}, diamondWallets: {}, orders: [], withdrawalRequests: [], walletTransactions: [] } as any);
const codes = (s: unknown) => analyzeFinanceSnapshot(s).findings.map(f => f.code);
describe('read-only finance inventory', () => {
  it('rejects incomplete and malformed collections', () => {
    expect(codes(null)).toContain('INVALID_ROOT');
    expect(codes({})).toHaveLength(6);
    const s = snapshot(); s.users = [null]; expect(codes(s)).toContain('INVALID_ROW');
  });
  it('reports invalid balances and owner mismatches without echoing keys', () => {
    for (const collection of ['wallets', 'diamondWallets']) for (const balance of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, 'secret']) {
      const s = snapshot(); s[collection].secret = { userId: 'other', balance };
      expect(codes(s)).toContain('INVALID_BALANCE'); expect(codes(s)).toContain('WALLET_OWNER_MISMATCH');
      expect(JSON.stringify(analyzeFinanceSnapshot(s))).not.toContain('secret');
    }
  });
  it('flags duplicates in every ID collection and fractional historical orders', () => {
    for (const collection of ['users', 'orders', 'withdrawalRequests', 'walletTransactions']) {
      const s = snapshot(); s[collection] = [{ id: 'x' }, { id: 'x' }]; expect(codes(s)).toContain('DUPLICATE_ID');
    }
    const s = snapshot(); s.orders = [{ id: 'o', totalPrice: 1.2 }]; expect(codes(s)).toContain('FRACTIONAL_ORDER_AMOUNT');
  });
  it('validates withdrawal owner, status, amount and pending multiplicity', () => {
    const s = snapshot(); s.withdrawalRequests = [{ id: 'a', userId: 'missing', status: 'secret', diamondAmount: -1 }, { id: 'b', userId: 'u', status: 'PENDING', diamondAmount: 1 }, { id: 'c', userId: 'u', status: 'PENDING', diamondAmount: 1 }];
    expect(codes(s)).toEqual(expect.arrayContaining(['ORPHAN_WITHDRAWAL_OWNER', 'UNKNOWN_WITHDRAWAL_STATUS', 'INVALID_WITHDRAWAL_AMOUNT', 'MULTIPLE_PENDING_WITHDRAWALS']));
  });
  it.each(['PENDING', 'REJECTED', 'APPROVED'])('reviews %s debit relationships conservatively', status => {
    const s = snapshot(); s.withdrawalRequests = [{ id: 'w', userId: 'u', status, diamondAmount: 10 }];
    if (status === 'APPROVED') expect(codes(s)).toEqual(expect.arrayContaining(['APPROVED_PAYMENT_CONFIRMATION_REQUIRED', 'APPROVED_MISSING_DEBIT']));
    s.walletTransactions = [{ id: 't', userId: 'u', type: 'WITHDRAW', referenceId: 'w', amount: -10 }];
    expect(codes(s)).toContain(status === 'APPROVED' ? 'APPROVED_PAYMENT_CONFIRMATION_REQUIRED' : 'NON_APPROVED_WITHDRAWAL_DEBIT');
    s.walletTransactions.push({ id: 't2', userId: 'u', type: 'WITHDRAW', referenceId: 'w', amount: -9 }, { id: 't3', userId: 'other', type: 'WITHDRAW', referenceId: 'w', amount: -10 });
    expect(codes(s)).toEqual(expect.arrayContaining(['DUPLICATE_WITHDRAWAL_DEBITS', 'WITHDRAWAL_DEBIT_AMOUNT_MISMATCH', 'CROSS_OWNER_REFERENCE_COLLISION']));
  });
  it('does not trust ambiguous IDs or treat generic withdrawal references as orphan debits', () => {
    const s = snapshot(); s.walletTransactions = [{ id: 't', userId: 'u', type: 'WITHDRAW', referenceId: 'admin', amount: -1 }];
    expect(codes(s)).toEqual([]);
    s.users.push({ id: 'u' }); s.withdrawalRequests = [{ id: 'w', userId: 'u', status: 'APPROVED', diamondAmount: 1 }];
    expect(codes(s)).toContain('AMBIGUOUS_WITHDRAWAL_JOIN'); expect(codes(s)).not.toContain('APPROVED_MISSING_DEBIT');
  });
  it('suppresses trusted debit conclusions for duplicate withdrawals or transactions', () => {
    for (const collection of ['withdrawalRequests', 'walletTransactions']) {
      const s = snapshot(); s.withdrawalRequests = [{ id: 'w', userId: 'u', status: 'APPROVED', diamondAmount: 1 }];
      s.walletTransactions = [{ id: 't', userId: 'u', type: 'WITHDRAW', referenceId: 'w', amount: -1 }];
      s[collection].push({ ...s[collection][0] });
      expect(codes(s)).toContain('AMBIGUOUS_WITHDRAWAL_JOIN'); expect(codes(s)).not.toContain('DUPLICATE_WITHDRAWAL_DEBITS');
    }
  });
  it('is deterministic and does not mutate frozen inputs or assert full reconciliation', () => {
    const s = snapshot(); Object.values(s).forEach(Object.freeze); Object.freeze(s);
    expect(analyzeFinanceSnapshot(s)).toEqual(analyzeFinanceSnapshot(s));
    expect(analyzeFinanceSnapshot(s)).toMatchObject({ reportVersion: 1, fullReconciliation: false, scope: 'legacy-finance-inventory' });
  });
  it('handles hostile JSON-shaped status values without coercion or disclosure', () => {
    const s = snapshot(); s.withdrawalRequests = [{ id: 'w', userId: 'u', status: { toString: null, secret: 'PRIVATE_SENTINEL' }, diamondAmount: 1 }];
    expect(codes(s)).toContain('UNKNOWN_WITHDRAWAL_STATUS');
    expect(JSON.stringify(analyzeFinanceSnapshot(s))).not.toContain('PRIVATE_SENTINEL');
  });
  it('uses actual PersistedOrder totalPrice instead of nonexistent amount', () => {
    const order: PersistedOrder = { id: 'o', userId: 'u', companionId: 'c', serviceName: 'game', quantity: 1, unitPrice: 10, totalPrice: 10, status: 'CREATED', createdAt: 1 };
    const s = snapshot(); s.orders = [order]; expect(codes(s)).toEqual([]);
    order.totalPrice = 1.25; expect(codes(s)).toContain('FRACTIONAL_ORDER_AMOUNT');
  });
  it('reports malformed transaction types and present owner/reference fields without disclosure', () => {
    for (const type of [undefined, null, {}, 'PRIVATE_UNKNOWN_TYPE']) {
      const s = snapshot(); s.walletTransactions = [{ id: 't', amount: -10, type }];
      expect(codes(s)).toContain('INVALID_TRANSACTION_TYPE');
    }
    for (const field of ['userId', 'referenceId']) for (const value of [null, {}, '', 12]) {
      const s = snapshot(); s.walletTransactions = [{ id: 't', amount: -10, type: 'WITHDRAW', userId: 'u', referenceId: 'admin', [field]: value, description: 'PRIVATE_SENTINEL' }];
      expect(codes(s)).toContain(field === 'userId' ? 'INVALID_TRANSACTION_OWNER' : 'INVALID_TRANSACTION_REFERENCE');
      expect(JSON.stringify(analyzeFinanceSnapshot(s))).not.toContain('PRIVATE_SENTINEL');
    }
  });
  it('reviews absent WITHDRAW attribution but permits optional fields on generic legacy rows', () => {
    const s = snapshot(); s.walletTransactions = [{ id: 't', type: 'WITHDRAW', amount: -10 }];
    expect(codes(s)).toEqual(expect.arrayContaining(['UNATTRIBUTED_WITHDRAWAL_OWNER', 'UNATTRIBUTED_WITHDRAWAL_REFERENCE']));
    expect(codes(s)).not.toContain('APPROVED_MISSING_DEBIT');
    s.walletTransactions = [{ id: 't', type: 'ADMIN_ADJUST', amount: 10 }]; expect(codes(s)).toEqual([]);
    s.walletTransactions = [{ id: 't', type: 'WITHDRAW', amount: -10, userId: 'u', referenceId: 'generic-admin-reference' }]; expect(codes(s)).toEqual([]);
  });
});
