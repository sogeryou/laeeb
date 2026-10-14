import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../shared/auth';
import { authApi } from '../../client/features/auth/api';
import * as sessions from '../../client/features/auth/session';
import { businessApi } from '../../client/services/businessApi';
import { refreshApplicationOwnerSession } from '../../client/components/application/approvedSession';

const user = (id = 'A', username = 'Before'): AuthUser => ({ id, username, email: `${id}@local.test`, role: 'USER', permissions: [], profileComplete: true, accountStatus: 'ACTIVE' });
const storage = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }; };
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; };
beforeEach(() => { vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage()); vi.stubGlobal('window', new EventTarget()); sessions.clearSession(); sessions.storeSession({ token: 'old-token', refreshToken: 'old-refresh', user: user() }); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('publishes a confirmed same-owner profile with the currently rotated token, never an obsolete token', async () => {
  expect(typeof sessions.publishProfileUser).toBe('function');
  localStorage.setItem('business_workbench_token', 'rotated-token');
  const event = vi.fn(); window.addEventListener(sessions.AUTH_SESSION_EVENT, event);
  expect(sessions.publishProfileUser(user('A', 'Saved'), () => true)).toBe(true);
  expect(event.mock.calls[0][0].detail).toEqual({ token: 'rotated-token', user: user('A', 'Saved') });
  expect(localStorage.getItem('le3eb_refresh_token')).toBe('old-refresh');
  expect(sessions.publishProfileUser(user('B'), () => true)).toBe(false);
  expect(sessions.publishProfileUser(user(), () => false)).toBe(false);
  sessions.clearSession(); expect(sessions.publishProfileUser(user(), () => true)).toBe(false);
});

it('does not return a pre-save restore lookup after a confirmed identity update', async () => {
  expect(typeof sessions.publishProfileUser).toBe('function');
  const pending = deferred<AuthUser>(); vi.spyOn(authApi, 'session').mockReturnValueOnce(pending.promise);
  const operation = sessions.restoreSession();
  sessions.publishProfileUser(user('A', 'Saved'), () => true); pending.resolve(user());
  expect(await operation).toBeNull();
});

it('keeps rotated credentials without publishing a stale pre-save refresh lookup', async () => {
  expect(typeof sessions.publishProfileUser).toBe('function');
  vi.spyOn(authApi, 'refresh').mockResolvedValue({ token: 'rotated-token', refreshToken: 'rotated-refresh' });
  const pending = deferred<AuthUser>(); vi.spyOn(authApi, 'session').mockReturnValueOnce(pending.promise);
  const event = vi.fn(); window.addEventListener(sessions.AUTH_SESSION_EVENT, event);
  const operation = sessions.refreshSession(); await Promise.resolve(); await Promise.resolve();
  sessions.publishProfileUser(user('A', 'Saved'), () => true); pending.resolve(user());
  expect(await operation).toBe('rotated-token');
  expect(event.mock.calls.map(call => call[0].detail.user.username)).toEqual(['Saved']);
  expect(localStorage.getItem('business_workbench_token')).toBe('rotated-token');
  expect(localStorage.getItem('le3eb_refresh_token')).toBe('rotated-refresh');
});

it('does not let an older application role lookup republish pre-save identity', async () => {
  const pending = deferred<AuthUser>(); vi.spyOn(businessApi, 'getSession').mockReturnValueOnce(pending.promise);
  const event = vi.fn(); window.addEventListener(sessions.AUTH_SESSION_EVENT, event);
  const operation = refreshApplicationOwnerSession('old-token', 'A', () => true, 'PLAYER');
  sessions.publishProfileUser({ ...user('A', 'Saved'), role: 'PLAYER' }, () => true);
  pending.resolve({ ...user(), role: 'PLAYER' }); expect(await operation).toBe(false);
  expect(event.mock.calls.map(call => call[0].detail.user.username)).toEqual(['Saved']);
});
