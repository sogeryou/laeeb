/** Shared independent-authentication API contract. Dates use the server's platform timezone. */
export const SYSTEM_AVATAR_IDS = ['peach', 'lavender', 'sage', 'gold'] as const;
export const AUTH_TAG_IDS = ['valorant', 'pubg', 'fc', 'ml', 'chill', 'ranked', 'voice', 'night', 'music', 'anime', 'football', 'coffee'] as const;
export const AUTH_MAX_TAGS = 5;
export const AUTH_MIN_AGE = 18;
export const AUTH_PASSWORD_MIN_LENGTH = 15;
export const AUTH_PASSWORD_MAX_LENGTH = 128;
export const AUTH_EMAIL_CODE_TTL_SEC = 300;
export const AUTH_EMAIL_CODE_COOLDOWN_SEC = 60;
export const AUTH_TERMS_VERSION = '2026-10-08';
export const AUTH_PRIVACY_VERSION = '2026-10-08';
export function isAuthNicknameValid(input: string) {
  const value = input.trim();
  const length = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)].length;
  return length >= 2 && length <= 32 && !/[\p{Cc}\p{Cf}]/u.test(value);
}
export type AuthEmailPurpose = 'login' | 'register' | 'reset';
export type AuthAvatar = { type: 'system' | 'upload'; value: string };
export type AuthProfileInput = {
  username: string;
  gender: 'F' | 'M' | 'U';
  birthDate: string;
  avatar: AuthAvatar;
  acceptedTerms: true;
  termsVersion: string;
  privacyVersion: string;
};
export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'PLAYER' | 'ADMIN';
  adminRoleTemplate?: string;
  permissions: string[];
  avatar?: string;
  gender?: 'F' | 'M' | 'U';
  profileComplete: boolean;
  accountStatus: 'ACTIVE' | 'FROZEN' | 'RISK_HOLD';
  tags?: string[];
};
export type AuthSession = { token: string; refreshToken: string; legacyToken?: string; user: AuthUser };
export type AuthConfig = {
  serverDate: string;
  maxBirthDate: string;
  termsVersion: string;
  privacyVersion: string;
  emailDelivery: 'development' | 'provider' | 'unavailable';
};
export type AuthEmailCodeSendInput = { email: string; purpose: AuthEmailPurpose; locale?: 'en' | 'ar'; deviceId?: string };
export type AuthEmailCodeSendResult = { ok: true; purpose: AuthEmailPurpose; expiresInSec: 300; cooldownSec: 60; developmentCode?: string };
export type AuthEmailCodeVerifyInput = { email: string; code: string; purpose: AuthEmailPurpose; deviceId?: string };
export type AuthVerifyResult =
  | { kind: 'session'; session: AuthSession }
  | { kind: 'registration'; registrationToken: string; email: string; expiresAt: number }
  | { kind: 'reset'; resetToken: string; expiresAt: number };
export type AuthRegistrationInput = AuthProfileInput & { registrationToken: string };
export type AuthAvatarUploadInput = { registrationToken?: string; image: string };
export type AuthAvatarUploadResult = { avatar: { type: 'upload'; value: string }; url: string };
