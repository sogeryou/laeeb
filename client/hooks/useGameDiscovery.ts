import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameCompanion, GameDiscoveryPage, GameDiscoveryQuery } from '@shared/gameDiscovery';
import { businessApi } from '../services/businessApi';
import { AUTH_SESSION_EVENT } from '../features/auth/session';
import { discoveryQueryKey, readDiscoveryPage } from '../components/game-discovery/model';

type Result = { key: string; epoch: number; items: GameCompanion[]; data: GameDiscoveryPage | null; loading: boolean; loadingMore: boolean; error: string; errorKind: 'refresh' | 'more' };
const empty = (key: string, epoch: number): Result => ({ key, epoch, items: [], data: null, loading: false, loadingMore: false, error: '', errorKind: 'refresh' });
const deduplicate = (items: GameCompanion[]) => [...new Map(items.map(person => [person.id, person])).values()];

export function useGameDiscovery(gameId: string | null, query: GameDiscoveryQuery, active: boolean, token: string | null, ownerId?: string) {
  const key = JSON.stringify([gameId, discoveryQueryKey(query), active, token, ownerId || '']);
  const identity = useRef({ key, epoch: 0, blocked: false });
  if (identity.current.key !== key) identity.current = { key, epoch: identity.current.epoch + 1, blocked: false };
  const live = useRef({ gameId, query, active, token, ownerId }); live.current = { gameId, query, active, token, ownerId };
  const mounted = useRef(false);
  const operation = useRef<{ key: string; epoch: number } | null>(null);
  const [state, setState] = useState(() => empty(key, identity.current.epoch));
  const cache = useRef(state); cache.current = state;
  const publish = (value: Result) => { cache.current = value; setState(value); };
  const isVisible = () => mounted.current && live.current.active && !identity.current.blocked
    && cache.current.key === identity.current.key && cache.current.epoch === identity.current.epoch;

  const read = useCallback(async (kind: 'refresh' | 'more') => {
    const { gameId: game, query: filters, active: enabled } = live.current;
    const stamp = identity.current;
    if (!mounted.current || !enabled || !game || stamp.blocked) return;
    if (operation.current?.key === stamp.key && operation.current.epoch === stamp.epoch) return;
    const previous = isVisible() ? cache.current : empty(stamp.key, stamp.epoch);
    if (kind === 'more' && !previous.data?.nextPage) return;
    const attempt = { key: stamp.key, epoch: stamp.epoch };
    operation.current = attempt;
    const current = () => mounted.current && live.current.active && !identity.current.blocked && identity.current.key === attempt.key
      && identity.current.epoch === attempt.epoch && operation.current === attempt;
    publish({ ...previous, loading: kind === 'refresh', loadingMore: kind === 'more', error: '', errorKind: kind });
    const start = kind === 'more' ? previous.data!.nextPage! : 1;
    const frontier = kind === 'more' ? start : previous.data?.page || 1;
    let items = kind === 'more' ? previous.items : [];
    let last: GameDiscoveryPage | null = null;
    try {
      for (let page = start; page <= frontier; page++) {
        const value = await businessApi.getGameCompanions(game, filters, page, 20);
        if (!current()) return;
        last = readDiscoveryPage(value, game, filters, page, 20);
        items = deduplicate([...items, ...last.items]);
        if (!last.nextPage) break;
      }
      if (current() && last) publish({ ...previous, items, data: last, loading: false, loadingMore: false, error: '', errorKind: kind });
    } catch (error) {
      if (current()) publish({ ...previous, loading: false, loadingMore: false, error: error instanceof Error ? error.message : 'DISCOVERY_LOAD_FAILED', errorKind: kind });
    } finally {
      if (operation.current === attempt) operation.current = null;
    }
  }, []);
  const refresh = useCallback(() => read('refresh'), [read]);
  const loadMore = useCallback(() => read('more'), [read]);
  const retry = useCallback(() => read(cache.current.errorKind), [read]);
  const canUse = useCallback((id: string) => isVisible() && !cache.current.error && !cache.current.loading && !cache.current.loadingMore && cache.current.items.some(person => person.id === id), []);

  useEffect(() => {
    mounted.current = true;
    const changed = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      identity.current.epoch++;
      identity.current.blocked = (detail?.user?.id || undefined) !== live.current.ownerId || (detail?.token || null) !== live.current.token;
      publish(empty(identity.current.key, identity.current.epoch));
      if (!identity.current.blocked) void refresh();
    };
    const focus = () => { if (typeof document === 'undefined' || document.visibilityState !== 'hidden') void refresh(); };
    window.addEventListener(AUTH_SESSION_EVENT, changed); window.addEventListener('focus', focus);
    return () => { mounted.current = false; identity.current.epoch++; window.removeEventListener(AUTH_SESSION_EVENT, changed); window.removeEventListener('focus', focus); };
  }, [refresh]);
  useEffect(() => { void refresh(); }, [key, refresh]);
  const visible = !identity.current.blocked && state.key === key && state.epoch === identity.current.epoch && active;
  return {
    items: visible ? state.items : [], total: visible ? state.data?.total ?? null : null,
    onlineCount: visible ? state.data?.onlineCount ?? null : null,
    loading: Boolean(active && gameId && !identity.current.blocked && (!visible || state.loading)),
    loadingMore: visible && state.loadingMore, error: visible ? state.error : '', hasMore: visible && Boolean(state.data?.nextPage),
    refresh, loadMore, retry, canUse,
  };
}
