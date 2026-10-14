import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { EPal } from '../../shared/types';
import { businessApi } from '../../client/services/businessApi';

let hook: typeof import('../../client/hooks/usePeerIdentity').usePeerIdentity;
let result: ReturnType<typeof hook>;
let roots: ReactTestRenderer[];
const browser = new EventTarget() as EventTarget & { setInterval: typeof setInterval; clearInterval: typeof clearInterval };
browser.setInterval = setInterval; browser.clearInterval = clearInterval;
const person = (id = 'peer', name = 'Before'): EPal => ({ id, userId: id, name, avatarUrl: '/old.png', rating: 0, orderCount: '0', price: 0, game: '', tags: [] });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; };
let selected: EPal | null;
const setter = (value: React.SetStateAction<EPal | null>) => { selected = typeof value === 'function' ? value(selected) : value; };
const Host = ({ view = 'IM_DETAIL', owner = 'A', token = 'A', peer = 'peer' }: { view?: string; owner?: string; token?: string | null; peer?: string }) => { result = hook(view, person(peer), setter, token, owner); return null; };
async function render(props: React.ComponentProps<typeof Host> = {}) {
  const path = '../../client/hooks/usePeerIdentity'; const module = await import(path).catch(() => ({}));
  expect(typeof module.usePeerIdentity).toBe('function'); hook = module.usePeerIdentity;
  let root!: ReactTestRenderer; await act(async () => { root = create(React.createElement(Host, props)); }); roots.push(root); return root;
}
beforeEach(() => { roots = []; selected = person(); vi.stubGlobal('window', browser); vi.stubGlobal('document', { visibilityState: 'visible' }); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(async () => { await act(async () => { roots.forEach(root => root.unmount()); }); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('refreshes real chat identity while preserving existing service and price data', async () => {
  selected = { ...person(), services: [], price: 25, bio: 'Old bio' };
  vi.spyOn(businessApi, 'getSocialPeer').mockResolvedValue({ ...person('peer', 'Saved name'), avatarUrl: '/new.png', bio: 'Saved bio', services: undefined, price: 0 });
  await render(); expect(selected).toMatchObject({ name: 'Saved name', avatarUrl: '/new.png', bio: 'Saved bio', services: [], price: 25 });
});
it('hydrates ordinary public peers without calling the companion service endpoint', async () => {
  const get = vi.spyOn(businessApi, 'getSocialPeer').mockResolvedValue(person('peer', 'Saved name'));
  const publicGet = vi.spyOn(businessApi, 'getPublicCompanionProfile'); await render({ view: 'PROFILE' });
  expect(get).toHaveBeenCalledWith('A', 'peer'); expect(publicGet).not.toHaveBeenCalled(); expect(selected?.name).toBe('Saved name');
});
it('rejects wrong peers and obsolete A-B-A results, including a session event before props update', async () => {
  const get = vi.spyOn(businessApi, 'getSocialPeer').mockResolvedValue(person('wrong', 'Foreign'));
  const root = await render(); expect(selected?.name).toBe('Before'); expect(result.error).toBe('PROFILE_RESPONSE_INVALID');
  const pending = deferred<EPal>(); get.mockReturnValueOnce(pending.promise); let operation!: Promise<void>;
  await act(async () => { operation = result.refresh(); browser.dispatchEvent(new CustomEvent('le3eb:session', { detail: null })); });
  await act(async () => root.update(React.createElement(Host, { owner: 'B', token: 'B', peer: 'peer' })));
  get.mockResolvedValue(person()); await act(async () => root.update(React.createElement(Host, {})));
  await act(async () => { pending.resolve(person('peer', 'Old result')); await operation; }); expect(selected?.name).toBe('Before');
});
it('reports a retryable failure and stops requesting when the peer view is inactive', async () => {
  const get = vi.spyOn(businessApi, 'getSocialPeer').mockRejectedValueOnce(Error('NETWORK_ERROR')).mockResolvedValue(person('peer', 'Saved name'));
  const root = await render(); expect(result.error).toBe('NETWORK_ERROR'); await act(async () => { await result.refresh(); }); expect(result.error).toBe('');
  await act(async () => root.update(React.createElement(Host, { view: 'ME' })));
  const count = get.mock.calls.length; await act(async () => { await result.refresh(); }); expect(get.mock.calls.length).toBe(count);
});
