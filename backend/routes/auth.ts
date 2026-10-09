import express from 'express';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { z } from 'zod';
import sharp from 'sharp';
import { AUTH_TAG_IDS, AUTH_MAX_TAGS, type AuthSession } from '../../shared/auth.js';
import { acceptableNewPassword, hashPassword, verifyPassword } from '../auth/password.js';
import { bindLegacySession, issueRefreshToken, legacySessionFamily, refreshSessionFamily, revokeRefreshToken, revokeAccessToken, revokeSessionFamily, rotateRefreshToken, signAccessToken, verifyAccessToken, verifyLogoutToken } from '../auth/tokens.js';
import { generateEmailCode, hashEmailCode, normalizeAuthEmail, verifyEmailCode } from '../auth/emailCode.js';
import { authState, type AuthGrant } from '../auth/state.js';
import { AuthProfileSchema, authConfig, isAdultBirthDate, systemAvatarUrl, toAuthUser } from '../auth/profile.js';
import { deliverAuthCode } from '../auth/mail.js';
import { loadEnv } from '../config/env.js';
import { normalizeUserPassword } from '../state/jsonState.js';
import type { AppContext } from '../app/context.js';
import type { UserEntity } from '../domain/types.js';
import { isDeviceBanned } from './ops.js';
import { recordLevelEvent } from '../player-center/events.js';

const emailSchema = z.string().trim().email().max(254).transform(normalizeAuthEmail);
const purposeSchema = z.enum(['login', 'register', 'reset']);
const deviceSchema = z.string().min(1).max(128).optional();
const sendSchema = z.object({ email: emailSchema, purpose: purposeSchema.default('login'), locale: z.enum(['en', 'ar']).optional(), deviceId: deviceSchema });
const verifySchema = z.object({ email: emailSchema, code: z.string().regex(/^\d{6}$/), purpose: purposeSchema.default('login'), deviceId: deviceSchema });
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
class AuthError extends Error { constructor(public status: number, public code: string, message: string, public details?: Record<string, unknown>) { super(message); } }
const invalidProof = () => new AuthError(401, 'AUTH_PROOF_INVALID', 'Invalid or expired verification proof');
function restore<T extends object>(target: T, previous: T) { for (const key of Object.keys(target)) delete (target as any)[key]; Object.assign(target, previous); }

