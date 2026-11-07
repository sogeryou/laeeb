import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AppRoot from '../../client/app/AppRoot';
let app: any, step: any, root: ReactTestRenderer | null;
vi.mock('../../client/app/AppContext', () => ({ AppProvider: ({ children }: any) => children, useApp: () => app }));
vi.mock('../../client/app/AppShell', () => ({ AppShell: () => React.createElement('nav', null, 'Private navigation') }));
vi.mock('../../client/app/AdminRoute', () => ({ AdminRoute: () => null }));
vi.mock('../../client/features/auth/AuthExperience', () => ({ AuthExperience: ({ step }: any) => React.createElement('form', null, step) }));
vi.mock('../../client/features/auth/routing', () => ({ useAuthStep: () => step, navigateAuth: vi.fn(), rememberReturn: vi.fn() }));
const user = { id: 'A', profileComplete: true, accountStatus: 'ACTIVE', role: 'USER' };
const storage = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }; };
beforeEach(() => { root = null; step = null; vi.stubGlobal('window', { location: { pathname: '/' } }); vi.stubGlobal('localStorage', storage()); localStorage.setItem('business_workbench_token', 'verified'); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); app = { authSessionReady: true, authSessionError: '', authToken: null, authUser: null, locale: 'en', retryAuthSession: vi.fn(), handleLogout: vi.fn() }; });
afterEach(async () => { if (root) await act(async () => root!.unmount()); vi.clearAllMocks(); vi.unstubAllGlobals(); });
async function render() { await act(async () => { root = create(React.createElement(AppRoot)); }); }
it('never mounts private navigation without verified credentials, including a Back to root', async () => { await render(); expect(root!.root.findAllByType('nav')).toHaveLength(0); expect(root!.root.findByType('form').children).toEqual(['login']); });
it('does not mount the shell while restoration is pending', async () => { app.authSessionReady = false; await render(); expect(root!.root.findAllByType('nav')).toHaveLength(0); expect(root!.root.findAllByProps({ role: 'status' })).toHaveLength(1); });
it('mounts the shell only for a verified complete session', async () => { app.authToken = 'verified'; app.authUser = user; await render(); expect(root!.root.findAllByType('nav')).toHaveLength(1); });
it.each([['profile', { ...user, profileComplete: false }], ['restricted', { ...user, accountStatus: 'SUSPENDED' }]])('forces %s before shell even at a direct root URL', async (target, value) => { app.authToken = 'verified'; app.authUser = value; await render(); expect(root!.root.findAllByType('nav')).toHaveLength(0); expect(root!.root.findByType('form').children).toEqual([target]); });
it('offers retry and sign out on a temporary lookup error without exposing the shell', async () => { app.authSessionError = 'Connection unavailable'; await render(); expect(root!.root.findAllByType('nav')).toHaveLength(0); expect(root!.root.findByProps({ role: 'alert' })).toBeTruthy(); const buttons = root!.root.findAllByType('button'); await act(async () => { buttons[0].props.onClick(); }); expect(app.retryAuthSession).toHaveBeenCalledOnce(); });
it('removes an already-mounted shell on logout and keeps it hidden on a Back to root', async () => {
  app.authToken = 'verified'; app.authUser = user; await render(); expect(root!.root.findAllByType('nav')).toHaveLength(1);
  app = { ...app, authToken: null, authUser: null }; step = 'login'; await act(async () => { root!.update(React.createElement(AppRoot)); }); expect(root!.root.findAllByType('nav')).toHaveLength(0);
  step = null; await act(async () => { root!.update(React.createElement(AppRoot)); }); expect(root!.root.findAllByType('nav')).toHaveLength(0);
});
it.each(['profile', 'interests', 'restricted'])('does not render a direct %s URL during pending verification', async value => { app.authSessionReady = false; step = value; await render(); expect(root!.root.findAllByType('form')).toHaveLength(0); expect(root!.root.findAllByType('nav')).toHaveLength(0); });
it.each(['missing', 'mismatch', 'unavailable'])('fails closed for a %s current stored credential', async kind => {
  app.authToken = 'verified'; app.authUser = user;
  if (kind === 'missing') localStorage.removeItem('business_workbench_token');
  if (kind === 'mismatch') localStorage.setItem('business_workbench_token', 'another-account');
  if (kind === 'unavailable') vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Storage unavailable'); } });
  await render(); expect(root!.root.findAllByType('nav')).toHaveLength(0);
});
