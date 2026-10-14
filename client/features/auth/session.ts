import type { AuthSession, AuthUser } from '@shared/auth';
import { BUSINESS_TOKEN_KEY, BUSINESS_UI_AUTH_KEY } from '../../router/routes';
import { authApi, AuthApiError } from './api';

const REFRESH_KEY = 'le3eb_refresh_token';
export const AUTH_SESSION_EVENT = 'le3eb:session';
let refreshing: Promise<string | null> | null = null;
let generation = 0;
let profileGeneration = 0;
let accountGeneration = 0;
let currentUserId: string | null = null;

export function storeSession(session: Pick<AuthSession, 'token' | 'user'> & { refreshToken?: string }) {
  if (currentUserId !== session.user.id) accountGeneration++;
  if (localStorage.getItem(BUSINESS_TOKEN_KEY) !== session.token || currentUserId !== session.user.id) generation += 1;
  localStorage.setItem(BUSINESS_TOKEN_KEY, session.token);
  sessionStorage.setItem(BUSINESS_UI_AUTH_KEY, '1');
  if (session.refreshToken) localStorage.setItem(REFRESH_KEY, session.refreshToken);
  currentUserId = session.user.id;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail: session }));
}

export function publishProfileUser(user: AuthUser, isCurrent: () => boolean): boolean {
  if (!isCurrent() || currentUserId !== user.id) return false;
  try {
    const token = localStorage.getItem(BUSINESS_TOKEN_KEY);
    if (!token) return false;
    profileGeneration++;
    storeSession({ token, user });
    return true;
  } catch { return false; }
}

export function profileIdentityReadGuard() {
  const version = profileGeneration;
  const account = accountGeneration;
  return () => version === profileGeneration && account === accountGeneration;
}

export function clearSession() {
  generation += 1;
  profileGeneration += 1;
  accountGeneration += 1;
  currentUserId = null;
  localStorage.removeItem(BUSINESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(BUSINESS_UI_AUTH_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail: null }));
}

export async function refreshSession(): Promise<string | null> {
  if (refreshing) return refreshing;
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  const started = generation;
  refreshing = (async () => {
    try {
      const tokens = await authApi.refresh(refreshToken);
      if (started !== generation) { void authApi.logout(tokens.token, tokens.refreshToken).catch(() => {}); return null; }
      // Publish rotated credentials before session lookup; transient network errors must not lose them.
      localStorage.setItem(BUSINESS_TOKEN_KEY, tokens.token);
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
      const lookupVersion = profileGeneration;
      const user = await authApi.session(tokens.token);
      if (started !== generation) return null;
      if (lookupVersion !== profileGeneration) return tokens.token;
      storeSession({ ...tokens, user });
      return tokens.token;
    } catch (error) {
      if (started !== generation) return null;
      if (error instanceof AuthApiError && [401, 403].includes(error.status)) clearSession();
      throw error;
    } finally { refreshing = null; }
  })();
  return refreshing;
}

export async function restoreSession() {
  let token = localStorage.getItem(BUSINESS_TOKEN_KEY);
  if (!token) return null;
  const started = generation;
  const lookupVersion = profileGeneration;
  try {
    const user = await authApi.session(token);
    return started === generation && lookupVersion === profileGeneration && localStorage.getItem(BUSINESS_TOKEN_KEY) === token ? { token, user } : null;
  }
  catch (error) {
    if (started !== generation || lookupVersion !== profileGeneration) return null;
    if (!(error instanceof AuthApiError) || error.status !== 401) throw error;
    token = await refreshSession();
    if (!token) { if (started === generation) clearSession(); return null; }
    const refreshedGeneration = generation;
    const refreshedProfileGeneration = profileGeneration;
    const user = await authApi.session(token);
    return refreshedGeneration === generation && refreshedProfileGeneration === profileGeneration && localStorage.getItem(BUSINESS_TOKEN_KEY) === token ? { token, user } : null;
  }
}

export async function endSession() {
  const token = localStorage.getItem(BUSINESS_TOKEN_KEY);
  const refresh = localStorage.getItem(REFRESH_KEY);
  // Clear private client state even when the connection is unavailable.
  clearSession();
  if (token) await authApi.logout(token, refresh);
}
