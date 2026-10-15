import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { businessApi } from '../../client/services/businessApi';
import type { GameCompanion, GameDiscoveryPage, GameDiscoveryQuery } from '../../shared/gameDiscovery';

const defaults: GameDiscoveryQuery = { status: 'ALL', gender: 'ALL', minPrice: 0, maxPrice: 10000, sort: 'DEFAULT' };
const person = (id = 'p', game = 'Valorant'): GameCompanion => ({ id, userId: `u-${id}`, name: `Real ${id}`, avatarUrl: '/real.png', game, price: 150, rating: 0, reviewCount: 0, completedOrders30d: 0, orderCount: '0', onlineStatus: 'Online', tags: [], bookable: true,
  services: [{ id, name: game, icon: '', posterUrl: '/real.png', description: 'Real service', rating: 0, orderCount: '0', screenshots: [], variants: [{ name: game, price: 150, unit: 'hr' }] }] });
const packet = (options: Partial<GameDiscoveryPage> = {}): GameDiscoveryPage => ({ gameId: 'val', gameName: 'Valorant', query: { ...defaults }, items: [person()], page: 1, limit: 20, total: 1, onlineCount: 1, nextPage: null, ...options });
const rows = (n: number, start = 0) => Array.from({ length: n }, (_, i) => person(`p${start + i}`));
const deferred = <T,>() => { let resolve!: (value: T) => void; let reject!: (reason: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const browser = new EventTarget();
let hook: typeof import('../../client/hooks/useGameDiscovery').useGameDiscovery;
let result: ReturnType<typeof hook>;
let roots: ReactTestRenderer[];
let get: ReturnType<typeof vi.spyOn>;
const Host = ({ game = 'val', query = defaults, active = true, token = 'tokenA', owner = 'A' }: { game?: string; query?: GameDiscoveryQuery; active?: boolean; token?: string | null; owner?: string }) => { result = hook(game, query, active, token, owner); return null; };
async function render(props: React.ComponentProps<typeof Host> = {}) {
  const path = '../../client/hooks/useGameDiscovery'; const module = await import(path).catch(() => ({}));
  expect(typeof module.useGameDiscovery).toBe('function'); hook = module.useGameDiscovery;
  let root!: ReactTestRenderer; await act(async () => { root = create(React.createElement(Host, props)); }); roots.push(root); return root;
}
beforeEach(() => { roots = []; vi.stubGlobal('window', browser); vi.stubGlobal('document', { visibilityState: 'visible' }); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); get = vi.spyOn(businessApi, 'getGameCompanions').mockResolvedValue(packet()); });
afterEach(async () => { await act(async () => roots.forEach(root => root.unmount())); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('hydrates actual fields including prices above 100 without fake results', async () => {
  await render(); expect(get).toHaveBeenCalledWith('val', defaults, 1, 20); expect(result.items[0].price).toBe(150);
  expect(result.total).toBe(1); expect(result.onlineCount).toBe(1); expect(result.loading).toBe(false); expect(result.error).toBe('');
});
it('preserves confirmed data on a same-query failure and supports a real retry', async () => {
  await render(); get.mockRejectedValueOnce(Error('NETWORK_ERROR')); await act(async () => { await result.refresh(); });
  expect(result.items).toHaveLength(1); expect(result.error).toBe('NETWORK_ERROR');
  get.mockResolvedValue(packet({ items: [], total: 0, onlineCount: 0 })); await act(async () => { await result.refresh(); });
  expect(result.items).toEqual([]); expect(result.error).toBe(''); expect(result.total).toBe(0);
});
it('preserves a valid legacy extra-service unit without changing primary discovery pricing', async () => {
  const primary = person();
  get.mockResolvedValue(packet({ items: [{ ...primary, services: [...primary.services!, { ...primary.services![0], id: 'extra', name: 'Long session', variants: [{ name: 'Long session', price: 50000, unit: 'session' }] }] }] }));
  await render(); expect(result.error).toBe(''); expect(result.items[0].price).toBe(150); expect(result.items[0].services![1].variants[0]).toEqual({ name: 'Long session', price: 50000, unit: 'session' });
});
it('blocks stale booking callbacks during refresh and after a failed acknowledgement', async () => {
  await render(); const allowed = result.canUse; expect(allowed('p')).toBe(true);
  const pending = deferred<GameDiscoveryPage>(); get.mockReturnValueOnce(pending.promise); let read!: Promise<void>;
  await act(async () => { read = result.refresh(); }); expect(allowed('p')).toBe(false);
  await act(async () => { pending.reject(Error('NETWORK_ERROR')); await read; }); expect(allowed('p')).toBe(false);
});
it.each([
  ['game', { gameId: 'pubg' }], ['query', { query: { ...defaults, sort: 'SCORE' } }], ['page', { page: 2 }],
  ['price', { items: [{ ...person(), price: NaN }] }], ['foreign primary game', { items: [person('p', 'PUBG Mobile')] }],
  ['service identity', { items: [{ ...person(), services: [{ ...person().services![0], id: 'wrong' }] }] }],
  ['pagination', { nextPage: 2 }], ['metrics', { items: [{ ...person(), completedOrders30d: -1 }] }],
] as const)('rejects an invalid %s acknowledgement without publishing it', async (_name, invalid) => {
  get.mockResolvedValue(packet(invalid as Partial<GameDiscoveryPage>)); await render();
  expect(result.items).toEqual([]); expect(result.error).toBe('DISCOVERY_RESPONSE_INVALID'); expect(result.loading).toBe(false);
});
it('rejects a late old-game result and hides old cards while loading a new game', async () => {
  const pending = deferred<GameDiscoveryPage>(); get.mockReturnValueOnce(pending.promise); const root = await render();
  get.mockResolvedValue(packet({ gameId: 'pubg', gameName: 'PUBG Mobile', items: [person('mobile', 'PUBG Mobile')] }));
  await act(async () => root.update(React.createElement(Host, { game: 'pubg' })));
  await act(async () => pending.resolve(packet())); expect(result.items.map(p => p.id)).toEqual(['mobile']);
});
it('ignores an old filter result after a newer sort acknowledgement', async () => {
  await render(); const pending = deferred<GameDiscoveryPage>(); get.mockReturnValueOnce(pending.promise); let old!: Promise<void>;
  await act(async () => { old = result.refresh(); }); const sorted = { ...defaults, sort: 'SCORE' as const };
  get.mockResolvedValue(packet({ query: sorted, items: [person('new')] }));
  const root = roots[0]; await act(async () => root.update(React.createElement(Host, { query: sorted })));
  await act(async () => { pending.resolve(packet()); await old; }); expect(result.items[0].id).toBe('new');
});
it('locks duplicate load-more and deduplicates IDs across live pages', async () => {
  get.mockResolvedValueOnce(packet({ items: rows(20), total: 22, onlineCount: 22, nextPage: 2 })); await render();
  const pending = deferred<GameDiscoveryPage>(); get.mockReturnValueOnce(pending.promise); let first!: Promise<void>;
  await act(async () => { first = result.loadMore(); await result.loadMore(); }); expect(get).toHaveBeenCalledTimes(2);
  await act(async () => { pending.resolve(packet({ page: 2, items: [person('p19'), person('p20')], total: 22, onlineCount: 22 })); await first; });
  expect(result.items).toHaveLength(21); expect(new Set(result.items.map(p => p.id)).size).toBe(21); expect(result.hasMore).toBe(false);
});
it('refreshes the retained pagination frontier instead of discarding a loaded page', async () => {
  get.mockImplementation(async (_game, query, page) => packet({ query, page, items: page === 1 ? rows(20) : rows(2, 20), total: 22, onlineCount: 22, nextPage: page === 1 ? 2 : null }));
  await render(); await act(async () => { await result.loadMore(); }); expect(result.items).toHaveLength(22);
  get.mockClear(); await act(async () => { await result.refresh(); }); expect(get.mock.calls.map(c => c[2])).toEqual([1, 2]); expect(result.items).toHaveLength(22);
});
it('invalidates old acknowledgements immediately through logout and A-B-A events', async () => {
  await render(); const pending = deferred<GameDiscoveryPage>(); get.mockReturnValueOnce(pending.promise); let old!: Promise<void>;
  await act(async () => { old = result.refresh(); browser.dispatchEvent(new CustomEvent('le3eb:session', { detail: null })); });
  expect(result.items).toEqual([]); get.mockResolvedValue(packet({ items: [person('current')] }));
  await act(async () => { browser.dispatchEvent(new CustomEvent('le3eb:session', { detail: { token: 'tokenB', user: { id: 'B' } } })); browser.dispatchEvent(new CustomEvent('le3eb:session', { detail: { token: 'tokenA', user: { id: 'A' } } })); });
  await act(async () => { pending.resolve(packet()); await old; }); expect(result.items.map(p => p.id)).toEqual(['current']);
});
it('allows a new same-owner token read without an old read releasing its lock', async () => {
  const pending = deferred<GameDiscoveryPage>(); get.mockReturnValueOnce(pending.promise); const root = await render();
  const current = deferred<GameDiscoveryPage>(); get.mockReturnValueOnce(current.promise);
  await act(async () => root.update(React.createElement(Host, { token: 'rotated' })));
  await act(async () => pending.resolve(packet())); expect(result.loading).toBe(true); expect(result.items).toEqual([]);
  await act(async () => current.resolve(packet({ items: [person('rotated')] }))); expect(result.items[0].id).toBe('rotated');
});
it('does not load for inactive views and ignores an acknowledgement after unmount', async () => {
  const root = await render({ active: false }); expect(get).not.toHaveBeenCalled();
  const pending = deferred<GameDiscoveryPage>(); get.mockReturnValueOnce(pending.promise); await act(async () => root.update(React.createElement(Host, {})));
  await act(async () => root.unmount()); roots = []; await act(async () => pending.resolve(packet())); expect(result.items).toEqual([]);
});
