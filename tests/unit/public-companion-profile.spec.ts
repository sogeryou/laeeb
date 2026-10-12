import { act, createElement, useState } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePublicCompanionProfile } from '../../client/hooks/usePublicCompanionProfile';
import { businessApi } from '../../client/services/businessApi';
import type { EPal } from '../../shared/types';

const profile = (id = 'cp'): EPal => ({ id, userId: 'provider', name: 'Player', avatarUrl: '', rating: 0, orderCount: '0', price: 9, game: 'PUBG Mobile', tags: [], bio: 'Current introduction', services: [] });
let root: ReactTestRenderer;
let state: ReturnType<typeof usePublicCompanionProfile>;
let selected: EPal | null;
let select: (p: EPal | null) => void;
function Harness({ view = 'PROFILE', user = 'buyer' }: { view?: string; user?: string }) {
  const [peer, setPeer] = useState<EPal | null>({ ...profile(), bio: 'Old introduction', price: 5 });
  selected = peer; select = setPeer;
  state = usePublicCompanionProfile(view, peer, setPeer, user);
  return null;
}
const deferred = () => { let resolve!: (value: EPal) => void; let reject!: (reason: Error) => void; const promise = new Promise<EPal>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.spyOn(businessApi, 'getPublicCompanionProfile').mockResolvedValue(profile()); });
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('refreshes live profile on entry without looping when the same peer projection changes', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  expect(selected?.bio).toBe('Current introduction'); expect(selected?.price).toBe(9);
  expect(businessApi.getPublicCompanionProfile).toHaveBeenCalledTimes(1);
  expect(state.loading).toBe(false); expect(state.error).toBe('');
});
it('refreshes when returning from checkout to profile', async () => {
  await act(async () => { root = create(createElement(Harness)); });
  await act(async () => root.update(createElement(Harness, { view: 'ORDER_CONFIRM' })));
  vi.mocked(businessApi.getPublicCompanionProfile).mockResolvedValue({ ...profile(), price: 12 });
  await act(async () => root.update(createElement(Harness)));
  expect(selected?.price).toBe(12); expect(businessApi.getPublicCompanionProfile).toHaveBeenCalledTimes(2);
});
it('ignores old peer responses and reports loading for the current peer', async () => {
  const a = deferred(), b = deferred();
  vi.mocked(businessApi.getPublicCompanionProfile).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  await act(async () => { root = create(createElement(Harness)); });
  await act(async () => select({ ...profile('other'), bio: 'Other old bio' }));
  await act(async () => a.resolve(profile()));
  expect(selected?.id).toBe('other'); expect(state.loading).toBe(true);
  await act(async () => b.resolve({ ...profile('other'), bio: 'Other current bio' }));
  expect(selected?.bio).toBe('Other current bio'); expect(state.loading).toBe(false);
});
it('does not replace the selected profile from an obsolete account or departed view', async () => {
  const a = deferred(); vi.mocked(businessApi.getPublicCompanionProfile).mockReturnValueOnce(a.promise);
  await act(async () => { root = create(createElement(Harness)); });
  await act(async () => root.update(createElement(Harness, { view: 'HOME', user: 'other' })));
  await act(async () => a.resolve(profile()));
  expect(selected?.bio).toBe('Old introduction');
});
it('exposes read failure and supports retry instead of silently using stale data', async () => {
  vi.mocked(businessApi.getPublicCompanionProfile).mockRejectedValueOnce(new Error('Unavailable'));
  await act(async () => { root = create(createElement(Harness)); });
  expect(state.error).toBe('Unavailable');
  await act(async () => { await state.refresh(); });
  expect(state.error).toBe(''); expect(selected?.bio).toBe('Current introduction');
});
it('does not request prototype or ordinary buyer profiles without a provider user ID', async () => {
  await act(async () => { root = create(createElement(Harness, { view: 'HOME' })); });
  await act(async () => select({ ...profile(), userId: undefined }));
  await act(async () => root.update(createElement(Harness)));
  expect(businessApi.getPublicCompanionProfile).not.toHaveBeenCalled();
});
it('hydrates a companion opened from a service-less chat summary', async () => {
  await act(async () => { root = create(createElement(Harness, { view: 'HOME' })); });
  await act(async () => select({ ...profile(), services: undefined, bio: undefined }));
  await act(async () => root.update(createElement(Harness)));
  expect(businessApi.getPublicCompanionProfile).toHaveBeenCalledWith('cp');
  expect(selected?.bio).toBe('Current introduction');
  expect(selected?.services).toEqual([]);
});
it('does not query companion services for an ordinary customer chat participant', async () => {
  await act(async () => { root = create(createElement(Harness, { view: 'HOME' })); });
  await act(async () => select({ ...profile('customer'), userId: 'customer', services: undefined }));
  await act(async () => root.update(createElement(Harness)));
  expect(businessApi.getPublicCompanionProfile).not.toHaveBeenCalled();
  expect(state.loading).toBe(false);
});
