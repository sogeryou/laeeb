import { useCallback, useEffect, useRef, useState } from 'react';
import type { BusinessOrder, BusinessReview, CreateOrderInput, OrderAction, OrderQuote } from '@shared/orders';
import type { Coupon } from '@shared/types';
import { businessApi } from '../services/businessApi';
import { AUTH_SESSION_EVENT } from '../features/auth/session';

type Cache = { owner?: string; items: BusinessOrder[]; coupons: Coupon[]; loading: boolean; error: string; pendingId: string | null };
const empty = (): Cache => ({ items: [], coupons: [], loading: false, error: '', pendingId: null });

export function useOrders(token: string | null, userId: string | undefined, active: boolean, onChanged: () => Promise<void>) {
  const [cache, setCache] = useState<Cache>(empty);
  const identity = useRef({ token, userId, epoch: 0, accountEpoch: 0 });
  if (identity.current.token !== token || identity.current.userId !== userId) {
    const accountChanged = identity.current.userId !== userId || Boolean(identity.current.token) !== Boolean(token);
    identity.current = { token, userId, epoch: identity.current.epoch + 1, accountEpoch: identity.current.accountEpoch + (accountChanged ? 1 : 0) };
  }
  const mounted = useRef(true);
  const snapshot = useRef(0);
  const couponSnapshot = useRef(0);
  const lock = useRef<{ accountEpoch: number; owner: string; id: string } | null>(null);
  const rejection = useRef({ accountEpoch: 0, message: '' });
  const changed = useRef(onChanged);
  changed.current = onChanged;
  const current = useCallback((session: typeof identity.current) => mounted.current && identity.current.epoch === session.epoch && identity.current.token === session.token && identity.current.userId === session.userId, []);
  const currentAccount = useCallback((session: typeof identity.current) => mounted.current && Boolean(identity.current.token) && identity.current.accountEpoch === session.accountEpoch && identity.current.userId === session.userId, []);
  const getError = useCallback(() => rejection.current.accountEpoch === identity.current.accountEpoch ? rejection.current.message : '', []);

  useEffect(() => {
    mounted.current = true;
    const invalidate = (event: Event) => {
      const session = (event as CustomEvent).detail;
      if (session?.token !== identity.current.token || session?.user?.id !== identity.current.userId) {
        identity.current.epoch++;
        snapshot.current++;
        couponSnapshot.current++;
        if (session?.user?.id !== identity.current.userId || !session?.token) {
          identity.current.accountEpoch++;
          lock.current = null;
        }
      }
    };
    window.addEventListener(AUTH_SESSION_EVENT, invalidate);
    return () => { mounted.current = false; window.removeEventListener(AUTH_SESSION_EVENT, invalidate); };
  }, []);

  const refresh = useCallback(async () => {
    const session = { ...identity.current };
    if (!session.token || !session.userId) return;
    const seq = ++snapshot.current;
    setCache(old => ({ ...(old.owner === session.userId ? old : empty()), owner: session.userId, loading: true, error: '' }));
    try {
      const items = await businessApi.listOrders(session.token);
      if (!Array.isArray(items)) throw new Error('ORDER_RESPONSE_INVALID');
      if (current(session) && snapshot.current === seq) setCache(old => ({ ...old, owner: session.userId, items, loading: false }));
    } catch (error) {
      if (current(session) && snapshot.current === seq) setCache(old => ({ ...old, loading: false, error: (error as Error).message || 'ORDER_LOAD_FAILED' }));
    }
  }, [current]);

  const refreshCoupons = useCallback(async () => {
    const session = { ...identity.current };
    if (!session.token || !session.userId) return;
    const seq = ++couponSnapshot.current;
    try {
      const coupons = await businessApi.listCoupons(session.token);
      if (current(session) && couponSnapshot.current === seq) setCache(old => ({ ...old, owner: session.userId, coupons: Array.isArray(coupons) ? coupons : [] }));
    } catch {
      if (current(session) && couponSnapshot.current === seq) setCache(old => ({ ...old, coupons: [] }));
    }
  }, [current]);

  useEffect(() => {
    const session = { ...identity.current };
    if (lock.current?.accountEpoch !== session.accountEpoch) lock.current = null;
    if (!token || !userId) { snapshot.current++; couponSnapshot.current++; setCache(empty()); return; }
    setCache(old => old.owner === userId ? { ...old, pendingId: lock.current?.id ?? null } : { ...empty(), owner: userId });
    void refresh();
    void refreshCoupons();
  }, [token, userId, refresh, refreshCoupons]);

  useEffect(() => {
    if (!active || !token || !userId) return;
    void refreshCoupons();
    const update = () => { if (document.visibilityState !== 'hidden') { void refresh(); void refreshCoupons(); } };
    const timer = window.setInterval(update, 10_000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, [active, token, userId, refresh, refreshCoupons]);

  const quote = useCallback(async (input: Omit<CreateOrderInput, 'requestId' | 'expectedTotal'>): Promise<OrderQuote> => {
    const session = { ...identity.current };
    if (!session.token || !session.userId) throw new Error('AUTH_REQUIRED');
    const value = await businessApi.quoteOrder(session.token, input);
    if (!current(session)) throw new Error('SESSION_CHANGED');
    return value;
  }, [current]);

  const mutate = useCallback(async <T,>(id: string, request: (access: string) => Promise<T>, apply: (value: T, items: BusinessOrder[]) => BusinessOrder[]): Promise<T | null> => {
    const session = { ...identity.current };
    if (!session.token || !session.userId) return null;
    if (lock.current?.accountEpoch === session.accountEpoch) return null;
    const operation = { accountEpoch: session.accountEpoch, owner: session.userId, id };
    lock.current = operation;
    rejection.current = { accountEpoch: session.accountEpoch, message: '' };
    snapshot.current++;
    setCache(old => ({ ...old, pendingId: id, loading: false, error: '' }));
    try {
      const value = await request(session.token);
      if (!currentAccount(session)) return null;
      snapshot.current++;
      setCache(old => ({ ...old, owner: session.userId, items: apply(value, old.items), loading: false }));
      try { await changed.current(); } catch { /* The mutation is saved; a balance read cannot undo it. */ }
      return currentAccount(session) ? value : null;
    } catch (error) {
      if (currentAccount(session)) {
        const message = (error as Error).message || 'ORDER_ACTION_FAILED';
        rejection.current = { accountEpoch: session.accountEpoch, message };
        setCache(old => ({ ...old, error: message }));
      }
      return null;
    } finally {
      if (lock.current === operation) {
        lock.current = null;
        if (currentAccount(session)) setCache(old => ({ ...old, pendingId: null }));
      }
    }
  }, [currentAccount]);

  const merge = (value: BusinessOrder, items: BusinessOrder[]) => [value, ...items.filter(item => item.id !== value.id)].sort((a, b) => b.createdAt - a.createdAt);
  const create = useCallback(async (input: CreateOrderInput) => {
    const session = { ...identity.current };
    const value = await mutate('create', access => businessApi.createOrder(access, input), merge);
    if (value && currentAccount(session) && input.couponGrantId) {
      couponSnapshot.current++;
      setCache(old => ({ ...old, coupons: old.coupons.filter(coupon => coupon.id !== input.couponGrantId) }));
    }
    return value;
  }, [mutate, currentAccount]);
  const act = useCallback((id: string, action: OrderAction, body?: { evidence?: string[]; reason?: string }) => mutate(id, access => businessApi.updateOrder(access, id, action, body), merge), [mutate]);
  const review = useCallback((id: string, rating: number, content: string, tags: string[] = []) => mutate<BusinessReview>(`review:${id}`, access => businessApi.createReview(access, id, rating, content, tags), (value, items) => items.map(item => item.id === id ? { ...item, reviewed: true, review: value } : item)), [mutate]);
  const reconcileFetchedOrder = useCallback((order: BusinessOrder, owner: string, access: string, isCurrent: () => boolean) => {
    const session = { ...identity.current };
    if (!isCurrent() || !current(session) || session.userId !== owner || session.token !== access
      || (order.role !== 'COMPANION' && !(order.role === 'BUYER' && order.userId === owner))) return false;
    snapshot.current++;
    setCache(previous => ({ ...previous, owner, items: merge(order, previous.owner === owner ? previous.items : []), loading: false }));
    return true;
  }, [current]);
  const visible = token && userId && cache.owner === userId ? cache : empty();
  return { ...visible, refresh, quote, create, act, review, getError, reconcileFetchedOrder };
}
