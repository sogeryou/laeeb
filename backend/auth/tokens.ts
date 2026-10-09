import crypto from 'crypto';
import jwt, { type Secret } from 'jsonwebtoken';
import { loadEnv, resolveJwtSecret } from '../config/env.js';
import { getCache } from '../cache/redis.js';

const env = loadEnv();
const SECRET: Secret = resolveJwtSecret(env);

export type Role = 'USER' | 'PLAYER' | 'ADMIN';

export interface AccessPayload {
  sub: string;
  role: Role;
  jti: string;
  sessionVersion?: number;
  familyId?: string;
}

export function signAccessToken(userId: string, role: Role, sessionVersion = 0, familyId?: string) {
  const jti = crypto.randomBytes(12).toString('hex');
  const token = jwt.sign({ sub: userId, role, jti, sessionVersion, ...(familyId ? { familyId } : {}) } satisfies AccessPayload, SECRET, { expiresIn: env.JWT_ACCESS_TTL_SEC });
  return { token, jti, expiresAt: Date.now() + env.JWT_ACCESS_TTL_SEC * 1000 };
}

async function verifyJwt(token: string, ignoreExpiration: boolean): Promise<AccessPayload | null> {
  try {
    const payload = jwt.verify(token, SECRET, { ignoreExpiration }) as AccessPayload;
    if (await getCache().get(`revoked:${payload.jti}`)) return null;
    if (payload.familyId) {
      const family = await activeFamily(payload.familyId);
      if (!family || family.userId !== payload.sub || family.sessionVersion !== (payload.sessionVersion || 0)) return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function verifyAccessToken(token: string): Promise<AccessPayload | null> { return verifyJwt(token, false); }
/** Revocation-only proof: never use this to authorize business endpoints or issue sessions. */
export async function verifyLogoutToken(token: string): Promise<AccessPayload | null> { return verifyJwt(token, true); }

export async function revokeAccessToken(jti: string) {
  await getCache().setex(`revoked:${jti}`, env.JWT_ACCESS_TTL_SEC, '1');
}

type FamilyRecord = { userId: string; sessionVersion: number; expiresAt: number };
type RefreshRecord = { userId: string; sessionVersion: number; familyId: string };
const REVOCATION_TTL = Math.max(env.JWT_REFRESH_TTL_SEC, env.JWT_ACCESS_TTL_SEC) + 60;
const legacyFamilyId = (token: string) => `legacy_${crypto.createHash('sha256').update(token).digest('hex')}`;
function parseRefreshRecord(record: string, token: string): RefreshRecord {
  const parsed = record.startsWith('{') ? JSON.parse(record) : { userId: record };
  return { userId: parsed.userId, sessionVersion: parsed.sessionVersion || 0, familyId: parsed.familyId || legacyFamilyId(token) };
}
async function activeFamily(familyId: string): Promise<FamilyRecord | null> {
  const raw = await getCache().get(`sf:${familyId}`);
  if (!raw || await getCache().get(`sf-revoked:${familyId}`)) return null;
  const family = JSON.parse(raw) as FamilyRecord;
  return family.expiresAt > Date.now() ? family : null;
}
class SessionRevokedError extends Error {}

export async function issueRefreshToken(userId: string, sessionVersion = 0, familyId?: string) {
  if (!familyId) {
    familyId = crypto.randomBytes(24).toString('hex');
    const family = { userId, sessionVersion, expiresAt: Date.now() + env.JWT_REFRESH_TTL_SEC * 1000 };
    await getCache().setex(`sf:${familyId}`, env.JWT_REFRESH_TTL_SEC, JSON.stringify(family));
  }
  const family = await activeFamily(familyId);
  if (!family || family.userId !== userId || family.sessionVersion !== sessionVersion) throw new SessionRevokedError('Session revoked');
  const refreshToken = crypto.randomBytes(32).toString('base64url');
  const ttl = Math.max(1, Math.ceil((family.expiresAt - Date.now()) / 1000));
  const record = JSON.stringify({ userId, sessionVersion, familyId });
  await getCache().setex(`rt:${refreshToken}`, ttl, record);
  // Keep ownership/family metadata for consumed predecessors so logout can revoke descendants.
  await getCache().setex(`rt-meta:${refreshToken}`, REVOCATION_TTL, record);
  if (!await activeFamily(familyId)) {
    await getCache().del(`rt:${refreshToken}`);
    throw new SessionRevokedError('Session revoked');
  }
  return { refreshToken, familyId, expiresAt: family.expiresAt };
}

export async function rotateRefreshToken(token: string) {
  if (!token || token.length > 256) return null;
  const record = await getCache().get(`rt:${token}`);
  if (!record) return null;
  const parsed = parseRefreshRecord(record, token);
  // Older refresh records are migrated to a deterministic family, respecting prior logout.
  if (!record.startsWith('{') || !JSON.parse(record).familyId) {
    if (await getCache().get(`sf-revoked:${parsed.familyId}`)) return null;
    await getCache().setnx(`sf:${parsed.familyId}`, env.JWT_REFRESH_TTL_SEC, JSON.stringify({ userId: parsed.userId, sessionVersion: parsed.sessionVersion, expiresAt: Date.now() + env.JWT_REFRESH_TTL_SEC * 1000 }));
  }
  if (!await activeFamily(parsed.familyId)) return null;
  if (!await getCache().setnx(`rt-used:${token}`, env.JWT_REFRESH_TTL_SEC, '1')) return null;
  await getCache().setex(`rt-meta:${token}`, REVOCATION_TTL, JSON.stringify(parsed));
  await getCache().del(`rt:${token}`);
  try {
    const issued = await issueRefreshToken(parsed.userId, parsed.sessionVersion, parsed.familyId);
    return { userId: parsed.userId, sessionVersion: parsed.sessionVersion, ...issued };
  } catch (error) {
    if (error instanceof SessionRevokedError) return null;
    throw error;
  }
}

export async function revokeRefreshToken(token: string, expectedUserId?: string) {
  if (expectedUserId) {
    const record = await getCache().get(`rt:${token}`) || await getCache().get(`rt-meta:${token}`);
    if (!record) return;
    const parsed = parseRefreshRecord(record, token);
    if (parsed.userId !== expectedUserId) return;
    await revokeSessionFamily(parsed.familyId, expectedUserId);
  }
  await getCache().del(`rt:${token}`);
}

export async function bindLegacySession(familyId: string, legacyToken: string) {
  await getCache().setex(`sf-legacy:${familyId}`, REVOCATION_TTL, legacyToken);
  await getCache().setex(`legacy-sf:${legacyToken}`, REVOCATION_TTL, familyId);
}
export async function legacySessionFamily(token: string) { return getCache().get(`legacy-sf:${token}`); }
export async function refreshSessionFamily(token: string, expectedUserId: string) {
  const raw = await getCache().get(`rt:${token}`) || await getCache().get(`rt-meta:${token}`);
  if (!raw) return null;
  const parsed = parseRefreshRecord(raw, token);
  return parsed.userId === expectedUserId ? parsed.familyId : null;
}
export async function revokeSessionFamily(familyId: string, expectedUserId: string) {
  const raw = await getCache().get(`sf:${familyId}`);
  if (raw && (JSON.parse(raw) as FamilyRecord).userId !== expectedUserId) return null;
  await getCache().setex(`sf-revoked:${familyId}`, REVOCATION_TTL, '1');
  await getCache().del(`sf:${familyId}`);
  return getCache().get(`sf-legacy:${familyId}`);
}
