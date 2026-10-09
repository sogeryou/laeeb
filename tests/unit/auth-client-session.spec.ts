import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../shared/auth';
import { BUSINESS_TOKEN_KEY } from '../../client/router/routes';
import { authApi, AuthApiError } from '../../client/features/auth/api';
import { clearSession, refreshSession, restoreSession, storeSession } from '../../client/features/auth/session';

const user = (id: string): AuthUser => ({ id, email: `${id}@local.test`, username: id, role: 'USER', permissions: [], profileComplete: true, accountStatus: 'ACTIVE' });
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const memoryStorage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
};
class TestCustomEvent extends Event {
  detail: unknown;
  constructor(name: string, init: { detail: unknown }) { super(name); this.detail = init.detail; }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('sessionStorage', memoryStorage());
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('CustomEvent', TestCustomEvent);
  clearSession();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('client session response ordering', () => {
  it('does not revoke the current device when profile metadata changes during refresh', async () => {
    storeSession({ token: 'access-a', refreshToken: 'refresh-a', user: user('a') });
    const request = deferred<{ token: string; refreshToken: string }>();
    vi.spyOn(authApi, 'refresh').mockReturnValueOnce(request.promise);
    vi.spyOn(authApi, 'session').mockResolvedValueOnce({ ...user('a'), username: 'Updated' });
    const logout = vi.spyOn(authApi, 'logout').mockResolvedValue({ ok: true });
    const refreshing = refreshSession();
    storeSession({ token: 'access-a', user: { ...user('a'), username: 'Updated' } });
    request.resolve({ token: 'access-rotated', refreshToken: 'refresh-rotated' });
    expect(await refreshing).toBe('access-rotated');
    expect(logout).not.toHaveBeenCalled();
  });
  it('does not restore an old account after the user logs out', async () => {
    storeSession({ token: 'access-a', refreshToken: 'refresh-a', user: user('a') });
    const request = deferred<AuthUser>();
    vi.spyOn(authApi, 'session').mockReturnValueOnce(request.promise);
    const restoring = restoreSession();
    clearSession();
    request.resolve(user('a'));
    expect(await restoring).toBeNull();
    expect(localStorage.getItem(BUSINESS_TOKEN_KEY)).toBeNull();
  });

  it('does not erase a newer login when an old refresh is rejected', async () => {
    storeSession({ token: 'access-a', refreshToken: 'refresh-a', user: user('a') });
    const request = deferred<{ token: string; refreshToken: string }>();
    vi.spyOn(authApi, 'refresh').mockReturnValueOnce(request.promise);
    const refreshing = refreshSession();
    storeSession({ token: 'access-b', refreshToken: 'refresh-b', user: user('b') });
    request.reject(new AuthApiError('AUTH_REFRESH_INVALID', 401));
    await refreshing.catch(() => {});
    expect(localStorage.getItem(BUSINESS_TOKEN_KEY)).toBe('access-b');
    expect(localStorage.getItem('le3eb_refresh_token')).toBe('refresh-b');
  });

  it('does not use an old failed restore to refresh or clear a newer account', async () => {
    storeSession({ token: 'access-a', refreshToken: 'refresh-a', user: user('a') });
    const request = deferred<AuthUser>();
    vi.spyOn(authApi, 'session').mockReturnValueOnce(request.promise);
    const refreshing = vi.spyOn(authApi, 'refresh');
    const restoring = restoreSession();
    storeSession({ token: 'access-b', refreshToken: 'refresh-b', user: user('b') });
    request.reject(new AuthApiError('AUTH_UNAUTHORIZED', 401));
    expect(await restoring).toBeNull();
    expect(refreshing).not.toHaveBeenCalled();
    expect(localStorage.getItem(BUSINESS_TOKEN_KEY)).toBe('access-b');
  });

  it('shares an in-flight refresh and keeps rotated credentials on a transient lookup failure', async () => {
    storeSession({ token: 'access-a', refreshToken: 'refresh-a', user: user('a') });
    const request = deferred<{ token: string; refreshToken: string }>();
    const refresh = vi.spyOn(authApi, 'refresh').mockReturnValueOnce(request.promise);
    vi.spyOn(authApi, 'session').mockRejectedValueOnce(new AuthApiError('NETWORK_ERROR', 0));
    const first = refreshSession(); const second = refreshSession();
    request.resolve({ token: 'access-rotated', refreshToken: 'refresh-rotated' });
    await Promise.allSettled([first, second]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(BUSINESS_TOKEN_KEY)).toBe('access-rotated');
    expect(localStorage.getItem('le3eb_refresh_token')).toBe('refresh-rotated');
  });
});
