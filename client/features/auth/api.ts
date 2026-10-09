import { apiUrl } from '@shared/apiClient';
import type { AuthConfig, AuthSession, AuthUser, AuthEmailCodeSendInput, AuthEmailCodeSendResult, AuthEmailCodeVerifyInput, AuthVerifyResult, AuthRegistrationInput, AuthProfileInput, AuthAvatarUploadInput, AuthAvatarUploadResult } from '@shared/auth';

export class AuthApiError extends Error {
  constructor(public code: string, public status: number, public retryAfterSec = 0) { super(code); }
}

async function request<T>(path: string, body?: unknown, token?: string, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(`/api/auth/${path}`), {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
    });
  } catch { throw new AuthApiError('NETWORK_ERROR', 0); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new AuthApiError(result.error?.code || result.errorCode || 'REQUEST_FAILED', response.status, result.error?.details?.retryAfterSec || result.details?.retryAfterSec || 0);
  return result as T;
}

/** Only this adapter knows endpoint names; visual components never call fetch. */
export const authApi = {
  config: () => request<AuthConfig>('config'),
  send: (body: AuthEmailCodeSendInput) => request<AuthEmailCodeSendResult>('email-code/send', body),
  verify: (body: AuthEmailCodeVerifyInput) => request<AuthVerifyResult>('email-code/verify', body),
  login: (email: string, password: string, deviceId?: string) => request<AuthSession>('login', { email, password, deviceId }),
  register: (body: AuthRegistrationInput) => request<AuthSession>('registration/complete', body),
  completeProfile: (body: AuthProfileInput, token: string) => request<AuthUser>('profile/complete', body, token),
  uploadAvatar: async (body: AuthAvatarUploadInput, token?: string) => {
    const result = await request<AuthAvatarUploadResult>('avatar', body, token);
    return { ...result, url: apiUrl(result.url) };
  },
  preferences: (tags: string[], token: string) => request<{ tags: string[] }>('preferences', { tags }, token, 'PUT'),
  reset: (resetToken: string, password: string) => request<{ ok: true }>('password/reset', { resetToken, password }),
  session: (token: string) => request<AuthUser>('session', undefined, token),
  refresh: (refreshToken: string) => request<{ token: string; refreshToken: string }>('refresh', { refreshToken }),
  logout: (token: string, refreshToken?: string | null) => request<{ ok: true }>('logout', { refreshToken }, token),
};
