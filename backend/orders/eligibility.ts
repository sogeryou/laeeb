import type { CompanionEntity, UserEntity } from '../domain/types.js';
import { readOfficialLevel } from '../player-center/officialLevel.js';

export function providerRestricted(companion: CompanionEntity, user: UserEntity | undefined): boolean {
  return readOfficialLevel(companion)?.suspended === true
    || ['FROZEN', 'RISK_HOLD'].includes(user?.accountStatus || '')
    || user?.banModules?.ACCEPT_ORDER === true;
}
