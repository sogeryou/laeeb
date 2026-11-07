import { describe, expect, it } from 'vitest';
import { quoteWithdrawalUsd, createWithdrawal, transitionWithdrawal } from '../../backend/finance/withdrawalDomain.js';

const owner = { kind: 'owner', userId: 'u' } as const;
const finance = { kind: 'finance', userId: 'f' } as const;
const apply = (overrides: any = {}) => createWithdrawal({ id: 'w', userId: 'u', usd: '20.02', address: 'opaque-address', now: 1, wallet: { available: 5000, frozen: 0 }, existingTickets: [], ...overrides });
const move = (state: any, command: any, actor: any = finance, overrides: any = {}) => transitionWithdrawal({ ...state, command, actor, now: state.ticket.updatedAt + 1, expectedVersion: state.ticket.revision, ...overrides });
const code = (fn: () => unknown, expected: string) => { try { fn(); throw new Error('Expected domain rejection'); } catch (error) { expect(error).toMatchObject({ code: expected }); } };
function freeze<T>(value: T): T { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }

describe('withdrawal quotation', () => {
  it('quotes exact integer diamonds with no platform fee', () => {
    expect(quoteWithdrawalUsd('20')).toEqual({ cents: 2000, diamondAmount: 3000, grossUsdt: '20.00', platformFeeUsdt: '0' });
    expect(quoteWithdrawalUsd('20.02').diamondAmount).toBe(3003);
  });
  it.each(['20.001', 'NaN', '2e1', '+20', '-20', '', ' 20', '20 ', '.20', '20.', 'Infinity', '9'.repeat(200)])('rejects malformed or excessive USD %s', usd => code(() => quoteWithdrawalUsd(usd), 'INVALID_USD'));
  it('rejects below-minimum, unsafe values and odd-cent quotes with suggestions', () => {
    code(() => quoteWithdrawalUsd('19.98'), 'BELOW_MINIMUM');
    code(() => quoteWithdrawalUsd('90071992547409.92'), 'UNSAFE_AMOUNT');
    code(() => quoteWithdrawalUsd('60047995031606.62'), 'UNSAFE_AMOUNT');
    code(() => quoteWithdrawalUsd('60047995031606.61'), 'UNSAFE_AMOUNT');
    expect(() => quoteWithdrawalUsd('20.01')).toThrowError(expect.objectContaining({ code: 'INVALID_STEP', suggestions: ['20.00', '20.02'] }));
  });
});

