import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAppState } from '../../client/app/useAppState';
import { authApi, AuthApiError } from '../../client/features/auth/api';
import { clearSession, storeSession } from '../../client/features/auth/session';
import { businessApi } from '../../client/services/businessApi';
import type { AuthUser } from '../../shared/auth';
import { AppProvider, useApp } from '../../client/app/AppContext';
import { UserEntryGate } from '../../client/features/auth/UserEntryGate';
vi.mock('../../client/features/auth/AuthExperience', () => ({ AuthExperience: ({ step }: any) => React.createElement('form', null, step) }));
vi.mock('../../client/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'en', t: translate }) }));
vi.mock('../../client/hooks/useDeviceId', () => ({ useDeviceId: () => 'local-device' }));
vi.mock('../../client/hooks/useSocial', () => ({ useSocial: () => ({ posts: [], chatSessions: [], currentMessages: [], setCurrentMessages: vi.fn() }) }));
vi.mock('../../client/hooks/useOrders', () => ({ useOrders: () => ({ items: [], coupons: [], refresh: vi.fn() }) }));
vi.mock('../../client/hooks/useNotifications', () => ({ useNotifications: () => ({}) }));
vi.mock('../../client/hooks/useAccountProfile', () => ({ useAccountProfile: () => ({}) }));
vi.mock('../../client/hooks/usePeerIdentity', () => ({ usePeerIdentity: () => ({}) }));
vi.mock('../../client/hooks/usePublicCompanionProfile', () => ({ usePublicCompanionProfile: () => ({}) }));
vi.mock('../../client/hooks/useCompanionApplication', () => ({ useCompanionApplication: () => ({ application: null, draft: {}, setDraft: vi.fn() }) }));
const translate = (key: string) => key;
const storage = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }; };
const deferred = <T,>() => { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const user = (id = 'A'): AuthUser => ({ id, email: `${id}@local.test`, username: id, role: 'USER', permissions: [], accountStatus: 'ACTIVE', profileComplete: true });
let app: ReturnType<typeof useAppState>, root: ReactTestRenderer | null;
function Host() { app = useAppState(); return null; }
function GateHost() { app = useApp(); return React.createElement(UserEntryGate, null, React.createElement('nav', null, app.currentView)); }
async function signedInComposer() {
  localStorage.setItem('business_workbench_token', 'original'); localStorage.setItem('le3eb_refresh_token', 'refresh');
  vi.spyOn(authApi, 'session').mockResolvedValue(user());
  await act(async () => { root = create(React.createElement(AppProvider, null, React.createElement(GateHost))); });
  await act(async () => { app.setCurrentView('POST_CREATE'); app.setViewHistory(['HOME', 'COMMUNITY', 'POST_CREATE']); app.setSelectedGame({ id: 'composer-game', name: 'Composer game' } as any); });
}
async function render() { await act(async () => { root = create(React.createElement(Host)); }); }
beforeEach(() => {
  root = null; vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { pathname: '/' }, history: { pushState: vi.fn(), replaceState: vi.fn() }, setTimeout, setInterval, clearInterval, scrollTo: vi.fn() }));
  vi.stubGlobal('document', { visibilityState: 'visible' }); vi.stubGlobal('PopStateEvent', Event); vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage()); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  clearSession(); vi.spyOn(businessApi, 'listRechargePackages').mockResolvedValue([]); vi.spyOn(businessApi, 'getWalletBalance').mockResolvedValue({} as any); vi.spyOn(businessApi, 'listWalletTransactions').mockResolvedValue([]); vi.spyOn(businessApi, 'listCompanionRankings').mockResolvedValue([]); vi.spyOn(authApi, 'logout').mockResolvedValue({ ok: true });
});
afterEach(async () => { if (root) await act(async () => root!.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('retains credentials after temporary verification failure and supports explicit retry', async () => {
  localStorage.setItem('business_workbench_token', 'stored'); const pending = deferred<AuthUser>(); vi.spyOn(authApi, 'session').mockReturnValueOnce(pending.promise).mockResolvedValueOnce(user());
  await render(); expect(app.authSessionReady).toBe(false); expect(app.authUser).toBeNull();
  await act(async () => { pending.reject(new Error('offline')); });
  expect(app.authSessionReady).toBe(true); expect(app.authSessionError).toBeTruthy(); expect(localStorage.getItem('business_workbench_token')).toBe('stored'); expect(app.isAuthenticated).toBe(false);
  await act(async () => { await app.retryAuthSession(); }); expect(app.authSessionError).toBe(''); expect(app.authUser?.id).toBe('A');
});
it.each(['success', 'failure'] as const)('ignores obsolete restore %s after a newer login', async outcome => {
  localStorage.setItem('business_workbench_token', 'stored'); const pending = deferred<AuthUser>(); vi.spyOn(authApi, 'session').mockReturnValueOnce(pending.promise); await render();
  await act(async () => { storeSession({ token: 'new', user: user('B') }); });
  await act(async () => { if (outcome === 'success') pending.resolve(user()); else pending.reject(new Error('offline')); });
  expect(app.authUser?.id).toBe('B'); expect(app.authToken).toBe('new'); expect(app.authSessionReady).toBe(true); expect(app.authSessionError).toBe('');
});
it('marks explicitly invalid credentials resolved without admitting an unverified user', async () => {
  localStorage.setItem('business_workbench_token', 'invalid'); vi.spyOn(authApi, 'session').mockRejectedValue(new AuthApiError('AUTH_REQUIRED', 401)); await render();
  expect(localStorage.getItem('business_workbench_token')).toBeNull(); expect(app.authSessionReady).toBe(true); expect(app.authSessionError).toBe(''); expect(app.authUser).toBeNull();
});
it('does not republish restore success after logout and Back', async () => {
  localStorage.setItem('business_workbench_token', 'stored'); const pending = deferred<AuthUser>(); vi.spyOn(authApi, 'session').mockReturnValueOnce(pending.promise); await render();
  await act(async () => { await app.handleLogout(); pending.resolve(user()); }); expect(app.authUser).toBeNull(); expect(app.authToken).toBeNull(); expect(app.authSessionReady).toBe(true);
});
it('restores an expired token through the existing refresh mechanism', async () => {
  localStorage.setItem('business_workbench_token', 'expired'); localStorage.setItem('le3eb_refresh_token', 'refresh');
  vi.spyOn(authApi, 'session').mockRejectedValueOnce(new AuthApiError('AUTH_REQUIRED', 401)).mockResolvedValue(user()); vi.spyOn(authApi, 'refresh').mockResolvedValue({ token: 'rotated', refreshToken: 'rotated-refresh' });
  await render(); expect(app.authUser?.id).toBe('A'); expect(app.authToken).toBe('rotated'); expect(app.authSessionError).toBe('');
});
it('retains rotated credentials and blocks entry when refreshed lookup temporarily fails', async () => {
  localStorage.setItem('business_workbench_token', 'expired'); localStorage.setItem('le3eb_refresh_token', 'refresh');
  vi.spyOn(authApi, 'session').mockRejectedValueOnce(new AuthApiError('AUTH_REQUIRED', 401)).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(user()); vi.spyOn(authApi, 'refresh').mockResolvedValue({ token: 'rotated', refreshToken: 'rotated-refresh' });
  await render(); expect(app.authUser).toBeNull(); expect(app.authSessionError).toBeTruthy(); expect(localStorage.getItem('business_workbench_token')).toBe('rotated');
  await act(async () => { await app.retryAuthSession(); }); expect(app.authToken).toBe('rotated'); expect(app.authUser?.id).toBe('A');
});
it('does not let an older retry failure replace the latest successful verification', async () => {
  localStorage.setItem('business_workbench_token', 'stored'); const older = deferred<AuthUser>(), newer = deferred<AuthUser>(); vi.spyOn(authApi, 'session').mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise); await render(); let retry!: Promise<void>;
  await act(async () => { retry = app.retryAuthSession(); }); await act(async () => { newer.resolve(user()); await retry; }); await act(async () => { older.reject(new Error('obsolete')); });
  expect(app.authSessionError).toBe(''); expect(app.authUser?.id).toBe('A');
});
it('does not publish restoration after unmount', async () => {
  localStorage.setItem('business_workbench_token', 'stored'); const pending = deferred<AuthUser>(); vi.spyOn(authApi, 'session').mockReturnValueOnce(pending.promise); await render();
  const observer = vi.fn(); window.addEventListener('le3eb:session', observer); await act(async () => { root!.unmount(); }); root = null; await act(async () => { pending.resolve(user()); }); expect(observer).not.toHaveBeenCalled();
});
it('does not let a delayed logout response clear a newer login', async () => {
  await render(); await act(async () => { storeSession({ token: 'A', user: user() }); }); const pending = deferred<{ ok: true }>(); vi.mocked(authApi.logout).mockReturnValueOnce(pending.promise); let operation!: Promise<void>;
  await act(async () => { operation = app.handleLogout(); }); expect(app.authUser).toBeNull();
  await act(async () => { storeSession({ token: 'B', user: user('B') }); }); await act(async () => { pending.resolve({ ok: true }); await operation; });
  expect(app.authUser?.id).toBe('B'); expect(localStorage.getItem('business_workbench_token')).toBe('B');
});
it('synchronously replaces a retry-screen profile URL with login on explicit logout', async () => {
  window.location.pathname = '/auth/profile'; localStorage.setItem('business_workbench_token', 'stored'); vi.spyOn(authApi, 'session').mockRejectedValue(new Error('503')); await render();
  expect(app.authSessionError).toBeTruthy(); const pending = deferred<{ ok: true }>(); vi.mocked(authApi.logout).mockReturnValueOnce(pending.promise); let operation!: Promise<void>;
  await act(async () => { operation = app.handleLogout(); expect(window.history.replaceState).toHaveBeenLastCalledWith({}, '', '/auth/login'); });
  expect(app.authUser).toBeNull(); expect(app.authSessionError).toBe(''); await act(async () => { pending.resolve({ ok: true }); await operation; });
});
it.each(['success', 'retry'] as const)('keeps the composer through background refresh %s without login or private shell during lookup', async outcome => {
  await signedInComposer(); const pending = deferred<AuthUser>();
  vi.mocked(authApi.session).mockReturnValueOnce(pending.promise).mockResolvedValue(user());
  vi.spyOn(authApi, 'refresh').mockResolvedValue({ token: 'rotated', refreshToken: 'rotated-refresh' });
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  await act(async () => { app.setViewHistory(['HOME', 'COMMUNITY', 'POST_CREATE']); });
  expect(localStorage.getItem('business_workbench_token')).toBe('rotated');
  const pendingStatus = root!.root.findAllByProps({ role: 'status' }).length;
  const pendingPrivate = root!.root.findAllByType('nav').length, pendingLogin = root!.root.findAllByType('form').length;
  if (outcome === 'retry') {
    await act(async () => { pending.reject(new AuthApiError('unavailable', 503)); });
    expect(root!.root.findAllByProps({ role: 'alert' })).toHaveLength(1);
    expect(localStorage.getItem('business_workbench_token')).toBe('rotated');
    await act(async () => { await root!.root.findAllByType('button')[0].props.onClick(); });
  } else await act(async () => { pending.resolve(user()); });
  expect(pendingStatus).toBe(1); expect(pendingPrivate).toBe(0); expect(pendingLogin).toBe(0);
  expect(app.authToken).toBe('rotated'); expect(app.authSessionError).toBe('');
  expect(root!.root.findByType('nav').children).toEqual(['POST_CREATE']);
  expect(app.viewHistory).toEqual(['HOME', 'COMMUNITY', 'POST_CREATE']); expect(window.history.replaceState).not.toHaveBeenCalled();
  expect(app.selectedGame?.id).toBe('composer-game');
});
it.each([['logout', 'success'], ['logout', 'failure'], ['new-login', 'success'], ['new-login', 'failure']] as const)('ignores stale background verification after %s (%s)', async (change, outcome) => {
  await signedInComposer(); const pending = deferred<AuthUser>(); vi.mocked(authApi.session).mockReturnValueOnce(pending.promise);
  vi.spyOn(authApi, 'refresh').mockResolvedValue({ token: 'rotated', refreshToken: 'rotated-refresh' });
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  await act(async () => { if (change === 'logout') clearSession(); else storeSession({ token: 'B', user: user('B') }); });
  await act(async () => { if (outcome === 'success') pending.resolve(user()); else pending.reject(new AuthApiError('unavailable', 503)); });
  expect(app.authToken).toBe(change === 'logout' ? null : 'B'); expect(app.authSessionReady).toBe(true); expect(app.authSessionError).toBe('');
});
