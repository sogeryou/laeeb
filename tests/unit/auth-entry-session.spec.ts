import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AppRoot from '../../client/app/AppRoot';
import { useApp } from '../../client/app/AppContext';
import { businessApi } from '../../client/services/businessApi';
import { authApi, AuthApiError } from '../../client/features/auth/api';
import { clearSession, storeSession } from '../../client/features/auth/session';
import type { AuthUser } from '../../shared/auth';

vi.mock('../../client/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'en', t: translate }) }));
vi.mock('../../client/hooks/useDeviceId', () => ({ useDeviceId: () => 'local-device' }));
vi.mock('../../client/hooks/useSocial', () => ({ useSocial: () => ({ posts: [], chatSessions: [], currentMessages: [], setCurrentMessages: vi.fn() }) }));
vi.mock('../../client/hooks/useOrders', () => ({ useOrders: () => ({ items: [], coupons: [], refresh: vi.fn() }) }));
vi.mock('../../client/hooks/useNotifications', () => ({ useNotifications: () => ({}) }));
vi.mock('../../client/hooks/useAccountProfile', () => ({ useAccountProfile: () => ({}) }));
vi.mock('../../client/hooks/usePeerIdentity', () => ({ usePeerIdentity: () => ({}) }));
vi.mock('../../client/hooks/usePublicCompanionProfile', () => ({ usePublicCompanionProfile: () => ({}) }));
vi.mock('../../client/hooks/useCompanionApplication', () => ({ useCompanionApplication: () => ({ application: null, draft: {}, setDraft: vi.fn() }) }));
vi.mock('../../client/app/AppShell', () => ({ AppShell: () => { shell(); return React.createElement('section', { id: 'private-shell' }); } }));
vi.mock('../../client/app/AdminRoute', () => ({ AdminRoute: () => React.createElement('section', { id: 'admin' }) }));
vi.mock('../../client/features/auth/AuthExperience', () => ({ AuthExperience: ({ step }: any) => React.createElement('section', { id: step }) }));
// Keep the real provider and capture its public state even while the shell is gated.
vi.mock('../../client/features/auth/UserEntryGate', async importOriginal => {
  const actual = await importOriginal<any>();
  return { ...actual, UserEntryGate: (props: any) => { app = useApp(); return React.createElement(actual.UserEntryGate, props); } };
});
const translate = (key: string) => key;
const shell = vi.fn();
const storage = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }; };
const user = (id = 'A'): AuthUser => ({ id, email: `${id}@local.test`, username: id, role: 'USER', permissions: [], accountStatus: 'ACTIVE', profileComplete: true });
const deferred = <T,>() => { let resolve!: (value: T) => void, reject!: (reason: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
let app: ReturnType<typeof useApp>, root: ReactTestRenderer | null, browser: any;
beforeEach(() => {
  root = null; shell.mockClear();
  browser = Object.assign(new EventTarget(), { location: { pathname: '/' }, history: {
    pushState: vi.fn((_a, _b, path) => { browser.location.pathname = path; }), replaceState: vi.fn((_a, _b, path) => { browser.location.pathname = path; }),
  }, setTimeout, setInterval, clearInterval, scrollTo: vi.fn() });
  vi.stubGlobal('window', browser); vi.stubGlobal('document', { visibilityState: 'visible' }); vi.stubGlobal('PopStateEvent', Event);
  vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage()); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.useFakeTimers(); clearSession();
  vi.spyOn(authApi, 'logout').mockResolvedValue({ ok: true });
  vi.spyOn(businessApi, 'listRechargePackages').mockResolvedValue([]); vi.spyOn(businessApi, 'getWalletBalance').mockResolvedValue({} as any);
  vi.spyOn(businessApi, 'listWalletTransactions').mockResolvedValue([]); vi.spyOn(businessApi, 'listCompanionRankings').mockResolvedValue([]);
});
afterEach(async () => { if (root) await act(async () => root!.unmount()); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function render() { await act(async () => { root = create(React.createElement(AppRoot)); }); }
function credentials() { localStorage.setItem('business_workbench_token', 'stored'); localStorage.setItem('le3eb_refresh_token', 'refresh'); }
it('does not mount the app until the real initial session lookup resolves', async () => {
  credentials(); const pending = deferred<AuthUser>(); vi.spyOn(authApi, 'session').mockReturnValueOnce(pending.promise);
  await render(); expect(shell).not.toHaveBeenCalled(); expect(app.authSessionReady).toBe(false);
  await act(async () => pending.resolve(user())); expect(app.authSessionReady).toBe(true); expect(shell).toHaveBeenCalled();
});
it('retains credentials on a 503 and retries the actual startup operation', async () => {
  credentials(); const lookup = vi.spyOn(authApi, 'session').mockRejectedValueOnce(new AuthApiError('SERVER_ERROR', 503)).mockResolvedValueOnce(user());
  await render(); expect(shell).not.toHaveBeenCalled(); expect(app.authSessionError).toBeTruthy(); expect(app.authSessionReady).toBe(true);
  expect(localStorage.getItem('business_workbench_token')).toBe('stored'); expect(localStorage.getItem('le3eb_refresh_token')).toBe('refresh');
  await act(async () => { await app.retryAuthSession(); }); expect(lookup).toHaveBeenCalledTimes(2); expect(app.authSessionError).toBe(''); expect(shell).toHaveBeenCalled();
});
it('allows local logout while a failed restore has retained credentials', async () => {
  credentials(); vi.spyOn(authApi, 'session').mockRejectedValueOnce(new AuthApiError('NETWORK_ERROR', 0));
  await render(); await act(async () => { await app.handleLogout(); });
  expect(localStorage.getItem('business_workbench_token')).toBeNull(); expect(app.authSessionError).toBe(''); expect(shell).not.toHaveBeenCalled(); expect(browser.location.pathname).toBe('/auth/login');
});
it('refreshes an expired credential before allowing entry', async () => {
  credentials(); vi.spyOn(authApi, 'session').mockRejectedValueOnce(new AuthApiError('AUTH_UNAUTHORIZED', 401)).mockResolvedValue(user());
  vi.spyOn(authApi, 'refresh').mockResolvedValueOnce({ token: 'rotated', refreshToken: 'new-refresh' }); await render();
  expect(app.authToken).toBe('rotated'); expect(app.authSessionError).toBe(''); expect(shell).toHaveBeenCalled();
});
it('keeps rotated credentials retryable if lookup fails after refresh', async () => {
  credentials(); vi.spyOn(authApi, 'session').mockRejectedValueOnce(new AuthApiError('AUTH_UNAUTHORIZED', 401)).mockRejectedValueOnce(new AuthApiError('NETWORK_ERROR', 0)).mockResolvedValue(user());
  vi.spyOn(authApi, 'refresh').mockResolvedValueOnce({ token: 'rotated', refreshToken: 'new-refresh' }); await render();
  expect(localStorage.getItem('business_workbench_token')).toBe('rotated'); expect(app.authSessionError).toBeTruthy(); expect(shell).not.toHaveBeenCalled();
  await act(async () => { await app.retryAuthSession(); }); expect(app.authToken).toBe('rotated'); expect(shell).toHaveBeenCalled();
});
it('clears explicitly invalid credentials after failed refresh and enters login', async () => {
  credentials(); vi.spyOn(authApi, 'session').mockRejectedValueOnce(new AuthApiError('AUTH_UNAUTHORIZED', 401));
  vi.spyOn(authApi, 'refresh').mockRejectedValueOnce(new AuthApiError('AUTH_REFRESH_INVALID', 401)); await render();
  expect(localStorage.getItem('business_workbench_token')).toBeNull(); expect(app.authSessionError).toBe(''); expect(shell).not.toHaveBeenCalled(); expect(browser.location.pathname).toBe('/auth/login');
});
it.each(['success', 'error'] as const)('ignores an old restore %s after a newer login', async outcome => {
  credentials(); const pending = deferred<AuthUser>(); vi.spyOn(authApi, 'session').mockReturnValueOnce(pending.promise); await render();
  await act(async () => storeSession({ token: 'new-login', user: user('B') }));
  await act(async () => { if (outcome === 'success') pending.resolve(user()); else pending.reject(new AuthApiError('NETWORK_ERROR', 0)); });
  expect(app.authToken).toBe('new-login'); expect(app.authUser?.id).toBe('B'); expect(app.authSessionReady).toBe(true); expect(app.authSessionError).toBe('');
});
it.each(['incomplete', 'restricted'] as const)('never renders the shell for a restored %s account', async condition => {
  credentials(); vi.spyOn(authApi, 'session').mockResolvedValueOnce({ ...user(), profileComplete: condition !== 'incomplete', accountStatus: condition === 'restricted' ? 'FROZEN' : 'ACTIVE' });
  await render(); expect(shell).not.toHaveBeenCalled(); expect(browser.location.pathname).toBe(`/auth/${condition === 'incomplete' ? 'profile' : 'restricted'}`);
});
