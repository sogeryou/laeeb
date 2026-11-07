import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { authApi } from '../../client/features/auth/api';
import { useAuthFlow } from '../../client/features/auth/useAuthFlow';
import { clearSession, storeSession } from '../../client/features/auth/session';
import { navigateAuth } from '../../client/features/auth/routing';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthExperience } from '../../client/features/auth/AuthExperience';
let app: any, flow: ReturnType<typeof useAuthFlow>, root: ReactTestRenderer | null;
vi.mock('../../client/app/AppContext', () => ({ useApp: () => app }));
vi.mock('../../client/features/auth/routing', () => ({ navigateAuth: vi.fn() }));
const storage = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }; };
const user = { id: 'A', username: 'New player', email: 'a@local.test', role: 'USER' as const, permissions: [], profileComplete: true, accountStatus: 'ACTIVE' as const };
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; };
beforeEach(() => { root = null; vi.stubGlobal('window', Object.assign(new EventTarget(), { setInterval, clearInterval })); vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage()); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); clearSession();
  vi.spyOn(authApi, 'config').mockResolvedValue({ serverDate: '2026-10-14', maxBirthDate: '2008-10-14', termsVersion: '2026-10-08', privacyVersion: '2026-10-08', emailDelivery: 'development' });
  vi.spyOn(authApi, 'preferences'); app = { locale: 'en', authToken: null, authUser: null, authSessionReady: false, finishAuthSession: vi.fn() };
});
afterEach(async () => { if (root) await act(async () => root!.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function render(step: any = 'profile') { const Host = () => { flow = useAuthFlow(step); return null; }; await act(async () => { root = create(React.createElement(Host)); }); }
async function registration() { vi.spyOn(authApi, 'verify').mockResolvedValue({ kind: 'registration', registrationToken: 'grant', email: user.email, expiresAt: Date.now() + 60_000 }); await render(); await act(async () => { await flow.verify(); flow.chooseAvatar('sage'); flow.setUsername(user.username); flow.setGender('U'); flow.setBirthDate('1995-01-01'); flow.setConsent(true); }); }
it('completes registration directly without submitting preferences', async () => {
  await registration(); vi.spyOn(authApi, 'register').mockResolvedValue({ token: 'registered', user }); await act(async () => { await flow.completeProfile(); });
  expect(app.finishAuthSession).toHaveBeenCalledTimes(1); expect(app.finishAuthSession).toHaveBeenCalledWith({ token: 'registered', user }, false); expect(authApi.preferences).not.toHaveBeenCalled();
});
it('does not accept a delayed registration after unmount', async () => {
  await registration(); const pending = deferred<any>(); vi.spyOn(authApi, 'register').mockReturnValue(pending.promise); let operation!: Promise<void>;
  await act(async () => { operation = flow.completeProfile(); root!.unmount(); }); root = null; await act(async () => { pending.resolve({ token: 'obsolete', user }); await operation; });
  expect(localStorage.getItem('business_workbench_token')).toBeNull(); expect(app.finishAuthSession).not.toHaveBeenCalled();
});
it.each([['login', null], ['profile', { ...user, profileComplete: false }], ['restricted', { ...user, accountStatus: 'SUSPENDED' }]])('redirects a legacy interests URL to %s', async (target, value) => {
  app = { ...app, authSessionReady: true, authUser: value, authToken: value ? 'verified' : null }; await render('interests'); expect(navigateAuth).toHaveBeenCalledWith(target, true); expect(authApi.preferences).not.toHaveBeenCalled();
});
it('completes a verified legacy interests URL once without profile/preferences writes', async () => {
  storeSession({ token: 'verified', user }); app = { ...app, authSessionReady: true, authUser: user, authToken: 'verified' }; await render('interests');
  expect(app.finishAuthSession).toHaveBeenCalledTimes(1); expect(app.finishAuthSession).toHaveBeenCalledWith({ token: 'verified', user }, false); expect(authApi.preferences).not.toHaveBeenCalled();
});
it('renders exactly two registration progress steps', () => {
  const markup = renderToStaticMarkup(React.createElement(AuthExperience, { step: 'profile' }));
  expect(markup.match(/class="auth-progress-step /g)).toHaveLength(2);
});
it('does not finish twice when a current login effect reenters after token rotation', async () => {
  storeSession({ token: 'verified', user }); app = { ...app, authSessionReady: true, authUser: user, authToken: 'verified' };
  function Host() { flow = useAuthFlow('login'); return null; } await act(async () => { root = create(React.createElement(Host)); });
  storeSession({ token: 'rotated', user }); app = { ...app, authUser: { ...user }, authToken: 'rotated' }; await act(async () => { root!.update(React.createElement(Host)); });
  expect(app.finishAuthSession).toHaveBeenCalledTimes(1);
});
it('replaces a direct profile URL without a current user or registration grant with login', async () => {
  app.authSessionReady = true; await render('profile'); expect(navigateAuth).toHaveBeenCalledWith('login', true); expect(navigateAuth).not.toHaveBeenCalledWith('register', true);
});
it('preserves the in-memory verified registration grant when entering profile', async () => {
  app.authSessionReady = true; let step: any = 'login'; function Host() { flow = useAuthFlow(step); return null; }
  vi.spyOn(authApi, 'verify').mockResolvedValue({ kind: 'registration', registrationToken: 'grant', email: user.email, expiresAt: Date.now() + 60_000 });
  await act(async () => { root = create(React.createElement(Host)); }); await act(async () => { await flow.verify(); }); vi.mocked(navigateAuth).mockClear();
  step = 'profile'; await act(async () => { root!.update(React.createElement(Host)); }); expect(navigateAuth).not.toHaveBeenCalled();
});
it('does not resurrect missing credentials through the login completion effect', async () => {
  app = { ...app, authSessionReady: true, authToken: 'stale', authUser: user }; await render('login'); expect(app.finishAuthSession).not.toHaveBeenCalled();
});
