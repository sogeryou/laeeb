import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../shared/auth';
import { authApi } from '../../client/features/auth/api';
import { useAuthFlow } from '../../client/features/auth/useAuthFlow';
import { AUTH_SESSION_EVENT, clearSession, publishProfileUser, storeSession } from '../../client/features/auth/session';
import { navigateAuth } from '../../client/features/auth/routing';

let app: any, flow: ReturnType<typeof useAuthFlow>, root: ReactTestRenderer | null;
vi.mock('../../client/app/AppContext', () => ({ useApp: () => app }));
vi.mock('../../client/features/auth/routing', () => ({ navigateAuth: vi.fn() }));
const browser = new EventTarget() as EventTarget & { setInterval: typeof setInterval; clearInterval: typeof clearInterval };
browser.setInterval = setInterval; browser.clearInterval = clearInterval;
const storage = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }; };
const user = (username = 'Before'): AuthUser => ({ id: 'A', username, email: 'a@local.test', role: 'USER', permissions: [], profileComplete: true, accountStatus: 'ACTIVE', gender: 'U' });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; };
beforeEach(() => { root = null; vi.stubGlobal('window', browser); vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage()); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); clearSession(); storeSession({ token: 'old-token', refreshToken: 'refresh', user: user() });
  vi.spyOn(authApi, 'config').mockResolvedValue({ serverDate: '2026-10-14', maxBirthDate: '2008-10-14', termsVersion: '2026-10-08', privacyVersion: '2026-10-08', emailDelivery: 'development' });
  app = { locale: 'en', authToken: 'old-token', authUser: user(), authSessionReady: false, finishAuthSession: vi.fn() };
});
afterEach(async () => { if (root) await act(async () => root!.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function render(step: 'profile' | 'interests') { const Host = () => { flow = useAuthFlow(step); return null; }; await act(async () => { root = create(React.createElement(Host)); }); }
async function validProfile() { await render('profile'); await act(async () => { flow.chooseAvatar('sage'); flow.setUsername('Onboarding name'); flow.setGender('U'); flow.setBirthDate('1995-01-01'); flow.setConsent(true); }); expect(flow.profileValid).toBe(true); }

it('ignores an onboarding profile acknowledgement after leaving auth and saving a newer profile', async () => {
  const pending = deferred<AuthUser>(); vi.spyOn(authApi, 'completeProfile').mockReturnValueOnce(pending.promise); await validProfile();
  const event = vi.fn(); browser.addEventListener(AUTH_SESSION_EVENT, event); let operation!: Promise<void>;
  await act(async () => { operation = flow.completeProfile(); root!.unmount(); }); root = null;
  publishProfileUser(user('Saved name'), () => true); pending.resolve(user('Onboarding name')); await operation;
  expect(event.mock.calls.map(call => call[0].detail.user.username)).toEqual(['Saved name']); expect(navigateAuth).not.toHaveBeenCalled(); browser.removeEventListener(AUTH_SESSION_EVENT, event);
});
it('does not finish an old interests step after leaving auth and saving a newer profile', async () => {
  const pending = deferred<{ tags: string[] }>(); vi.spyOn(authApi, 'preferences').mockReturnValueOnce(pending.promise);
  await render('interests'); await act(async () => { flow.toggleTag('pubg'); }); let operation!: Promise<void>;
  await act(async () => { operation = flow.finish(); root!.unmount(); }); root = null;
  publishProfileUser(user('Saved name'), () => true); pending.resolve({ tags: ['pubg'] }); await operation;
  expect(app.finishAuthSession).not.toHaveBeenCalled();
});
it('publishes an onboarding profile with current credentials after a same-owner token rotation', async () => {
  const pending = deferred<AuthUser>(); vi.spyOn(authApi, 'completeProfile').mockReturnValueOnce(pending.promise); await validProfile();
  const event = vi.fn(); browser.addEventListener(AUTH_SESSION_EVENT, event); let operation!: Promise<void>;
  await act(async () => { operation = flow.completeProfile(); }); localStorage.setItem('business_workbench_token', 'rotated-token');
  await act(async () => { pending.resolve(user('Onboarding name')); await operation; });
  expect(event.mock.calls[0][0].detail.token).toBe('rotated-token'); browser.removeEventListener(AUTH_SESSION_EVENT, event);
});

it('does not publish an old registration response after another account signs in', async () => {
  clearSession(); app = { ...app, authToken: null, authUser: null };
  vi.spyOn(authApi, 'verify').mockResolvedValueOnce({ kind: 'registration', registrationToken: 'local-grant-token', email: 'a@local.test', expiresAt: Date.now() + 60_000 });
  const pending = deferred<any>(); vi.spyOn(authApi, 'register').mockReturnValueOnce(pending.promise);
  await render('profile'); await act(async () => { await flow.verify(); });
  await act(async () => { flow.chooseAvatar('sage'); flow.setUsername('Onboarding name'); flow.setGender('U'); flow.setBirthDate('1995-01-01'); flow.setConsent(true); });
  vi.mocked(navigateAuth).mockClear(); let operation!: Promise<void>; await act(async () => { operation = flow.completeProfile(); });
  storeSession({ token: 'account-B', user: { ...user('Other account'), id: 'B' } });
  await act(async () => { pending.resolve({ token: 'old-registration', user: user('Onboarding name'), refreshToken: 'old-registration-refresh' }); await operation; });
  expect(localStorage.getItem('business_workbench_token')).toBe('account-B'); expect(navigateAuth).not.toHaveBeenCalled();
});

it('finishes a current interests step using the rotated token', async () => {
  const pending = deferred<{ tags: string[] }>(); vi.spyOn(authApi, 'preferences').mockReturnValueOnce(pending.promise);
  await render('interests'); await act(async () => { flow.toggleTag('pubg'); }); let operation!: Promise<void>;
  await act(async () => { operation = flow.finish(); }); localStorage.setItem('business_workbench_token', 'rotated-token');
  await act(async () => { pending.resolve({ tags: ['pubg'] }); await operation; });
  expect(app.finishAuthSession).toHaveBeenCalledWith({ token: 'rotated-token', user: { ...user(), tags: ['pubg'] } }, false);
});
