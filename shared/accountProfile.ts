import type { AuthAvatar, AuthUser } from './auth.js';

export const ACCOUNT_BIO_MAX_LENGTH = 280;
export const ACCOUNT_BIO_RAW_MAX_LENGTH = 4096;
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
export function isAccountBioValid(value: string) {
  return value.length <= ACCOUNT_BIO_RAW_MAX_LENGTH
    && !/[\p{Cc}\p{Cf}]/u.test(value.replace(/[\t\r\n\u200c\u200d]/g, ''))
    && [...graphemes.segment(value.trim())].length <= ACCOUNT_BIO_MAX_LENGTH;
}
export type AccountProfile = { user: AuthUser; bio: string; revision: string };
export type UpdateAccountProfile = { revision: string; username: string; bio: string; avatar?: AuthAvatar };
