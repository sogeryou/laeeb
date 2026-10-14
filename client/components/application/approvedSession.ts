import { businessApi, type AuthSession } from '../../services/businessApi';
import { profileIdentityReadGuard, storeSession } from '../../features/auth/session';

export async function refreshApplicationOwnerSession(
  token: string,
  ownerId: string,
  isCurrent: () => boolean,
  expectedRole: 'USER' | 'PLAYER',
  save: (session: Pick<AuthSession, 'token' | 'user'>) => void = storeSession,
) {
  const identityIsCurrent = profileIdentityReadGuard();
  const user = await businessApi.getSession(token);
  if (!isCurrent() || !identityIsCurrent() || user.id !== ownerId || user.role !== expectedRole) return false;
  save({ token, user });
  return true;
}

export function refreshApprovedOwnerSession(
  token: string,
  ownerId: string,
  isCurrent: () => boolean,
  save: (session: Pick<AuthSession, 'token' | 'user'>) => void = storeSession,
) {
  return refreshApplicationOwnerSession(token, ownerId, isCurrent, 'PLAYER', save);
}
