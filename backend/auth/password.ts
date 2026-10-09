import argon2 from 'argon2';
import crypto from 'crypto';

const ARGON2_OPTS = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 } as const;
const COMMON_PASSWORDS = new Set(['correcthorsebatterystaple', 'thisisapassword', 'qwertyuiopasdfgh', 'qwertyuiopasdfghjkl', '123456789012345', '12345678901234567890', 'abcdefghijklmnop', 'abcdefghijklmnopqrstuvwxyz']);

/** Setting/resetting only. Existing shorter passwords must continue to verify. */
export function acceptableNewPassword(password: string) {
  const length = [...password].length;
  if (length < 15 || length > 128) return false;
  const comparable = password.normalize('NFKC').toLowerCase().replace(/\s/gu, '');
  return !COMMON_PASSWORDS.has(comparable) && !/^(?:password|qwerty|letmein|welcome|123456|admin|iloveyou|football|monkey|abc123|changeme)+[\d\W]*$/i.test(comparable) && !/^(.)\1+$/u.test(comparable);
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) throw new Error('password required');
  return argon2.hash(password, ARGON2_OPTS);
}

export async function verifyPassword(password: string, stored: string): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!stored) return { valid: false, needsRehash: false };
  if (stored.startsWith('$argon2')) {
    try {
      const valid = await argon2.verify(stored, password);
      const needsRehash = valid && argon2.needsRehash(stored, ARGON2_OPTS);
      return { valid, needsRehash };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }
  if (stored.includes(':')) {
    const [saltHex, digestHex] = stored.split(':');
    try {
      const candidate = crypto.scryptSync(password, saltHex, 64);
      const expected = Buffer.from(digestHex, 'hex');
      if (expected.length !== candidate.length) return { valid: false, needsRehash: false };
      return { valid: crypto.timingSafeEqual(expected, candidate), needsRehash: true };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }
  return { valid: false, needsRehash: false };
}
