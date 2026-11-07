import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AppRoot from '../../client/app/AppRoot';
import { clearSession, storeSession } from '../../client/features/auth/session';

let app: any, root: ReactTestRenderer | null;
const shell = vi.fn(() => React.createElement('section', { id: 'private-shell' }));
vi.mock('../../client/app/AppContext', () => ({ AppProvider: ({ children }: any) => children, useApp: () => app }));
vi.mock('../../client/app/AppShell', () => ({ AppShell: () => shell() }));
vi.mock('../../client/app/AdminRoute', () => ({ AdminRoute: () => React.createElement('section', { id: 'admin' }) }));
vi.mock('../../client/features/auth/AuthExperience', () => ({ AuthExperience: ({ step }: any) => React.createElement('section', { id: step }) }));
const storage = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }; };
const user = { id: 'A', email: 'a@local.test', username: 'A', role: 'USER', permissions: [], profileComplete: true, accountStatus: 'ACTIVE' };
let browser: any;
beforeEach(() => {
  root = null; shell.mockClear();
  browser = Object.assign(new EventTarget(), { location: { pathname: '/' }, history: {
    pushState: vi.fn((_a, _b, path) => { browser.location.pathname = path; }),
    replaceState: vi.fn((_a, _b, path) => { browser.location.pathname = path; }),
  } });
  vi.stubGlobal('window', browser); vi.stubGlobal('PopStateEvent', Event);
  vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage()); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  clearSession(); app = { locale: 'en', authSessionReady: true, authSessionError: '', authToken: null, authUser: null,
    retryAuthSession: vi.fn(), handleLogout: vi.fn(), pendingNavigationRef: { current: null }, setShowAuthModal: vi.fn() };
});
afterEach(async () => { if (root) await act(async () => root!.unmount()); vi.unstubAllGlobals(); });
async function render() { await act(async () => { root = create(React.createElement(AppRoot)); }); }
it('routes a missing credential to standalone login without ever mounting the private shell', async () => {
  await render(); expect(browser.location.pathname).toBe('/auth/login'); expect(shell).not.toHaveBeenCalled();
  expect(root!.root.findByProps({ id: 'login' })).toBeTruthy();
});
it('keeps the shell unmounted during initial verification', async () => {
  localStorage.setItem('business_workbench_token', 'stored'); app.authSessionReady = false;
  await render(); expect(shell).not.toHaveBeenCalled(); expect(root!.root.findByProps({ role: 'status' })).toBeTruthy();
});
it.each(['incomplete', 'restricted', 'missing-token', 'unverified'] as const)('blocks an apparently signed-in but %s identity synchronously', async condition => {
  app.authUser = { ...user, profileComplete: condition !== 'incomplete', accountStatus: condition === 'restricted' ? 'FROZEN' : 'ACTIVE' };
  app.authToken = 'stored'; if (condition !== 'missing-token') localStorage.setItem('business_workbench_token', 'stored');
  if (condition === 'unverified') app.authSessionReady = false;
  await render(); expect(shell).not.toHaveBeenCalled();
  if (condition === 'incomplete' || condition === 'restricted') expect(browser.location.pathname).toBe(`/auth/${condition === 'incomplete' ? 'profile' : 'restricted'}`);
});
it('renders the shell only for a verified complete current credential', async () => {
  storeSession({ token: 'stored', user: user as any }); app.authToken = 'stored'; app.authUser = user;
  await render(); expect(shell).toHaveBeenCalledTimes(1);
});
it('offers retry and sign out, never the shell, after a transient read error', async () => {
  localStorage.setItem('business_workbench_token', 'stored'); app.authSessionError = 'NETWORK_ERROR';
  await render(); expect(shell).not.toHaveBeenCalled(); expect(browser.location.pathname).toBe('/');
  const buttons = root!.root.findAllByType('button'); expect(buttons).toHaveLength(2);
  await act(async () => { await buttons[0].props.onClick(); await buttons[1].props.onClick(); });
  expect(app.retryAuthSession).toHaveBeenCalledTimes(1); expect(app.handleLogout).toHaveBeenCalledTimes(1);
});
it('does not revive a private shell after logout and browser Back', async () => {
  storeSession({ token: 'stored', user: user as any }); app.authToken = 'stored'; app.authUser = user; await render(); shell.mockClear();
  clearSession(); app = { ...app, authToken: null, authUser: null };
  await act(async () => root!.update(React.createElement(AppRoot)));
  await act(async () => { browser.location.pathname = '/'; browser.dispatchEvent(new Event('popstate')); });
  expect(shell).not.toHaveBeenCalled(); expect(browser.location.pathname).toBe('/auth/login');
});
