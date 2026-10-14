import { isAuthNicknameValid, SYSTEM_AVATAR_IDS, type AuthAvatar } from '@shared/auth';
import { isAccountBioValid, type AccountProfile } from '@shared/accountProfile';

export const visibleLength = (value: string) => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)].length;
export const validBio = isAccountBioValid;
export function avatarPath(avatar: AuthAvatar) {
  return avatar.type === 'system' ? `/api/auth/avatars/system/${avatar.value}.svg` : `/api/auth/avatars/uploads/${avatar.value}.png`;
}
export function validAccountProfile(value: unknown, owner: string): value is AccountProfile {
  const profile = value as AccountProfile | null;
  const user = profile?.user;
  return Boolean(user && user.id === owner && typeof user.username === 'string' && isAuthNicknameValid(user.username)
    && typeof user.email === 'string' && ['USER', 'PLAYER', 'ADMIN'].includes(user.role)
    && Array.isArray(user.permissions) && user.permissions.every(permission => typeof permission === 'string')
    && typeof user.profileComplete === 'boolean' && ['ACTIVE', 'FROZEN', 'RISK_HOLD'].includes(user.accountStatus)
    && (user.avatar === undefined || typeof user.avatar === 'string')
    && typeof profile.bio === 'string' && validBio(profile.bio) && (user.bio === undefined ? profile.bio === '' : user.bio === profile.bio)
    && typeof profile.revision === 'string' && /^[a-f0-9]{64}$/.test(profile.revision));
}
export const validSystemAvatar = (id: string) => (SYSTEM_AVATAR_IDS as readonly string[]).includes(id);