export function registerAuthRoutes(app: express.Application, ctx: AppContext) {
  const state = authState(ctx);
  const sending = new Set<string>();
  const completing = new Map<string, Promise<AuthSession>>();
  const resetting = new Set<string>();
  const avatarDir = path.resolve(loadEnv().AUTH_AVATAR_DIR || path.join(process.env.NODE_ENV !== 'production' && process.env.LOCAL_DATA_DIR || 'backend/data', 'auth-avatars'));
  const route = (handler: (req: express.Request, res: express.Response) => unknown | Promise<unknown>): express.RequestHandler => (req, res) => {
    Promise.resolve().then(() => handler(req, res)).catch(error => {
      if (error instanceof z.ZodError) return ctx.sendError(res, 400, 'INPUT_INVALID', 'Validation failed', { issues: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) });
      if (error instanceof AuthError) return ctx.sendError(res, error.status, error.code, error.message, error.details);
      return ctx.sendError(res, 503, 'AUTH_SERVICE_UNAVAILABLE', 'Authentication service temporarily unavailable');
    });
  };
  const checkDevice = (deviceId?: string) => { if (isDeviceBanned(ctx.deviceBans, deviceId)) throw new AuthError(403, 'DEVICE_BANNED', 'Device is banned'); };
  const userFor = (req: express.Request) => {
    const user = ctx.getUserById((req as any).authUserId);
    if (!user) throw invalidProof();
    return user;
  };
  const limited = (retryAfterSec: number) => new AuthError(429, 'AUTH_RATE_LIMITED', 'Please wait before trying again', { retryAfterSec });
  const loginLimit = (email: string) => {
    const key = digest(email), now = Date.now();
    const failures = (state.failures[key] || []).filter(t => t > now - 15 * 60000);
    state.failures[key] = failures;
    if (failures.length >= 10) throw limited(Math.ceil((failures[0] + 15 * 60000 - now) / 1000));
    return key;
  };
  const failLogin = (key: string) => { (state.failures[key] ||= []).push(Date.now()); ctx.persistState(); };
  const findGrant = (token: string, kind: AuthGrant['kind']) => {
    const key = digest(token), grant = state.grants[key];
    if (!grant || grant.kind !== kind || grant.expiresAt <= Date.now()) throw invalidProof();
    checkDevice(grant.deviceId);
    return { key, grant };
  };
  const createGrant = (email: string, kind: AuthGrant['kind'], deviceId?: string, userId?: string) => {
    const token = randomBytes(32).toString('base64url'), expiresAt = Date.now() + 15 * 60000;
    state.grants[digest(token)] = { email, kind, expiresAt, deviceId, userId };
    ctx.persistState(); return { token, expiresAt };
  };
  const issueSession = async (user: UserEntity, registrationKey?: string, credential?: { hash: string; version: number }) => {
    const sessionVersion = credential?.version ?? (user.sessionVersion || 0);
    const unchanged = () => (user.sessionVersion || 0) === sessionVersion && (!credential || user.passwordHash === credential.hash);
    if (!unchanged()) throw new AuthError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
    const refresh = await issueRefreshToken(user.id, sessionVersion);
    const legacyToken = ctx.createToken();
    await bindLegacySession(refresh.familyId, legacyToken);
    if (!unchanged()) {
      await revokeRefreshToken(refresh.refreshToken, user.id);
      throw new AuthError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
    }
    const access = signAccessToken(user.id, user.role, sessionVersion, refresh.familyId);
    const previousLastLoginAt = user.lastLoginAt;
    const eventId = registrationKey ? `login:registration:${registrationKey}` : `login:${randomUUID()}`;
    const previousEvent = ctx.levelEvents.some(e => e.id === eventId);
    ctx.sessions[legacyToken] = { token: legacyToken, userId: user.id, expiresAt: Date.now() + 86400000 };
    recordLevelEvent(ctx, { id: eventId, userId: user.id, kind: 'LOGIN', at: Date.now() });
    user.lastLoginAt = Date.now();
    const session = { token: access.token, refreshToken: refresh.refreshToken, legacyToken, user: toAuthUser(user)! };
    if (registrationKey) state.grants[registrationKey].session = session;
    try { ctx.persistState(); } catch (error) {
      delete ctx.sessions[legacyToken]; user.lastLoginAt = previousLastLoginAt;
      if (!previousEvent) ctx.levelEvents.splice(ctx.levelEvents.findIndex(e => e.id === eventId), 1);
      if (registrationKey) delete state.grants[registrationKey].session;
      await revokeRefreshToken(refresh.refreshToken, user.id); throw error;
    }
    return session;
  };
  const validateProfile = (body: unknown, owner: string) => {
    const profile = AuthProfileSchema.parse(body);
    if (!isAdultBirthDate(profile.birthDate)) throw new AuthError(400, 'AUTH_AGE_INVALID', 'You must be at least 18 years old');
    const avatar = profile.avatar.type === 'system' ? systemAvatarUrl(profile.avatar.value) : state.uploads[profile.avatar.value]?.owner === owner ? state.uploads[profile.avatar.value].url : null;
    if (!avatar) throw new AuthError(400, 'AUTH_AVATAR_INVALID', 'Select a system avatar or upload your own image');
    return { username: profile.username, gender: profile.gender, birthDate: profile.birthDate, avatar, consent: { termsVersion: profile.termsVersion, privacyVersion: profile.privacyVersion, acceptedAt: Date.now() } };
  };

  app.get('/api/auth/config', route((_req, res) => res.json(authConfig())));
  app.get('/api/auth/avatars/system/:id.svg', route((req, res) => {
    if (!systemAvatarUrl(req.params.id)) throw new AuthError(404, 'AUTH_AVATAR_NOT_FOUND', 'Avatar not found');
    const colors: Record<string, string> = { peach: '#F8CBB8', lavender: '#D7CBF1', sage: '#C9DDC6', gold: '#EED694' };
    res.set('Cache-Control', 'public, max-age=86400').type('image/svg+xml').send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="128" fill="${colors[req.params.id]}"/><circle cx="128" cy="98" r="44" fill="#ffffff"/><path d="M48 230a80 80 0 0 1 160 0" fill="#ffffff"/></svg>`);
  }));
  app.get('/api/auth/avatars/uploads/:id.png', route(async (req, res) => {
    if (!/^[a-f0-9]{48}$/.test(req.params.id) || !state.uploads[req.params.id]) throw new AuthError(404, 'AUTH_AVATAR_NOT_FOUND', 'Avatar not found');
    const data = await fs.readFile(path.join(avatarDir, `${req.params.id}.png`));
    res.set('Cache-Control', 'public, max-age=86400').set('X-Content-Type-Options', 'nosniff').type('image/png').send(data);
  }));
  // Unverified password registration must not bypass email, age and consent checks.
  app.post('/api/auth/register', route(() => { throw new AuthError(410, 'AUTH_REGISTRATION_REQUIRED', 'Verify your email and complete registration'); }));
  app.post('/api/auth/login', route(async (req, res) => {
    const body = z.object({ email: emailSchema, password: z.string().min(1).max(512), deviceId: deviceSchema }).parse(req.body);
    checkDevice(body.deviceId); const key = loginLimit(body.email);
    const user = ctx.users.find(u => normalizeAuthEmail(u.email) === body.email);
    if (user && !user.passwordHash && user.password) normalizeUserPassword(user);
    const credentialHash = user?.passwordHash, credentialVersion = user?.sessionVersion || 0;
    const unchanged = () => user && user.passwordHash === credentialHash && (user.sessionVersion || 0) === credentialVersion;
    const verified = credentialHash ? await verifyPassword(body.password, credentialHash) : { valid: false, needsRehash: false };
    if (!user || !verified.valid) { failLogin(key); throw new AuthError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials'); }
    if (!unchanged()) throw new AuthError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
    if (verified.needsRehash) {
      const upgraded = await hashPassword(body.password);
      if (!unchanged()) throw new AuthError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
      user.passwordHash = upgraded;
    }
    if (body.deviceId) user.deviceId = body.deviceId;
    delete state.failures[key]; res.json(await issueSession(user, undefined, { hash: user.passwordHash, version: credentialVersion }));
  }));
  app.post('/api/auth/email-code/send', route(async (req, res) => {
    const body = sendSchema.parse(req.body); checkDevice(body.deviceId);
    const now = Date.now(), emailKey = `email:${digest(body.email)}`;
    const scopes = [{ key: emailKey, hour: 5, day: 10 }, { key: `ip:${digest(req.ip || 'unknown')}`, hour: 100, day: 500 }, ...(body.deviceId ? [{ key: `device:${digest(body.deviceId)}`, hour: 20, day: 50 }] : [])];
    const times = (state.sends[emailKey] || []).filter(t => t > now - 86400000);
    if (sending.has(emailKey)) throw limited(60);
    if (times.length && times[times.length - 1] + 60000 > now) throw limited(Math.ceil((times[times.length - 1] + 60000 - now) / 1000));
    for (const scope of scopes) {
      const events = (state.sends[scope.key] || []).filter(t => t > now - 86400000), hourEvents = events.filter(t => t > now - 3600000);
      if (hourEvents.length >= scope.hour) throw limited(Math.ceil((hourEvents[0] + 3600000 - now) / 1000));
      if (events.length >= scope.day) throw limited(Math.ceil((events[0] + 86400000 - now) / 1000));
    }
    sending.add(emailKey);
    try {
      const code = generateEmailCode(); let delivery: { developmentCode?: string };
      try { delivery = await deliverAuthCode({ email: body.email, purpose: body.purpose, locale: body.locale, code }); } catch { throw new AuthError(503, 'AUTH_MAIL_UNAVAILABLE', 'Email could not be delivered. Please try again later'); }
      // Replace a previous code only after delivery is accepted.
      state.codes[`${body.purpose}:${body.email}`] = { id: randomUUID(), email: body.email, purpose: body.purpose, codeHash: hashEmailCode(code), sentAt: now, expiresAt: now + 300000, attempts: 0, meta: { deviceId: body.deviceId } };
      for (const scope of scopes) state.sends[scope.key] = [...(state.sends[scope.key] || []).filter(t => t > now - 86400000), now];
      ctx.persistState(); res.json({ ok: true, purpose: body.purpose, expiresInSec: 300, cooldownSec: 60, ...delivery });
    } finally { sending.delete(emailKey); }
  }));
  const verifyHandler = (legacy: boolean) => route(async (req, res) => {
    const body = verifySchema.parse(legacy ? { ...req.body, purpose: 'login' } : req.body); checkDevice(body.deviceId);
    const key = loginLimit(body.email), record = state.codes[`${body.purpose}:${body.email}`];
    if (!record || record.consumedAt || record.expiresAt <= Date.now() || record.attempts >= 5 || (record.meta?.deviceId && record.meta.deviceId !== body.deviceId)) throw new AuthError(401, 'AUTH_EMAIL_CODE_INVALID', 'Invalid or expired verification code');
    record.attempts++;
    if (!verifyEmailCode(body.code, record.codeHash)) { failLogin(key); throw new AuthError(401, 'AUTH_EMAIL_CODE_INVALID', 'Invalid or expired verification code'); }
    record.consumedAt = Date.now(); delete state.failures[key]; ctx.persistState();
    const user = ctx.users.find(u => normalizeAuthEmail(u.email) === body.email);
    if (body.purpose === 'reset') {
      if (!user) throw invalidProof();
      const grant = createGrant(body.email, 'reset', body.deviceId, user.id);
      return res.json({ kind: 'reset', resetToken: grant.token, expiresAt: grant.expiresAt });
    }
    if (user) {
      user.emailVerifiedAt ||= Date.now(); if (body.deviceId) user.deviceId = body.deviceId;
      const session = await issueSession(user); return res.json(legacy ? session : { kind: 'session', session });
    }
    const grant = createGrant(body.email, 'registration', body.deviceId);
    res.json({ kind: 'registration', registrationToken: grant.token, email: body.email, expiresAt: grant.expiresAt });
  });
  app.post('/api/auth/email-code/verify', verifyHandler(false));
  app.post('/api/auth/email-code/login', verifyHandler(true));
  app.post('/api/auth/registration/complete', route(async (req, res) => {
    const token = z.string().min(20).max(256).parse(req.body?.registrationToken), { key, grant } = findGrant(token, 'registration');
    if (grant.session) return res.json(grant.session);
    if (completing.has(key)) return res.json(await completing.get(key)!);
    const profile = validateProfile(req.body, grant.userId ? `user:${grant.userId}` : `grant:${key}`);
    const existing = ctx.users.find(u => normalizeAuthEmail(u.email) === grant.email);
    const user: UserEntity = existing || { id: `user_${randomUUID()}`, email: grant.email, passwordHash: '', role: 'USER', createdAt: Date.now(), emailVerifiedAt: Date.now(), accountStatus: 'ACTIVE', followCount: 0, deviceId: grant.deviceId, ...profile };
    if (!existing) { ctx.users.push(user); ctx.wallets[user.id] = { userId: user.id, balance: 0, lastUpdated: Date.now() }; }
    const uploadedAvatar = !existing && req.body.avatar?.type === 'upload' ? state.uploads[req.body.avatar.value] : undefined;
    const previousAvatarOwner = uploadedAvatar?.owner;
    if (uploadedAvatar) uploadedAvatar.owner = `user:${user.id}`;
    const oldGrant = { ...grant }; grant.userId = user.id; grant.consumedAt = Date.now();
    try { ctx.persistState(); } catch (error) {
      if (uploadedAvatar && previousAvatarOwner) uploadedAvatar.owner = previousAvatarOwner;
      delete grant.userId; delete grant.consumedAt; Object.assign(grant, oldGrant);
      if (!existing) { ctx.users.splice(ctx.users.indexOf(user), 1); delete ctx.wallets[user.id]; } throw error;
    }
    const operation = issueSession(user, key).finally(() => completing.delete(key));
    completing.set(key, operation); res.json(await operation);
  }));
  app.post('/api/auth/profile/complete', ctx.authMiddleware, route((req, res) => {
    const user = userFor(req), previous = { ...user }; Object.assign(user, validateProfile(req.body, `user:${user.id}`));
    try { ctx.persistState(); } catch (error) { restore(user, previous); throw error; } res.json(toAuthUser(user));
  }));
  app.put('/api/auth/preferences', ctx.authMiddleware, route((req, res) => {
    const body = z.object({ tags: z.array(z.enum(AUTH_TAG_IDS)).max(AUTH_MAX_TAGS).refine(tags => new Set(tags).size === tags.length, 'Duplicate tags are not allowed') }).parse(req.body);
    const user = userFor(req); user.tags = body.tags; ctx.persistState(); res.json(body);
  }));
  app.post('/api/auth/avatar', route(async (req, res) => {
    const body = z.object({ registrationToken: z.string().min(20).max(256).optional(), image: z.string().max(2800000) }).parse(req.body); let owner: string;
    if (body.registrationToken) {
      const { key, grant } = findGrant(body.registrationToken, 'registration'); if (grant.consumedAt) throw invalidProof(); owner = `grant:${key}`;
    } else {
      const token = String(req.headers.authorization || '').replace(/^Bearer /, ''), payload = await verifyAccessToken(token), legacy = ctx.sessions[token];
      const user = ctx.getUserById(payload?.sub || (legacy && legacy.expiresAt > Date.now() ? legacy.userId : ''));
      if (!user || (payload && (payload.sessionVersion || 0) !== (user.sessionVersion || 0))) throw invalidProof(); owner = `user:${user.id}`;
    }
    if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(body.image)) throw new AuthError(400, 'AUTH_AVATAR_INVALID', 'Upload a cropped PNG image');
    const input = Buffer.from(body.image.slice('data:image/png;base64,'.length), 'base64');
    if (input.length > 2 * 1024 * 1024) throw new AuthError(413, 'AUTH_AVATAR_TOO_LARGE', 'Avatar must be smaller than 2MB');
    let output: Buffer;
    try {
      const image = sharp(input, { failOn: 'warning', limitInputPixels: 4096 * 4096 }), meta = await image.metadata();
      if (meta.format !== 'png' || !meta.width || !meta.height || meta.width !== meta.height || meta.width < 64 || meta.width > 2048 || (meta.pages || 1) !== 1) throw new Error('Invalid dimensions');
      output = await image.resize(256, 256).png().toBuffer();
    } catch { throw new AuthError(400, 'AUTH_AVATAR_INVALID', 'Upload a valid square PNG from 64 to 2048 pixels'); }
    const id = randomBytes(24).toString('hex'), url = `/api/auth/avatars/uploads/${id}.png`;
    await fs.mkdir(avatarDir, { recursive: true }); await fs.writeFile(path.join(avatarDir, `${id}.png`), output, { flag: 'wx', mode: 0o600 });
    state.uploads[id] = { owner, url, createdAt: Date.now() }; ctx.persistState(); res.json({ avatar: { type: 'upload', value: id }, url });
  }));
  app.post('/api/auth/password/reset', route(async (req, res) => {
    const body = z.object({ resetToken: z.string().min(20).max(256), password: z.string().refine(acceptableNewPassword, 'Use 15–128 characters and avoid common passwords') }).parse(req.body);
    const { key, grant } = findGrant(body.resetToken, 'reset'); if (grant.consumedAt || resetting.has(key)) throw invalidProof();
    const user = ctx.getUserById(grant.userId || ''); if (!user || normalizeAuthEmail(user.email) !== grant.email) throw invalidProof(); resetting.add(key);
    try {
      const passwordHash = await hashPassword(body.password), previous = { ...user }, previousSessions = { ...ctx.sessions };
      user.passwordHash = passwordHash; delete user.password; user.sessionVersion = (user.sessionVersion || 0) + 1;
      for (const [key, session] of Object.entries(ctx.sessions)) if (session.userId === user.id) delete ctx.sessions[key];
      grant.consumedAt = Date.now();
      try { ctx.persistState(); } catch (error) { restore(user, previous); Object.assign(ctx.sessions, previousSessions); delete grant.consumedAt; throw error; }
      res.json({ ok: true });
    } finally { resetting.delete(key); }
  }));
  app.post('/api/auth/refresh', route(async (req, res) => {
    const body = z.object({ refreshToken: z.string().min(20).max(256) }).parse(req.body), rotated = await rotateRefreshToken(body.refreshToken); if (!rotated) throw invalidProof();
    const user = ctx.getUserById(rotated.userId);
    if (!user || (user.sessionVersion || 0) !== rotated.sessionVersion) { await revokeRefreshToken(rotated.refreshToken); throw invalidProof(); }
    const access = signAccessToken(user.id, user.role, user.sessionVersion || 0, rotated.familyId); res.json({ token: access.token, refreshToken: rotated.refreshToken, user: toAuthUser(user) });
  }));
  app.post('/api/auth/logout', route(async (req, res) => {
    const refreshToken = z.string().max(256).optional().parse(req.body?.refreshToken);
    const token = String(req.headers.authorization || '').replace(/^Bearer /, ''), payload = await verifyLogoutToken(token);
    const legacy = ctx.sessions[token];
    const user = ctx.getUserById(payload?.sub || (legacy && legacy.expiresAt > Date.now() ? legacy.userId : ''));
    if (!user || (payload && (payload.sessionVersion || 0) !== (user.sessionVersion || 0))) throw new AuthError(401, 'AUTH_UNAUTHORIZED', 'Unauthorized');
    // Expired, correctly signed access tokens authorize revocation only; no session is revived.
    const userId = user.id;
    if (payload) await revokeAccessToken(payload.jti);
    // Signed access family is authoritative: a supplied RT must not close a different device.
    const familyId = payload?.familyId || await legacySessionFamily(token) || (refreshToken ? await refreshSessionFamily(refreshToken, userId) : null);
    if (familyId) {
      const legacyToken = await revokeSessionFamily(familyId, userId);
      if (legacyToken && ctx.sessions[legacyToken]?.userId === userId) delete ctx.sessions[legacyToken];
    }
    if (ctx.sessions[token]?.userId === userId) delete ctx.sessions[token];
    ctx.persistState(); res.json({ ok: true });
  }));
  app.get('/api/auth/session', ctx.authMiddleware, route((req, res) => res.json(toAuthUser(userFor(req)))));
}
