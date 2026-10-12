import { act, createElement } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { businessApi } from '../../client/services/businessApi';
import { useOrders } from '../../client/hooks/useOrders';
import { blocksCompanionCheckout, toIMOrder } from '../../client/services/orderPresentation';
import type { BusinessOrder } from '../../shared/orders';
import { AUTH_SESSION_EVENT } from '../../client/features/auth/session';

const order = (id = 'one'): BusinessOrder => ({ id, userId: 'buyer', companionId: 'cp', serviceName: 'PUBG Mobile', unit: 'hr', quantity: 2, unitPrice: 25, totalPrice: 50, status: 'CREATED', createdAt: 1, updatedAt: 1, workflowVersion: 2, role: 'BUYER', participant: { id: 'cp', userId: 'player', name: 'Player', avatarUrl: '', rating: 0, orderCount: '0', price: 25, game: 'PUBG Mobile', tags: [] }, reviewed: false });
let state: ReturnType<typeof useOrders>;
let root: ReactTestRenderer;
const changed = vi.fn(async () => {});
it('only blocks checkout for funded buyer orders in canonical active states', () => {
  expect(blocksCompanionCheckout(toIMOrder({ ...order(), workflowVersion: undefined }), 'cp')).toBe(false);
  for (const status of ['CREATED', 'IN_SERVICE', 'AWAITING_CONFIRMATION', 'DISPUTED'] as const) {
    expect(blocksCompanionCheckout(toIMOrder({ ...order(), status }), 'cp')).toBe(true);
  }
  for (const status of ['ACCEPTED', 'COMPLETED', 'CANCELLED', 'REFUNDED'] as const) {
    expect(blocksCompanionCheckout(toIMOrder({ ...order(), status }), 'cp')).toBe(false);
  }
  expect(blocksCompanionCheckout(toIMOrder({ ...order(), role: 'COMPANION' }), 'cp')).toBe(false);
  expect(blocksCompanionCheckout(toIMOrder(order()), 'another')).toBe(false);
});
function Harness({ token = 'a', userId = 'buyer', active = false }: { token?: string | null; userId?: string; active?: boolean }) { state = useOrders(token, userId, active, changed); return null; }
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setInterval, clearInterval }));
  vi.stubGlobal('document', { visibilityState: 'visible' });
  vi.spyOn(businessApi, 'listOrders').mockResolvedValue([order()]);
  vi.spyOn(businessApi, 'listCoupons').mockResolvedValue([]);
});
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); changed.mockClear(); });
it('hydrates real orders and preserves canonical states in the original display adapter', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  expect(state.items.map(o => o.id)).toEqual(['one']);
  const awaiting = toIMOrder({ ...order(), status: 'AWAITING_CONFIRMATION' });
  expect(awaiting.status).toBe('ONGOING');
  expect(awaiting.businessStatus).toBe('AWAITING_CONFIRMATION');
  expect(awaiting.participant?.userId).toBe('player');
  expect(toIMOrder({ ...order(), status: 'REFUNDED' }).status).toBe('CANCELLED');
});
it('clears private data immediately on account change and ignores a late old response', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  let resolveOld!: (value: BusinessOrder[]) => void;
  vi.mocked(businessApi.listOrders).mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce([]);
  let refreshing!: Promise<void>;
  await act(async () => { refreshing = state.refresh(); });
  await act(async () => { root.update(createElement(Harness, { token: 'b', userId: 'another' })); });
  expect(state.items).toEqual([]);
  await act(async () => { resolveOld([order('private')]); await refreshing; });
  expect(state.items).toEqual([]);
});
it('locks duplicate create clicks and applies only the persisted result', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  let complete!: (value: BusinessOrder) => void;
  const createOrder = vi.spyOn(businessApi, 'createOrder').mockReturnValue(new Promise(resolve => { complete = resolve; }));
  const input = { companionId: 'cp', quantity: 2, requestId: 'same', expectedTotal: 50 };
  let first!: Promise<BusinessOrder | null>;
  await act(async () => { first = state.create(input); expect(await state.create(input)).toBeNull(); });
  expect(createOrder).toHaveBeenCalledTimes(1);
  expect(state.pendingId).toBe('create');
  await act(async () => { complete(order('funded')); await first; });
  expect(state.items.some(o => o.id === 'funded')).toBe(true);
  expect(changed).toHaveBeenCalledTimes(1);
  expect(state.pendingId).toBeNull();
});
it('does not restore an old mutation or trigger wallet refresh after logout', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  let complete!: (value: BusinessOrder) => void;
  vi.spyOn(businessApi, 'updateOrder').mockReturnValue(new Promise(resolve => { complete = resolve; }));
  let action!: Promise<BusinessOrder | null>;
  await act(async () => { action = state.act('one', 'cancel'); });
  await act(async () => root.update(createElement(Harness, { token: null })));
  await act(async () => { complete({ ...order(), status: 'CANCELLED' }); expect(await action).toBeNull(); });
  expect(state.items).toEqual([]); expect(changed).not.toHaveBeenCalled();
});
it('retains private orders on token rotation but rejects the old snapshot', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  vi.mocked(businessApi.listOrders).mockImplementationOnce(() => new Promise(() => {}));
  await act(async () => root.update(createElement(Harness, { token: 'rotated' })));
  expect(state.items.map(o => o.id)).toEqual(['one']);
});
it('retains entered feedback and moderation result on a persisted review', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  const saved = { id: 'r1', orderId: 'one', userId: 'buyer', companionId: 'cp', rating: 4, content: 'Good game', tags: ['Friendly'], status: 'APPROVED' as const, createdAt: 4 };
  vi.spyOn(businessApi, 'createReview').mockResolvedValue(saved);
  await act(async () => { expect(await state.review('one', 4, 'Good game', ['Friendly'])).toEqual(saved); });
  expect(state.items[0].reviewed).toBe(true);
  expect(state.items[0].review?.content).toBe('Good game');
});
it('still reports a saved order as successful when a balance refresh fails', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  vi.spyOn(businessApi, 'createOrder').mockResolvedValue(order('paid'));
  changed.mockRejectedValueOnce(new Error('wallet read unavailable'));
  await act(async () => { expect((await state.create({ companionId: 'cp', quantity: 2, requestId: 'paid' }))?.id).toBe('paid'); });
  expect(state.items[0].id).toBe('paid');
  expect(state.error).toBe('');
});
it('removes a successfully redeemed coupon from checkout choices', async () => {
  vi.mocked(businessApi.listCoupons).mockResolvedValue([{ id: 'grant', name: 'Welcome', type: 'FIXED', discount: 5 }]);
  await act(async () => { root = create(createElement(Harness)); });
  vi.spyOn(businessApi, 'createOrder').mockResolvedValue(order('paid'));
  await act(async () => { await state.create({ companionId: 'cp', quantity: 2, requestId: 'paid', couponGrantId: 'grant' }); });
  expect(state.coupons).toEqual([]);
});
it('reloads coupons on checkout entry after initial profile-gated reads failed', async () => {
  vi.mocked(businessApi.listCoupons).mockRejectedValueOnce(new Error('PROFILE_INCOMPLETE'));
  await act(async () => { root = create(createElement(Harness)); });
  expect(state.coupons).toEqual([]);
  const grant = { id: 'grant', name: 'Welcome', type: 'FIXED' as const, discount: 5 };
  vi.mocked(businessApi.listCoupons).mockResolvedValue([grant]);
  await act(async () => root.update(createElement(Harness, { active: true })));
  expect(state.coupons).toEqual([grant]);
});
it('does not overwrite a saved mutation with a snapshot begun before it', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  let finish!: (value: BusinessOrder[]) => void;
  vi.mocked(businessApi.listOrders).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  vi.spyOn(businessApi, 'updateOrder').mockResolvedValue({ ...order(), status: 'CANCELLED' });
  let pending!: Promise<void>;
  await act(async () => { pending = state.refresh(); await state.act('one', 'cancel'); });
  await act(async () => { finish([order()]); await pending; });
  expect(state.items[0].status).toBe('CANCELLED');
});
it('keeps the payment lock and saved result through same-account token rotation', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  let finish!: (value: BusinessOrder) => void;
  const createOrder = vi.spyOn(businessApi, 'createOrder').mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  let first!: Promise<BusinessOrder | null>;
  await act(async () => { first = state.create({ companionId: 'cp', quantity: 2, requestId: 'original' }); });
  await act(async () => root.update(createElement(Harness, { token: 'rotated' })));
  expect(state.pendingId).toBe('create');
  await act(async () => { expect(await state.create({ companionId: 'cp', quantity: 2, requestId: 'another' })).toBeNull(); });
  await act(async () => { finish(order('funded')); expect((await first)?.id).toBe('funded'); });
  expect(createOrder).toHaveBeenCalledTimes(1); expect(changed).toHaveBeenCalledTimes(1);
  expect(state.items[0].id).toBe('funded');
});
it('never restores a redeemed coupon from a late pre-redemption read', async () => {
  const grant = { id: 'grant', name: 'Welcome', type: 'FIXED' as const, discount: 5 };
  vi.mocked(businessApi.listCoupons).mockResolvedValue([grant]);
  await act(async () => { root = create(createElement(Harness)); });
  let finish!: (value: typeof grant[]) => void;
  vi.mocked(businessApi.listCoupons).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await act(async () => root.update(createElement(Harness, { token: 'rotated' })));
  vi.spyOn(businessApi, 'createOrder').mockResolvedValue(order('paid'));
  await act(async () => { await state.create({ companionId: 'cp', quantity: 2, requestId: 'paid', couponGrantId: 'grant' }); });
  await act(async () => finish([grant]));
  expect(state.coupons).toEqual([]);
});
it('rejects a mutation response after leaving an account and signing back into it', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  let finish!: (value: BusinessOrder) => void;
  vi.spyOn(businessApi, 'updateOrder').mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  let first!: Promise<BusinessOrder | null>;
  await act(async () => { first = state.act('one', 'cancel'); });
  await act(async () => root.update(createElement(Harness, { token: 'b', userId: 'other' })));
  await act(async () => root.update(createElement(Harness, { token: 'new-a' })));
  await act(async () => { finish({ ...order(), status: 'CANCELLED' }); expect(await first).toBeNull(); });
  expect(changed).not.toHaveBeenCalled();
});
it('invalidates the pending mutation through token-only logout and same-owner login', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  let finish!: (value: BusinessOrder) => void;
  vi.spyOn(businessApi, 'updateOrder').mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  let first!: Promise<BusinessOrder | null>;
  await act(async () => { first = state.act('one', 'cancel'); });
  await act(async () => root.update(createElement(Harness, { token: null })));
  await act(async () => root.update(createElement(Harness, { token: 'new-a' })));
  expect(state.pendingId).toBeNull();
  await act(async () => { finish({ ...order(), status: 'CANCELLED' }); expect(await first).toBeNull(); });
  expect(changed).not.toHaveBeenCalled();
  expect(state.items[0].status).toBe('CREATED');
});
it('exposes the actual rejection immediately so checkout can distinguish it from an ambiguous response', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  vi.spyOn(businessApi, 'createOrder').mockRejectedValueOnce(new Error('WALLET_INSUFFICIENT_BALANCE'));
  await act(async () => {
    const beforeRender = state;
    expect(await beforeRender.create({ companionId: 'cp', quantity: 2, requestId: 'failed' })).toBeNull();
    expect(beforeRender.getError()).toBe('WALLET_INSUFFICIENT_BALANCE');
  });
  await act(async () => root.update(createElement(Harness, { token: 'other', userId: 'other' })));
  expect(state.getError()).toBe('');
});
it('rejects a pending mutation immediately on a logout event before props update', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  let finish!: (value: BusinessOrder) => void;
  vi.spyOn(businessApi, 'updateOrder').mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  let first!: Promise<BusinessOrder | null>;
  await act(async () => { first = state.act('one', 'cancel'); });
  window.dispatchEvent(Object.assign(new Event(AUTH_SESSION_EVENT), { detail: { token: null, user: { id: 'buyer' } } }));
  await act(async () => { finish({ ...order(), status: 'CANCELLED' }); expect(await first).toBeNull(); });
  expect(changed).not.toHaveBeenCalled();
  expect(state.items[0].status).toBe('CREATED');
});