describe('withdrawal lifecycle', () => {
  it('reserves once and creates an immutable versioned ticket', () => {
    const input = freeze({ id: 'w', userId: 'u', usd: '20.02', address: 'a', now: 1, wallet: { available: 5000, frozen: 7 }, existingTickets: [] });
    const result = createWithdrawal(input);
    expect(result.wallet).toEqual({ available: 1997, frozen: 3010 });
    expect(result.ticket).toMatchObject({ schemaVersion: 1, revision: 0, status: 'PENDING_REVIEW', createdAt: 1, updatedAt: 1 });
    expect(input.wallet).toEqual({ available: 5000, frozen: 7 });
  });
  it.each(['PENDING_REVIEW', 'APPROVED_AWAITING_PAYMENT', 'PAYMENT_UNKNOWN'])('blocks same user active ticket in %s', status => {
    let state = apply();
    if (status !== 'PENDING_REVIEW') state = move(state, { type: 'APPROVE' });
    if (status === 'PAYMENT_UNKNOWN') state = move(state, { type: 'MARK_UNKNOWN', reason: 'investigate' });
    code(() => apply({ existingTickets: [state.ticket] }), 'ACTIVE_TICKET');
    expect(apply({ id: 'other', userId: 'other', existingTickets: [state.ticket] }).ticket.userId).toBe('other');
  });
  it.each([{ available: 2999, frozen: 0 }, { available: -1, frozen: 0 }, { available: 5000.1, frozen: 0 }, { available: 5000, frozen: -1 }, { available: Number.MAX_SAFE_INTEGER + 1, frozen: 0 }])('rejects invalid or insufficient wallet %o', wallet => expect(() => apply({ wallet })).toThrow());
  it('approval leaves wallet unchanged, pending cancellation/rejection releases once', () => {
    const state = freeze(apply());
    expect(move(state, { type: 'APPROVE' }).wallet).toEqual(state.wallet);
    for (const command of [{ type: 'CANCEL' }, { type: 'REJECT', reason: 'manual review' }]) {
      const result = move(state, command, command.type === 'CANCEL' ? owner : finance);
      expect(result.wallet).toEqual({ available: 5000, frozen: 0 });
      expect(result.ticket.events).toHaveLength(state.ticket.events.length + 1);
      code(() => move(result, command, command.type === 'CANCEL' ? owner : finance), 'TERMINAL_TICKET');
    }
    expect(state.ticket.status).toBe('PENDING_REVIEW');
  });
  it('enforces owner/finance capabilities and stale version', () => {
    const state = apply();
    code(() => move(state, { type: 'APPROVE' }, owner), 'FORBIDDEN');
    code(() => move(state, { type: 'CANCEL' }, { kind: 'owner', userId: 'other' }), 'FORBIDDEN');
    code(() => move(state, { type: 'CANCEL' }, finance), 'FORBIDDEN');
    code(() => move(state, { type: 'APPROVE' }, finance, { expectedVersion: 1 }), 'STALE_VERSION');
  });
  it('forbids cancellation after approval and retry after unknown', () => {
    const approved = move(apply(), { type: 'APPROVE' });
    code(() => move(approved, { type: 'CANCEL' }, owner), 'INVALID_TRANSITION');
    const unknown = move(approved, { type: 'MARK_UNKNOWN', reason: 'timeout' });
    expect(unknown.wallet).toEqual(approved.wallet);
    code(() => move(unknown, { type: 'APPROVE' }), 'INVALID_TRANSITION');
    expect(move(unknown, { type: 'CLOSE_UNPAID', nonpaymentEvidence: 'confirmed absent' }).wallet).toEqual({ available: 5000, frozen: 0 });
  });
  it.each(['APPROVED_AWAITING_PAYMENT', 'PAYMENT_UNKNOWN'])('pays from %s consuming only its reserve', status => {
    let state = move(apply({ wallet: { available: 5000, frozen: 7 } }), { type: 'APPROVE' });
    if (status === 'PAYMENT_UNKNOWN') state = move(state, { type: 'MARK_UNKNOWN', reason: 'timeout' });
    freeze(state);
    const result = move(state, { type: 'CONFIRM_PAID', actualChainFeeUsdt: '1', paymentProof: 'proof' });
    expect(result.wallet).toEqual({ available: 1997, frozen: 7 });
    expect(result.ticket.payout).toEqual({ actualChainFeeUsdt: '1', netUsdt: '19.02', paymentProof: 'proof' });
    code(() => move(result, { type: 'CONFIRM_PAID', actualChainFeeUsdt: '1', paymentProof: 'proof' }), 'TERMINAL_TICKET');
    expect(state.wallet.frozen).toBe(3010);
  });
  it('rejects pending payment and missing evidence/reasons', () => {
    code(() => move(apply(), { type: 'CONFIRM_PAID', actualChainFeeUsdt: '0', paymentProof: 'proof' }), 'INVALID_TRANSITION');
    for (const command of [{ type: 'REJECT', reason: '' }, { type: 'MARK_UNKNOWN', reason: '' }, { type: 'CLOSE_UNPAID', nonpaymentEvidence: '' }, { type: 'CONFIRM_PAID', actualChainFeeUsdt: '0', paymentProof: '' }]) {
      expect(() => move(command.type === 'REJECT' ? apply() : move(apply(), { type: 'APPROVE' }), command)).toThrow();
    }
  });
  it.each(['-1', 'NaN', 'Infinity', '1e-2', '', '20.02', '21', ' 1', '+1', '.1'])('rejects invalid fee %s without mutation', actualChainFeeUsdt => {
    const state = freeze(move(apply(), { type: 'APPROVE' }));
    code(() => move(state, { type: 'CONFIRM_PAID', actualChainFeeUsdt, paymentProof: 'proof' }), 'INVALID_FEE');
    expect(state.wallet).toEqual({ available: 1997, frozen: 3003 });
  });
  it('preserves exact tiny fee precision and accepts zero fee', () => {
    const state = move(apply(), { type: 'APPROVE' });
    expect(move(state, { type: 'CONFIRM_PAID', actualChainFeeUsdt: '0', paymentProof: 'proof' }).ticket.payout?.netUsdt).toBe('20.02');
    expect(move(state, { type: 'CONFIRM_PAID', actualChainFeeUsdt: '0.0000000000000000000000000000000000000001', paymentProof: 'proof' }).ticket.payout?.netUsdt).toBe('20.0199999999999999999999999999999999999999');
  });
  it('rejects insufficient reserve, release overflow, backwards time and unsafe revisions', () => {
    const state = apply();
    code(() => move({ ...state, wallet: { available: 1997, frozen: 3002 } }, { type: 'APPROVE' }), 'INSUFFICIENT_RESERVE');
    expect(() => move({ ...state, wallet: { available: Number.MAX_SAFE_INTEGER, frozen: 3003 } }, { type: 'CANCEL' }, owner)).toThrow();
    expect(() => move(state, { type: 'APPROVE' }, finance, { now: 0 })).toThrow();
    expect(() => move({ ...state, ticket: { ...state.ticket, revision: Number.MAX_SAFE_INTEGER } }, { type: 'APPROVE' })).toThrow();
  });
  it.each([
    (t: any) => ({ ...t, schemaVersion: 2 }),
    (t: any) => ({ ...t, quote: { ...t.quote, diamondAmount: 1 } }),
    (t: any) => ({ ...t, quote: { ...t.quote, cents: 2000.5 } }),
    (t: any) => ({ ...t, address: '' }),
    (t: any) => ({ ...t, events: [] }),
    (t: any) => ({ ...t, status: 'FAKE' }),
  ])('rejects corrupt persisted tickets', corrupt => {
    const state = apply();
    code(() => move({ ...state, ticket: corrupt(state.ticket) }, { type: 'APPROVE' }), 'INVALID_TICKET');
    expect(() => apply({ existingTickets: [corrupt(state.ticket)] })).toThrow();
  });
  it('validates runtime metadata and does not accept immutable-field command overrides', () => {
    for (const patch of [{ id: '' }, { userId: '' }, { address: '' }, { now: NaN }, { now: 1.5 }, { now: -1 }, { existingTickets: null }]) expect(() => apply(patch)).toThrow();
    const state = freeze(apply());
    const result = move(state, { type: 'APPROVE', address: 'evil', userId: 'evil', quote: {} });
    expect(result.ticket.address).toBe(state.ticket.address);
    expect(result.ticket.userId).toBe('u');
    expect(result.ticket.quote).toEqual(state.ticket.quote);
  });
  it('returns only documented event fields, without aliasing untrusted nested metadata', () => {
    const state = apply();
    (state.ticket.events[0] as any).extra = { sensitive: 'input' };
    (state.ticket.quote as any).extra = { sensitive: 'input' };
    const result = move(state, { type: 'APPROVE' });
    expect(result.ticket.events[0]).not.toHaveProperty('extra');
    expect(result.ticket.quote).not.toHaveProperty('extra');
    result.ticket.events[0].actor.userId = 'changed';
    expect(state.ticket.events[0].actor.userId).toBe('u');
  });
  it('rejects noncanonical quotes and corrupted command history, timestamps, actors and payout', () => {
    const approved = move(apply(), { type: 'APPROVE' });
    const variants = [
      { ...approved.ticket, quote: { ...approved.ticket.quote, grossUsdt: '020.02' } },
      { ...approved.ticket, payout: { actualChainFeeUsdt: '0', netUsdt: '20.02', paymentProof: 'fake' } },
      { ...approved.ticket, revision: 1.5 },
      { ...approved.ticket, updatedAt: 0 },
      { ...approved.ticket, events: approved.ticket.events.map((e: any, i: number) => i === 1 ? { ...e, actor: owner } : e) },
      { ...approved.ticket, events: approved.ticket.events.map((e: any, i: number) => i === 1 ? { ...e, at: 0 } : e) },
      { ...approved.ticket, events: approved.ticket.events.map((e: any, i: number) => i === 1 ? { ...e, command: { type: 'CONFIRM_PAID', actualChainFeeUsdt: '0', paymentProof: 'fake' } } : e) },
    ];
    for (const ticket of variants) code(() => move({ ...approved, ticket }, { type: 'CLOSE_UNPAID', nonpaymentEvidence: 'none' }), 'INVALID_TICKET');
  });
  it('conserves total through all nonpayment paths, rejects short reserves on every transition', () => {
    const initial = apply({ wallet: { available: 5000, frozen: 19 } });
    const approved = move(initial, { type: 'APPROVE' });
    const unknown = move(approved, { type: 'MARK_UNKNOWN', reason: 'timeout' });
    const paths = [
      [initial, { type: 'CANCEL' }, owner], [initial, { type: 'REJECT', reason: 'review' }, finance],
      [initial, { type: 'APPROVE' }, finance], [approved, { type: 'MARK_UNKNOWN', reason: 'timeout' }, finance],
      [approved, { type: 'CLOSE_UNPAID', nonpaymentEvidence: 'none' }, finance],
      [unknown, { type: 'CLOSE_UNPAID', nonpaymentEvidence: 'none' }, finance],
    ] as const;
    for (const [state, command, actor] of paths) {
      const result = move(freeze(state), command, actor);
      expect(result.wallet.available + result.wallet.frozen).toBe(5019);
      code(() => move({ ...state, wallet: { available: 1997, frozen: 3002 } }, command, actor), 'INSUFFICIENT_RESERVE');
    }
    const paid = move(unknown, { type: 'CONFIRM_PAID', actualChainFeeUsdt: '0', paymentProof: 'proof' });
    expect(paid.wallet.available + paid.wallet.frozen).toBe(2016);
  });
  it('requires runtime string types, sane actor and bounded identifiers/evidence', () => {
    for (const value of [null, undefined, 20, {}, [], true]) code(() => quoteWithdrawalUsd(value as any), 'INVALID_USD');
    for (const patch of [{ id: 'x'.repeat(129) }, { address: 'x'.repeat(513) }, { userId: 'x'.repeat(129) }, { now: Infinity }, { now: Number.MAX_SAFE_INTEGER + 1 }, { wallet: null }]) expect(() => apply(patch)).toThrow();
    const state = apply();
    for (const actor of [null, { kind: 'admin', userId: 'f' }, { kind: 'finance', userId: '' }]) expect(() => move(state, { type: 'APPROVE' }, actor)).toThrow();
    code(() => move(state, { type: 'REJECT', reason: 'x'.repeat(4097) }), 'INVALID_COMMAND');
    code(() => move(state, { type: 'FAKE' }), 'INVALID_COMMAND');
    expect(() => apply({ wallet: { available: 5000, frozen: Number.MAX_SAFE_INTEGER } })).toThrow();
  });
  it('allows another application after terminal status but not reused ticket id', () => {
    const terminal = move(apply(), { type: 'CANCEL' }, owner);
    expect(apply({ id: 'new', existingTickets: [terminal.ticket] }).ticket.id).toBe('new');
    code(() => apply({ existingTickets: [terminal.ticket] }), 'DUPLICATE_ID');
  });
});
