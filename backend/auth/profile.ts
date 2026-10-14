import { z } from 'zod';
import { AUTH_MIN_AGE, AUTH_PRIVACY_VERSION, AUTH_TERMS_VERSION, SYSTEM_AVATAR_IDS, isAuthNicknameValid, type AuthConfig, type AuthUser } from '../../shared/auth.js';
import type { UserEntity } from '../domain/types.js';
import { loadEnv } from '../config/env.js';

export const AuthProfileSchema = z.object({
  username: z.string().trim().refine(isAuthNicknameValid, 'Nickname must contain 2–32 visible characters without control characters'),
  gender: z.enum(['F', 'M', 'U']),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  avatar: z.object({ type: z.enum(['system', 'upload']), value: z.string().min(1).max(128) }),
  acceptedTerms: z.literal(true),
  termsVersion: z.literal(AUTH_TERMS_VERSION),
  privacyVersion: z.literal(AUTH_PRIVACY_VERSION),
});

export function platformDate(now = Date.now(), timeZone = loadEnv().AUTH_PLATFORM_TZ) {
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)!.value).join('-');
}
export function maxBirthDate(serverDate: string) {
  const [year, month, day] = serverDate.split('-').map(Number);
  const target = year - AUTH_MIN_AGE;
  const lastDay = new Date(Date.UTC(target, month, 0)).getUTCDate();
  return `${target}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}
export function isAdultBirthDate(date: string, serverDate = platformDate()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (y < 1 || parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m - 1 || parsed.getUTCDate() !== d) return false;
  return date <= maxBirthDate(serverDate);
}
export function profileComplete(user: UserEntity) {
  return user.role === 'ADMIN' || Boolean(user.birthDate && user.avatar && user.consent?.termsVersion && user.consent?.privacyVersion);
}
export function toAuthUser(user: UserEntity | undefined): AuthUser | null {
  if (!user) return null;
  return { id: user.id, username: user.username, email: user.email, role: user.role, adminRoleTemplate: user.adminRoleTemplate, permissions: user.permissions || [], gender: user.gender, avatar: user.avatar, bio: user.bio, tags: user.tags || [], profileComplete: profileComplete(user), accountStatus: user.accountStatus || 'ACTIVE' };
}
export function systemAvatarUrl(id: string) {
  return (SYSTEM_AVATAR_IDS as readonly string[]).includes(id) ? `/api/auth/avatars/system/${id}.svg` : null;
}
export function emailDelivery(): AuthConfig['emailDelivery'] {
  const env = loadEnv();
  if (env.AUTH_EMAIL_DELIVERY === 'development') return env.NODE_ENV === 'production' ? 'unavailable' : 'development';
  return env.AUTH_EMAIL_DELIVERY === 'provider' && env.AUTH_MAIL_API_KEY && env.AUTH_MAIL_FROM ? 'provider' : 'unavailable';
}
export function authConfig(): AuthConfig {
  const serverDate = platformDate();
  return { serverDate, maxBirthDate: maxBirthDate(serverDate), termsVersion: AUTH_TERMS_VERSION, privacyVersion: AUTH_PRIVACY_VERSION, emailDelivery: emailDelivery() };
}

export function profileAllowsRequest(user: UserEntity, path: string, method: string) {
  return profileComplete(user) || path.startsWith('/api/auth/') || path === '/api/support' || path.startsWith('/api/support/') || path === '/api/tickets' || path.startsWith('/api/tickets/') || (method === 'GET' && ['/api/me', '/api/wallet', '/api/wallet/balance', '/api/wallet/transactions', '/api/orders'].includes(path));
}
