import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppNotification, NotificationReadResult, NotificationsReadAllResult } from '@shared/notifications';
import { businessApi } from '../services/businessApi';
import { AUTH_SESSION_EVENT } from '../features/auth/session';
import { mergeNotifications, validCount, validNotification, validPage, validReadAt } from '../components/notifications/model';

type Session = { token: string | null; owner: string | undefined; enabled: boolean; epoch: number; account: number };
type Cache = { owner?: string; account: number; items: AppNotification[]; unreadCount: number; nextCursor: string | null; expanded: boolean; loading: boolean; loadingMore: boolean; error: string; pendingId: string | null };
const empty = (session?: Session): Cache => ({ owner: session?.owner, account: session?.account ?? -1, items: [], unreadCount: 0, nextCursor: null, expanded: false, loading: false, loadingMore: false, error: '', pendingId: null });

export function useNotifications(token: string | null, ownerId: string | undefined, enabled: boolean) {
  const [cache, setCache] = useState<Cache>(empty);
  const cacheRef = useRef(cache); cacheRef.current = cache;
  const identity = useRef<Session>({ token: null, owner: undefined, enabled: false, epoch: 0, account: 0 });
  const mounted = useRef(false);
  const sequence = useRef(0);
  const readLock = useRef<object | null>(null);
  const mutation = useRef<{ account: number; id: string } | null>(null);
  const props = useRef({ token: null as string | null, owner: undefined as string | undefined, enabled: false });

  const advance = (access: string | null, owner: string | undefined, eligible: boolean) => {
    const previous = identity.current;
    if (previous.token === access && previous.owner === owner && previous.enabled === eligible) return;
    const accountChanged = previous.owner !== owner || Boolean(previous.token) !== Boolean(access) || previous.enabled !== eligible;
    identity.current = { token: access, owner, enabled: eligible, epoch: previous.epoch + 1, account: previous.account + Number(accountChanged) };
    sequence.current++; readLock.current = null;
    if (accountChanged) mutation.current = null;
  };
  if (props.current.token !== token || props.current.owner !== ownerId || props.current.enabled !== enabled) {
    props.current = { token, owner: ownerId, enabled }; advance(token, ownerId, enabled);
  }
  const current = useCallback((session: Session) => mounted.current && identity.current.enabled && Boolean(identity.current.token)
    && identity.current.epoch === session.epoch && identity.current.owner === session.owner && identity.current.token === session.token, []);
  const sameAccount = useCallback((session: Session) => mounted.current && identity.current.enabled && Boolean(identity.current.token)
    && identity.current.account === session.account && identity.current.owner === session.owner, []);

  const load = useCallback(async (reset: boolean, more: boolean) => {
    const session = { ...identity.current };
    if (!mounted.current || !session.enabled || !session.token || !session.owner || mutation.current) return;
    if (readLock.current && !reset) return;
    const cursor = more ? cacheRef.current.nextCursor : undefined;
    if (more && !cursor) return;
    const operation = {}; readLock.current = operation;
    const version = ++sequence.current;
    setCache(previous => ({ ...(previous.owner === session.owner && previous.account === session.account ? previous : empty(session)), loading: !more, loadingMore: more, error: '' }));
    try {
      const result = await businessApi.listNotifications(session.token, { limit: 20, ...(cursor ? { cursor } : {}) });
      if (!current(session) || sequence.current !== version) return;
      if (!validPage(result, session.owner)) throw Error('NOTIFICATION_RESPONSE_INVALID');
      const frontier = cacheRef.current.items.at(-1)?.id;
      let incoming = result.items;
      if (!reset && !more && cacheRef.current.expanded && frontier) {
        let next = result.nextCursor;
        const seen = new Set<string>();
        // Refresh every retained row, including reads acknowledged on another device.
        while (next && !incoming.some(row => row.id === frontier)) {
          if (seen.has(next)) throw Error('NOTIFICATION_RESPONSE_INVALID');
          seen.add(next);
          const extra = await businessApi.listNotifications(session.token, { limit: 20, cursor: next });
          if (!current(session) || sequence.current !== version) return;
          if (!validPage(extra, session.owner)) throw Error('NOTIFICATION_RESPONSE_INVALID');
          incoming = mergeNotifications(incoming, extra.items);
          next = extra.nextCursor;
          result.unreadCount = extra.unreadCount;
        }
        result.nextCursor = next;
      }
      setCache(previous => {
        const old = previous.owner === session.owner && previous.account === session.account ? previous : empty(session);
        const preserve = more || (!reset && old.expanded);
        return { ...old, items: preserve ? mergeNotifications(old.items, incoming) : mergeNotifications([], incoming),
          unreadCount: result.unreadCount, nextCursor: result.nextCursor,
          expanded: more || (!reset && old.expanded), loading: false, loadingMore: false, error: '' };
      });
    } catch (error) {
      if (current(session) && sequence.current === version) setCache(previous => ({ ...previous, loading: false, loadingMore: false, error: error instanceof Error ? error.message : 'NOTIFICATION_LOAD_FAILED' }));
    } finally { if (readLock.current === operation) readLock.current = null; }
  }, [current]);
  const refresh = useCallback((reset = true) => load(reset, false), [load]);
  const loadMore = useCallback(() => load(false, true), [load]);

  useEffect(() => {
    mounted.current = true;
    const sessionChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const nextToken = detail?.token || null;
      const nextOwner = detail?.user?.id || undefined;
      advance(nextToken, nextOwner, identity.current.enabled);
      const session = { ...identity.current };
      setCache(previous => previous.owner === session.owner && previous.account === session.account ? previous : empty(session));
      if (nextToken && nextOwner) void refresh(false);
    };
    window.addEventListener(AUTH_SESSION_EVENT, sessionChanged);
    return () => { mounted.current = false; identity.current.epoch++; identity.current.account++; sequence.current++; readLock.current = null; mutation.current = null; window.removeEventListener(AUTH_SESSION_EVENT, sessionChanged); };
  }, [refresh]);

  useEffect(() => {
    const session = { ...identity.current };
    setCache(previous => previous.owner === session.owner && previous.account === session.account && enabled && token ? previous : empty(session));
    if (!enabled || !token || !ownerId) return;
    void refresh(false);
    const poll = () => { if (document.visibilityState !== 'hidden') void refresh(false); };
    const timer = window.setInterval(poll, 30_000);
    window.addEventListener('focus', poll);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', poll); };
  }, [token, ownerId, enabled, refresh]);

  const runMutation = useCallback(async <T,>(id: string, request: (access: string, owner: string) => Promise<T>, apply: (saved: T, previous: Cache) => Cache): Promise<T | null> => {
    const session = { ...identity.current };
    if (!mounted.current || !session.enabled || !session.token || !session.owner || mutation.current) return null;
    const operation = { account: session.account, id }; mutation.current = operation;
    sequence.current++; readLock.current = null;
    setCache(previous => ({ ...previous, pendingId: id, loading: false, loadingMore: false, error: '' }));
    try {
      const saved = await request(session.token, session.owner);
      if (!sameAccount(session)) return null;
      sequence.current++;
      setCache(previous => previous.owner === session.owner && previous.account === session.account ? apply(saved, previous) : previous);
      return saved;
    } catch (error) {
      if (sameAccount(session)) setCache(previous => ({ ...previous, error: error instanceof Error ? error.message : 'NOTIFICATION_SAVE_FAILED' }));
      return null;
    } finally {
      if (mutation.current === operation) { mutation.current = null; if (sameAccount(session)) setCache(previous => ({ ...previous, pendingId: null })); }
    }
  }, [sameAccount]);

  const markRead = useCallback(async (id: string): Promise<AppNotification | null> => {
    const session = identity.current;
    const old = cacheRef.current;
    if (!mounted.current || !session.enabled || !session.token || old.owner !== session.owner || old.account !== session.account) return null;
    const known = old.items.find(row => row.id === id);
    if (!known) return null;
    if (known.readAt !== undefined) return known;
    const saved = await runMutation<NotificationReadResult>(id, async (access, owner) => {
      const result = await businessApi.readNotification(access, id);
      if (result?.ownerId !== owner || !validNotification(result.notification, owner) || result.notification.id !== id
        || !validReadAt(result.notification.readAt) || !validCount(result.unreadCount)) throw Error('NOTIFICATION_RESPONSE_INVALID');
      return result;
    }, (result, previous) => ({ ...previous, items: previous.items.map(row => row.id === id ? result.notification : row), unreadCount: result.unreadCount }));
    return saved?.notification || null;
  }, [runMutation]);

  const markAllRead = useCallback(async () => {
    const session = identity.current;
    const old = cacheRef.current;
    if (!mounted.current || !session.enabled || !session.token || old.owner !== session.owner || old.account !== session.account) return false;
    if (old.unreadCount === 0) return true;
    const saved = await runMutation<NotificationsReadAllResult>('all', async (access, owner) => {
      const result = await businessApi.readAllNotifications(access);
      if (result?.ownerId !== owner || !validCount(result.unreadCount) || !validReadAt(result.readAt)
        || !Array.isArray(result.updatedIds) || result.updatedIds.some(id => typeof id !== 'string' || !id)) throw Error('NOTIFICATION_RESPONSE_INVALID');
      return result;
    }, (result, previous) => ({ ...previous,
      items: previous.items.map(row => result.unreadCount === 0 || result.updatedIds.includes(row.id) ? { ...row, readAt: row.readAt ?? result.readAt } : row), unreadCount: result.unreadCount }));
    return Boolean(saved);
  }, [runMutation]);

  const sessionGuard = useCallback((owner: string, access: string) => {
    const session = { ...identity.current };
    return () => current(session) && identity.current.owner === owner && identity.current.token === access;
  }, [current]);
  const setError = useCallback((message: string) => {
    const session = { ...identity.current };
    if (current(session)) setCache(previous => ({ ...previous, error: message }));
  }, [current]);
  const visible = enabled && token && ownerId && identity.current.owner === ownerId && identity.current.token === token
    && cache.owner === ownerId && cache.account === identity.current.account ? cache : empty();
  return { ...visible, refresh, loadMore, markRead, markAllRead, sessionGuard, setError };
}
