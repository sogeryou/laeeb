import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderConfirmView } from '../../client/views/OrderConfirmView';
import { MyOrdersView } from '../../client/views/MyOrdersView';
import { ImView } from '../../client/views/ImView';
import { ViewOverlays } from '../../client/views/ViewOverlays';
import { orderError } from '../../client/components/orders/orderError';

let app: any;
vi.mock('../../client/app/AppContext', () => ({ useApp: () => app }));
vi.mock('motion/react', () => {
  const components = new Map<string, React.ComponentType<any>>();
  return {
    AnimatePresence: ({ children }: any) => children,
    motion: new Proxy({}, { get: (_, tag: string) => {
      if (!components.has(tag)) components.set(tag, ({ children, ...props }: any) => React.createElement(tag, props, children));
      return components.get(tag);
    } }),
  };
});

const participant = { id: 'real-peer', name: 'Real participant', avatarUrl: '/avatar.jpg', services: [
  { id: 'service-one', name: 'Configured service', variants: [{ name: 'Fake variant', price: 999, unit: 'Fake unit' }] },
  { id: 'service-two', name: 'Other service', variants: [{ name: 'Other variant', price: 888, unit: 'Fake unit' }] },
] };
const quote = { companionId: participant.id, serviceId: 'service-one', serviceName: 'Quoted service', unit: 'Hour', quantity: 1, unitPrice: 20, subtotal: 20, discount: 3, totalPrice: 17 };
const business = (extra: any = {}) => ({ id: 'order-one', userId: 'buyer', companionId: 'provider', participant, role: 'BUYER', serviceName: 'Persisted service', status: 'CREATED', workflowVersion: 2, createdAt: 1791500000000, quantity: 1, unit: 'Hour', unitPrice: 20, totalPrice: 0, reviewed: false, ...extra });
const mapped = (source: any) => ({ id: source.id, epalId: source.participant.id, participant: source.participant, source, role: source.role, businessStatus: source.status, serviceName: source.serviceName, price: source.totalPrice, totalPrice: source.totalPrice, timestamp: source.createdAt, reviewed: source.reviewed, status: source.status === 'CREATED' ? 'PENDING' : source.status === 'COMPLETED' ? 'COMPLETED' : 'ONGOING' });
let roots: ReactTestRenderer[];
const render = async (Component: React.ComponentType) => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(React.createElement(Component)); });
  roots.push(root);
  return root;
};
const text = (root: ReactTestRenderer) => JSON.stringify(root.toJSON());
const button = (root: ReactTestRenderer, label: string) => root.root.findAllByType('button').find(node => node.props['aria-label'] === label || JSON.stringify(node.children.filter(child => typeof child === 'string')).includes(label))!;
const click = async (root: ReactTestRenderer, label: string) => { const control = button(root, label); expect(control, `Missing control: ${label}`).toBeDefined(); await act(async () => { await control.props.onClick({ stopPropagation() {} }); }); };
const deferred = <T>() => { let resolve!: (value: T) => void; let reject!: (reason: Error) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
beforeEach(() => {
  roots = [];
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const storage = new Map<string, string>();
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  app = {
    locale: 'en', authToken: 'token', authUser: { id: 'buyer' }, isAuthenticated: true, t: (key: string) => key,
    selectedEPal: participant, activeServiceId: 'service-one', selectedVariant: participant.services[0].variants[0], orderQuantity: 1, availableCoupons: [], selectedCoupon: null,
    setActiveServiceId: vi.fn(), setSelectedVariant: vi.fn(), setOrderQuantity: vi.fn(), setSelectedCoupon: vi.fn(), setShowCouponModal: vi.fn(), setShowServiceTypeModal: vi.fn(),
    imOrders: [mapped(business())], orderTab: 'ALL', imTab: 'ORDER', imSearchQuery: '', EPALS: [], social: {}, chatSessions: [], mutualFollowers: [],
    handleBack: vi.fn(), navigateTo: vi.fn(), setImTab: vi.fn(), setOrderTab: vi.fn(), setSelectedOrder: vi.fn(), setShowOrderDetailModal: vi.fn(),
    setShowReviewModal: vi.fn(), setReviewRating: vi.fn(), setReviewTags: vi.fn(), setReviewFeedback: vi.fn(), setImOrders: vi.fn(), setShowOngoingOrderWarning: vi.fn(), notify: vi.fn(),
    reviewRating: 5, reviewTags: [], reviewFeedback: '',
    orders: { items: [business()], coupons: [], loading: false, error: '', getError: () => app.orders.error, pendingId: null, refresh: vi.fn(async () => {}), quote: vi.fn(async () => quote), create: vi.fn(async () => business()), act: vi.fn(async () => business()), review: vi.fn(async () => ({ id: 'review', status: 'PENDING' })) },
  };
});
afterEach(async () => { for (const root of roots) await act(async () => root.unmount()); vi.unstubAllGlobals(); });

describe('authoritative checkout', () => {
  it('requests the service ID and displays the actual quote rather than a fake variant', async () => {
    const root = await render(OrderConfirmView);
    expect(app.orders.quote).toHaveBeenCalledWith({ companionId: participant.id, serviceId: 'service-one', quantity: 1 });
    expect(text(root)).toContain('Quoted service');
    expect(text(root)).not.toContain('999');
    await click(root, 'Pay and Start');
    expect(app.orders.create).toHaveBeenCalledWith(expect.objectContaining({ serviceId: 'service-one', expectedTotal: 17, requestId: expect.any(String) }));
    expect(app.navigateTo).toHaveBeenCalledWith('IM');
    expect(app.setImTab).toHaveBeenCalledWith('ORDER');
    expect(app.setImOrders).not.toHaveBeenCalled();
  });
  it('disables payment while a new quote loads and ignores a stale quote response', async () => {
    const first = deferred<any>(); const second = deferred<any>();
    app.orders.quote.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    const root = await render(OrderConfirmView);
    app = { ...app, orderQuantity: 2 };
    await act(async () => root.update(React.createElement(OrderConfirmView)));
    await act(async () => first.resolve(quote));
    expect(button(root, 'Pay and Start').props.disabled).toBe(true);
    await act(async () => second.resolve({ ...quote, quantity: 2, totalPrice: 34 }));
    expect(button(root, 'Pay and Start').props.disabled).toBe(false);
  });
  it('reuses the request ID after ambiguous failure including a checkout remount', async () => {
    app.orders.create.mockResolvedValue(null); app.orders.error = 'Payment response unavailable';
    const root = await render(OrderConfirmView);
    await click(root, 'Pay and Start');
    expect(app.navigateTo).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    const retry = await render(OrderConfirmView);
    await click(retry, 'Pay and Start');
    expect(app.orders.create).toHaveBeenCalledTimes(2);
    expect(app.orders.create.mock.calls[0][0].requestId).toBe(app.orders.create.mock.calls[1][0].requestId);
  });
  it('locks duplicate payment clicks before pendingId updates', async () => {
    const pending = deferred<any>(); app.orders.create.mockImplementation(() => pending.promise);
    const root = await render(OrderConfirmView);
    await act(async () => { void button(root, 'Pay and Start').props.onClick(); void button(root, 'Pay and Start').props.onClick(); });
    expect(app.orders.create).toHaveBeenCalledTimes(1);
    expect(button(root, 'Pay and Start').props.disabled).toBe(true);
    await act(async () => pending.resolve(null));
  });
  it('shows quote failures with retry and caps quantity at 100', async () => {
    app.orders.quote.mockRejectedValueOnce(new Error('Invalid coupon'));
    app.orderQuantity = 100;
    const root = await render(OrderConfirmView);
    expect(text(root)).toContain('Invalid coupon');
    expect(button(root, 'Pay and Start').props.disabled).toBe(true);
    expect(button(root, 'Increase quantity').props.disabled).toBe(true);
    await click(root, 'Retry');
    expect(app.orders.quote).toHaveBeenCalledTimes(2);
  });
  it('recovers a funded order after a lost response and a used-coupon quote failure', async () => {
    app.selectedCoupon = { id: 'grant', name: 'Coupon', discount: 3, type: 'FIXED' };
    app.orders.create.mockResolvedValue(null);
    const first = await render(OrderConfirmView);
    await click(first, 'Pay and Start');
    const requestId = app.orders.create.mock.calls[0][0].requestId;
    await act(async () => first.unmount());
    app.orders.quote.mockRejectedValue(new Error('COUPON_USED'));
    const retry = await render(OrderConfirmView);
    expect(app.navigateTo).not.toHaveBeenCalled();
    app = { ...app, orders: { ...app.orders, items: [business({ requestId, companionId: participant.id })] } };
    await act(async () => retry.update(React.createElement(OrderConfirmView)));
    expect(app.navigateTo).toHaveBeenCalledWith('IM');
    expect(app.setImTab).toHaveBeenCalledWith('ORDER');
    expect(app.orders.create).toHaveBeenCalledTimes(1);
  });
  it('preserves a pending payment and its success across same-account token rotation', async () => {
    const pending = deferred<any>(); app.orders.create.mockImplementation(() => pending.promise);
    const root = await render(OrderConfirmView);
    await act(async () => { void button(root, 'Pay and Start').props.onClick(); });
    app = { ...app, authToken: 'rotated-token' };
    await act(async () => root.update(React.createElement(OrderConfirmView)));
    expect(button(root, 'Pay and Start').props.disabled).toBe(true);
    await act(async () => pending.resolve(business()));
    expect(app.navigateTo).toHaveBeenCalledWith('IM');
    expect(app.orders.create).toHaveBeenCalledTimes(1);
  });
  it('does not navigate on an old account result after an A-B-A switch', async () => {
    const pending = deferred<any>(); app.orders.create.mockImplementation(() => pending.promise);
    const root = await render(OrderConfirmView);
    await act(async () => { void button(root, 'Pay and Start').props.onClick(); });
    app = { ...app, authUser: { id: 'buyer-b' }, authToken: 'token-b' };
    await act(async () => root.update(React.createElement(OrderConfirmView)));
    app = { ...app, authUser: { id: 'buyer' }, authToken: 'token' };
    await act(async () => root.update(React.createElement(OrderConfirmView)));
    await act(async () => pending.resolve(business()));
    expect(app.navigateTo).not.toHaveBeenCalled();
  });
  it('keeps the in-page request ID when session storage is denied', async () => {
    vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Denied'); } });
    app.orders.create.mockResolvedValue(null);
    const root = await render(OrderConfirmView);
    await click(root, 'Pay and Start'); await click(root, 'Pay and Start');
    expect(app.orders.create.mock.calls[0][0].requestId).toBe(app.orders.create.mock.calls[1][0].requestId);
  });
  it('clears a definitively rejected payment so changed quantity can start a fresh request', async () => {
    app.orders.create.mockResolvedValueOnce(null).mockResolvedValueOnce(business());
    app.orders.getError = () => 'WALLET_INSUFFICIENT_BALANCE';
    const root = await render(OrderConfirmView);
    await click(root, 'Pay and Start');
    expect(text(root)).toContain('Your coin balance is too low');
    app = { ...app, orderQuantity: 2, orders: { ...app.orders, getError: () => '', quote: vi.fn(async () => ({ ...quote, quantity: 2, totalPrice: 34 })) } };
    await act(async () => root.update(React.createElement(OrderConfirmView)));
    expect(button(root, 'Pay and Start').props.disabled).toBe(false);
    await click(root, 'Pay and Start');
    expect(app.orders.create.mock.calls[1][0].requestId).not.toBe(app.orders.create.mock.calls[0][0].requestId);
    expect(app.orders.create.mock.calls[1][0].quantity).toBe(2);
  });
  it('blocks a changed checkout after ambiguous failure but can retry the original request without a quote', async () => {
    app.orders.create.mockResolvedValue(null);
    const root = await render(OrderConfirmView);
    await click(root, 'Pay and Start');
    const original = app.orders.create.mock.calls[0][0];
    app = { ...app, orderQuantity: 2, orders: { ...app.orders, quote: vi.fn(async () => { throw new Error('COUPON_USED'); }) } };
    await act(async () => root.update(React.createElement(OrderConfirmView)));
    expect(button(root, 'Pay and Start').props.disabled).toBe(true);
    await click(root, 'Retry payment');
    expect(app.orders.create.mock.calls[1][0]).toEqual(original);
  });
});

describe('localized contract errors', () => {
  for (const code of ['ORDER_PERSISTENCE_UNAVAILABLE', 'LEGACY_ORDER_RECONCILIATION_REQUIRED', 'ORDER_INVALID_TRANSITION']) {
    it(`explains ${code} in English and Arabic`, () => {
      expect(orderError(code, 'en')).not.toBe(code);
      expect(orderError(code, 'ar')).toMatch(/[\u0600-\u06ff]/);
      expect(orderError(code, 'fr')).toBe(orderError(code, 'en'));
    });
  }
});

describe('shared order lists', () => {
  for (const Component of [MyOrdersView, ImView]) {
    it(`${Component.name} shows real participants and precise canonical status`, async () => {
      app.orders.items = [business({ status: 'AWAITING_CONFIRMATION', role: 'COMPANION' })]; app.imOrders = app.orders.items.map(mapped);
      const root = await render(Component);
      expect(text(root)).toContain('Real participant');
      expect(text(root)).toContain('Awaiting confirmation');
      expect(text(root)).toContain('Companion');
      await click(root, 'Chat');
      expect(app.navigateTo).toHaveBeenCalledWith('IM_DETAIL', participant);
    });
  }
  it('shows retryable errors and never offers a provider review', async () => {
    app.orders.error = 'Could not load'; app.orders.items = [business({ role: 'COMPANION', status: 'COMPLETED' })]; app.imOrders = app.orders.items.map(mapped);
    const root = await render(MyOrdersView);
    expect(text(root)).toContain('Could not load');
    expect(button(root, 'Rate')).toBeUndefined();
    await click(root, 'Retry');
    expect(app.orders.refresh).toHaveBeenCalled();
  });
});

describe('role-aware order dialogs', () => {
  const show = (extra: any = {}) => { const source = business(extra); app.orders.items = [source]; app.imOrders = [mapped(source)]; app.selectedOrder = app.imOrders[0]; app.showOrderDetailModal = true; };
  it('cancels buyer CREATED using the server and renders zero totals correctly', async () => {
    show(); const root = await render(ViewOverlays);
    expect(root.root.findAll(node => typeof node.type === 'string' && node.props.role === 'dialog').length).toBe(1);
    await click(root, 'Cancel order');
    expect(app.orders.act).toHaveBeenCalledWith('order-one', 'cancel', undefined);
    expect(app.setImOrders).not.toHaveBeenCalled();
  });
  it('accepts only for providers and makes legacy orders read-only', async () => {
    show({ role: 'COMPANION' }); const root = await render(ViewOverlays);
    expect(button(root, 'Cancel order')).toBeUndefined();
    await click(root, 'Accept and start');
    expect(app.orders.act).toHaveBeenCalledWith('order-one', 'accept', undefined);
    show({ workflowVersion: 1, status: 'COMPLETED' });
    await act(async () => root.update(React.createElement(ViewOverlays)));
    expect(text(root)).toContain('History only');
    expect(button(root, 'Rate')).toBeUndefined();
  });
  it('requires 1..9 completion evidence entries and forwards them', async () => {
    show({ role: 'COMPANION', status: 'IN_SERVICE' }); const root = await render(ViewOverlays);
    expect(button(root, 'Submit completion')).toBeDefined();
    expect(button(root, 'Submit completion').props.disabled).toBe(true);
    const evidence = root.root.findByProps({ 'aria-label': 'Completion evidence' });
    await act(async () => evidence.props.onChange({ target: { value: 'Match complete\nhttps://example.test/proof' } }));
    await click(root, 'Submit completion');
    expect(app.orders.act).toHaveBeenCalledWith('order-one', 'complete', { evidence: ['Match complete', 'https://example.test/proof'] });
  });
  it('accepts the server limit of 2048 characters per proof and explains too many entries', async () => {
    show({ role: 'COMPANION', status: 'IN_SERVICE' }); const root = await render(ViewOverlays);
    const evidence = root.root.findByProps({ 'aria-label': 'Completion evidence' });
    await act(async () => evidence.props.onChange({ target: { value: 'x'.repeat(2048) } }));
    expect(button(root, 'Submit completion').props.disabled).toBe(false);
    await act(async () => root.root.findByProps({ 'aria-label': 'Completion evidence' }).props.onChange({ target: { value: Array(10).fill('Proof').join('\n') } }));
    expect(button(root, 'Submit completion').props.disabled).toBe(true);
    expect(text(root)).toContain('Each entry');
  });
  it('blocks closing during confirmation and reports action failure', async () => {
    show({ status: 'AWAITING_CONFIRMATION' }); const pending = deferred<any>(); app.orders.act.mockImplementation(() => pending.promise);
    const root = await render(ViewOverlays);
    expect(button(root, 'Confirm completion')).toBeDefined();
    await act(async () => { void button(root, 'Confirm completion').props.onClick(); });
    expect(button(root, 'Close').props.disabled).toBe(true);
    await act(async () => pending.reject(new Error('Order changed')));
    expect(text(root)).toContain('Order changed');
  });
  it('requires dispute evidence and bounds the reason to 1000 characters', async () => {
    show({ status: 'AWAITING_CONFIRMATION' }); const root = await render(ViewOverlays);
    const reason = root.root.findByProps({ 'aria-label': 'Dispute reason' });
    expect(reason.props.maxLength).toBe(1000);
    await act(async () => reason.props.onChange({ target: { value: 'Incomplete service' } }));
    expect(button(root, 'Dispute order').props.disabled).toBe(true);
    await act(async () => root.root.findByProps({ 'aria-label': 'Dispute evidence' }).props.onChange({ target: { value: 'Match ended early' } }));
    await click(root, 'Dispute order');
    expect(app.orders.act).toHaveBeenCalledWith('order-one', 'dispute', { reason: 'Incomplete service', evidence: ['Match ended early'] });
  });
  it('retains a review draft during same-account token rotation', async () => {
    show({ status: 'COMPLETED' }); app.showOrderDetailModal = false; app.showReviewModal = true;
    const root = await render(ViewOverlays);
    await act(async () => root.root.findByType('textarea').props.onChange({ target: { value: 'Retained draft' } }));
    app = { ...app, authToken: 'rotated' };
    await act(async () => root.update(React.createElement(ViewOverlays)));
    expect(root.root.findByType('textarea').props.value).toBe('Retained draft');
  });
  it('sends full review feedback and tags and accurately reports a rejected review', async () => {
    show({ status: 'COMPLETED' }); app.showOrderDetailModal = false; app.showReviewModal = true;
    app.orders.review.mockResolvedValue({ id: 'review', status: 'REJECTED', moderationReason: 'Policy' });
    const root = await render(ViewOverlays);
    const tag = root.root.findAllByType('input').find(node => node.props['aria-label'] === 'Professional')!;
    expect(tag).toBeDefined();
    await act(async () => tag.props.onChange());
    await act(async () => root.root.findByType('textarea').props.onChange({ target: { value: 'Full feedback' } }));
    await click(root, 'Submit review');
    expect(app.orders.review).toHaveBeenCalledWith('order-one', 5, 'Full feedback', ['Professional']);
    expect(app.notify).toHaveBeenCalledWith(expect.stringContaining('not public'));
    expect(app.setShowReviewModal).toHaveBeenCalledWith(false);
  });
  it('retains review inputs on failure and clears them between accounts', async () => {
    show({ status: 'COMPLETED' }); app.showOrderDetailModal = false; app.showReviewModal = true; app.orders.review.mockResolvedValue(null);
    const root = await render(ViewOverlays);
    await act(async () => root.root.findByType('textarea').props.onChange({ target: { value: 'Private feedback' } }));
    await click(root, 'Submit review');
    expect(app.setShowReviewModal).not.toHaveBeenCalledWith(false);
    app = { ...app, authUser: { id: 'another-buyer' }, authToken: 'another-token', orders: { ...app.orders, items: [] }, imOrders: [] };
    await act(async () => root.update(React.createElement(ViewOverlays)));
    expect(text(root)).not.toContain('Private feedback');
    expect(text(root)).not.toContain('Real participant');
  });
});
