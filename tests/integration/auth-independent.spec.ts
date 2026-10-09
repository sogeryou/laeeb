import express from 'express';
import request from 'supertest';
import { afterAll, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import { registerAuthRoutes } from '../../backend/routes/auth';
import { verifyAccessToken } from '../../backend/auth/tokens';
import { legacyHashPassword } from '../../backend/state/jsonState';
import { AUTH_PRIVACY_VERSION, AUTH_TERMS_VERSION } from '../../shared/auth';
import sharp from 'sharp';
import * as authMail from '../../backend/auth/mail';
import * as passwords from '../../backend/auth/password';
import { getCache } from '../../backend/cache/redis';

vi.hoisted(() => { process.env.AUTH_EMAIL_DELIVERY = 'development'; process.env.AUTH_AVATAR_DIR = `/tmp/le3eb-auth-avatars-${process.pid}-${Date.now()}`; });
afterAll(async () => { if (process.env.AUTH_AVATAR_DIR?.startsWith('/tmp/le3eb-auth-avatars-')) await fs.rm(process.env.AUTH_AVATAR_DIR, { recursive: true, force: true }); });
function setup() {
  const ctx: any = {
    users: [], wallets: {}, sessions: {}, levelEvents: [], levelSettlements: [], deviceBans: [],
    persistState: vi.fn(), createToken: () => `sess_${crypto.randomUUID()}`,
    getUserById: (id: string) => ctx.users.find((u: any) => u.id === id),
    toPublicUser: (u: any) => u && ({ id: u.id, username: u.username, email: u.email, role: u.role, permissions: [], profileComplete: Boolean(u.birthDate && u.consent), accountStatus: u.accountStatus || 'ACTIVE', avatar: u.avatar, tags: u.tags }),
    authMiddleware: async (req: any, res: any, next: any) => {
      const token = String(req.headers.authorization || '').replace('Bearer ', '');
      const payload = await verifyAccessToken(token);
      const legacy = ctx.sessions[token];
      const u = ctx.getUserById(payload?.sub || (legacy?.expiresAt > Date.now() ? legacy.userId : ''));
      if (!u || (payload && (payload.sessionVersion || 0) !== (u.sessionVersion || 0))) return res.sendStatus(401);
      req.authUserId = u.id; req.authUser = u; next();
    },
    sendError: (res: any, status: number, code: string, message: string, details?: any) => res.status(status).json({ error: { code, message, details } }),
  };
  const app = express(); app.use(express.json({ limit: '3mb' })); registerAuthRoutes(app, ctx);
  const send = (email: string, purpose = 'register') => request(app).post('/api/auth/email-code/send').send({ email, purpose });
  const verify = (email: string, code: string, purpose = 'register') => request(app).post('/api/auth/email-code/verify').send({ email, code, purpose });
  const profile = { username: 'لاعب جديد', gender: 'U', birthDate: '2000-02-29', avatar: { type: 'system', value: 'sage' }, acceptedTerms: true, termsVersion: AUTH_TERMS_VERSION, privacyVersion: AUTH_PRIVACY_VERSION };
  const complete = (registrationToken: string, extra: any = {}) => request(app).post('/api/auth/registration/complete').send({ registrationToken, ...profile, ...extra });
  return { app, ctx, send, verify, complete, profile };
}

it('reports server policy and does not create users until verified profile completion; concurrent retries are safe', async () => {
  const { app, ctx, send, verify, complete } = setup();
  const config = await request(app).get('/api/auth/config'); expect(config.status).toBe(200); expect(config.body.serverDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const sent = await send(' New@Example.test '); expect(sent.status).toBe(200); expect(sent.body.developmentCode).toMatch(/^\d{6}$/);
  expect(ctx.users).toHaveLength(0); expect(Object.keys(ctx.wallets)).toHaveLength(0);
  const proof = await verify('new@example.test', sent.body.developmentCode); expect(proof.body.kind).toBe('registration');
  expect(ctx.users).toHaveLength(0);
  const results = await Promise.all([complete(proof.body.registrationToken), complete(proof.body.registrationToken)]);
  expect(results.map(r => r.status)).toEqual([200, 200]); expect(results[0].body.user.id).toBe(results[1].body.user.id);
  expect(ctx.users).toHaveLength(1); expect(Object.keys(ctx.wallets)).toHaveLength(1); expect(ctx.levelEvents.filter((e: any) => e.kind === 'LOGIN')).toHaveLength(1);
  expect(results[0].body.user.profileComplete).toBe(true); expect(results[0].body.user).not.toHaveProperty('birthDate');
});

it('rejects cross-purpose and reused codes, underage birth dates, invalid consent, avatar URLs and unknown tags', async () => {
  const { app, send, verify, complete } = setup();
  const sent = await send('policy@example.test');
  expect((await verify('policy@example.test', sent.body.developmentCode, 'reset')).status).toBe(401);
  const proof = await verify('policy@example.test', sent.body.developmentCode);
  expect((await verify('policy@example.test', sent.body.developmentCode)).status).toBe(401);
  expect((await complete(proof.body.registrationToken, { birthDate: '2020-01-01' })).status).toBe(400);
  expect((await complete(proof.body.registrationToken, { acceptedTerms: false })).status).toBe(400);
  expect((await complete(proof.body.registrationToken, { termsVersion: 'outdated' })).status).toBe(400);
  expect((await complete(proof.body.registrationToken, { avatar: { type: 'upload', value: 'https://attacker.test/a.png' } })).status).toBe(400);
  const session = await complete(proof.body.registrationToken);
  expect((await request(app).put('/api/auth/preferences').auth(session.body.token, { type: 'bearer' }).send({ tags: ['unknown'] })).status).toBe(400);
  expect((await request(app).put('/api/auth/preferences').auth(session.body.token, { type: 'bearer' }).send({ tags: ['valorant', 'coffee'] })).body.tags).toEqual(['valorant', 'coffee']);
});

it('logs existing accounts in place and preserves legacy passwords, wallets and identity', async () => {
  const { app, ctx, send, verify } = setup();
  ctx.users.push({ id: 'old', email: 'old@example.test', username: 'Old player', role: 'USER', passwordHash: legacyHashPassword('oldpass8'), createdAt: 1 });
  ctx.wallets.old = { userId: 'old', balance: 123, lastUpdated: 1 };
  const login = await request(app).post('/api/auth/login').send({ email: ' OLD@example.test ', password: 'oldpass8' }); expect(login.status).toBe(200); expect(login.body.user.profileComplete).toBe(false);
  const sent = await send('old@example.test'); const verified = await verify('old@example.test', sent.body.developmentCode);
  expect(verified.body.kind).toBe('session'); expect(verified.body.session.user.id).toBe('old'); expect(ctx.users).toHaveLength(1); expect(ctx.wallets.old.balance).toBe(123);
});

it('reset sends do not expose unknown accounts and reset invalidates all sessions without logging in', async () => {
  const { app, ctx, send, verify, complete } = setup();
  const sent = await send('reset@example.test'); const proof = await verify('reset@example.test', sent.body.developmentCode); const logged = await complete(proof.body.registrationToken);
  const reset = await send('reset@example.test', 'reset'); expect(reset.status).toBe(429);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000);
  try {
    const known = await send('reset@example.test', 'reset'); const unknown = await send('unknown@example.test', 'reset'); expect(known.status).toBe(200); expect(unknown.status).toBe(200);
    expect((await verify('unknown@example.test', unknown.body.developmentCode, 'reset')).status).toBe(401);
    const grant = await verify('reset@example.test', known.body.developmentCode, 'reset'); expect(grant.body.kind).toBe('reset');
    expect((await request(app).post('/api/auth/password/reset').send({ resetToken: grant.body.resetToken, password: 'short' })).status).toBe(400);
    expect((await request(app).post('/api/auth/password/reset').send({ resetToken: grant.body.resetToken, password: 'passwordpassword' })).status).toBe(400);
    const changed = await request(app).post('/api/auth/password/reset').send({ resetToken: grant.body.resetToken, password: 'A long unique gaming passphrase!' }); expect(changed.body).toEqual({ ok: true });
    expect((await request(app).get('/api/auth/session').auth(logged.body.token, { type: 'bearer' })).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: logged.body.refreshToken })).status).toBe(401); expect(Object.keys(ctx.sessions)).toHaveLength(0);
    expect((await request(app).post('/api/auth/password/reset').send({ resetToken: grant.body.resetToken, password: 'Another long enough passphrase!' })).status).toBe(401);
  } finally { clock.mockRestore(); }
});

it('limits repeated verification guesses and shares send cooldown across purposes', async () => {
  const { send, verify } = setup(); const sent = await send('limit@example.test');
  expect((await send('limit@example.test', 'login')).status).toBe(429);
  for (let i = 0; i < 5; i++) expect((await verify('limit@example.test', 'abcdef')).status).toBe(400);
  const wrong = sent.body.developmentCode === '000000' ? '000001' : '000000';
  for (let i = 0; i < 5; i++) expect((await verify('limit@example.test', wrong)).status).toBe(401);
  expect((await verify('limit@example.test', sent.body.developmentCode)).status).toBe(401);
});

it('validates image bytes and dimensions, serves sanitized avatars and binds upload IDs to the verified grant', async () => {
  const { app, send, verify, complete } = setup();
  const first = await send('avatar1@example.test'), second = await send('avatar2@example.test');
  const a = await verify('avatar1@example.test', first.body.developmentCode), b = await verify('avatar2@example.test', second.body.developmentCode);
  expect((await request(app).post('/api/auth/avatar').send({ registrationToken: a.body.registrationToken, image: 'data:image/png;base64,aGVsbG8=' })).status).toBe(400);
  const png = await sharp({ create: { width: 128, height: 128, channels: 4, background: '#C8C9DF' } }).withMetadata({ exif: { IFD0: { Artist: 'Private metadata' } } }).png().toBuffer();
  const image = `data:image/png;base64,${png.toString('base64')}`;
  expect((await request(app).post('/api/auth/avatar').send({ image })).status).toBe(401);
  const upload = await request(app).post('/api/auth/avatar').send({ registrationToken: a.body.registrationToken, image }); expect(upload.status).toBe(200);
  expect((await complete(b.body.registrationToken, { avatar: upload.body.avatar })).status).toBe(400);
  const session = await complete(a.body.registrationToken, { avatar: upload.body.avatar }); expect(session.status).toBe(200); expect(session.body.user.avatar).toBe(upload.body.url);
  const read = await request(app).get(upload.body.url); expect(read.status).toBe(200);
  const meta = await sharp(read.body).metadata(); expect(meta.width).toBe(256); expect(meta.exif).toBeUndefined();
});

it('rolls back account creation on persistence failure and completes old profiles without touching balances', async () => {
  const { app, ctx, send, verify, complete, profile } = setup();
  const sent = await send('persist@example.test'), proof = await verify('persist@example.test', sent.body.developmentCode);
  ctx.persistState.mockImplementationOnce(() => { throw new Error('disk'); });
  expect((await complete(proof.body.registrationToken)).status).toBe(503); expect(ctx.users).toHaveLength(0); expect(Object.keys(ctx.wallets)).toHaveLength(0);
  const session = await complete(proof.body.registrationToken); expect(session.status).toBe(200);
  ctx.wallets[session.body.user.id].balance = 999;
  const updated = await request(app).post('/api/auth/profile/complete').auth(session.body.token, { type: 'bearer' }).send({ ...profile, username: 'Updated Name' });
  expect(updated.status).toBe(200); expect(updated.body.id).toBe(session.body.user.id); expect(ctx.wallets[updated.body.id].balance).toBe(999);
});

it('rotates refresh tokens only once and revokes both JWT and legacy login tokens on logout', async () => {
  const { app, send, verify, complete } = setup();
  const sent = await send('logout@example.test'), proof = await verify('logout@example.test', sent.body.developmentCode), session = await complete(proof.body.registrationToken);
  const refreshes = await Promise.all([request(app).post('/api/auth/refresh').send({ refreshToken: session.body.refreshToken }), request(app).post('/api/auth/refresh').send({ refreshToken: session.body.refreshToken })]);
  expect(refreshes.map(r => r.status).sort()).toEqual([200, 401]);
  const refreshed = refreshes.find(r => r.status === 200)!;
  expect((await request(app).post('/api/auth/logout').auth(session.body.token, { type: 'bearer' }).send({ refreshToken: refreshed.body.refreshToken })).status).toBe(200);
  expect((await request(app).get('/api/auth/session').auth(session.body.token, { type: 'bearer' })).status).toBe(401);
  expect((await request(app).get('/api/auth/session').auth(refreshed.body.token, { type: 'bearer' })).status).toBe(401);
  expect((await request(app).get('/api/auth/session').auth(session.body.legacyToken, { type: 'bearer' })).status).toBe(401);
  expect((await request(app).post('/api/auth/refresh').send({ refreshToken: refreshed.body.refreshToken })).status).toBe(401);
});

it('logout wins over a refresh that has already read its old token', async () => {
  const { app, send, verify, complete } = setup();
  const sent = await send('logout-race@example.test'), proof = await verify('logout-race@example.test', sent.body.developmentCode), session = (await complete(proof.body.registrationToken)).body;
  const cache = getCache(), originalGet = cache.get.bind(cache);
  let release!: () => void, entered!: () => void, intercepted = false;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const reached = new Promise<void>(resolve => { entered = resolve; });
  const spy = vi.spyOn(cache, 'get').mockImplementation(async key => {
    const record = await originalGet(key);
    if (key === `rt:${session.refreshToken}` && !intercepted) { intercepted = true; entered(); await blocked; }
    return record;
  });
  try {
    const pending = request(app).post('/api/auth/refresh').send({ refreshToken: session.refreshToken }).then(response => response);
    await reached;
    expect((await request(app).post('/api/auth/logout').auth(session.token, { type: 'bearer' }).send({ refreshToken: session.refreshToken })).status).toBe(200);
    release(); expect((await pending).status).toBe(401);
  } finally { release(); spy.mockRestore(); }
});

it('logging out one device preserves the same account other-device access, refresh and legacy sessions', async () => {
  const { app, ctx, send, verify, complete } = setup();
  const sent = await send('two-devices@example.test'), proof = await verify('two-devices@example.test', sent.body.developmentCode), first = (await complete(proof.body.registrationToken)).body;
  ctx.users[0].passwordHash = legacyHashPassword('devicepass8');
  const second = (await request(app).post('/api/auth/login').send({ email: 'two-devices@example.test', password: 'devicepass8' })).body;
  expect((await request(app).post('/api/auth/logout').auth(first.token, { type: 'bearer' }).send({ refreshToken: second.refreshToken })).status).toBe(200);
  expect((await request(app).get('/api/auth/session').auth(first.legacyToken, { type: 'bearer' })).status).toBe(401);
  expect((await request(app).post('/api/auth/refresh').send({ refreshToken: first.refreshToken })).status).toBe(401);
  expect((await request(app).get('/api/auth/session').auth(second.token, { type: 'bearer' })).status).toBe(200);
  expect((await request(app).get('/api/auth/session').auth(second.legacyToken, { type: 'bearer' })).status).toBe(200);
  expect((await request(app).post('/api/auth/refresh').send({ refreshToken: second.refreshToken })).status).toBe(200);
});

it('logout also invalidates a successor refresh token written after family revocation', async () => {
  const { app, send, verify, complete } = setup();
  const sent = await send('logout-write-race@example.test'), proof = await verify('logout-write-race@example.test', sent.body.developmentCode), session = (await complete(proof.body.registrationToken)).body;
  const cache = getCache(), originalSet = cache.setex.bind(cache);
  let release!: () => void, entered!: () => void, successor = '';
  const blocked = new Promise<void>(resolve => { release = resolve; }), reached = new Promise<void>(resolve => { entered = resolve; });
  const spy = vi.spyOn(cache, 'setex').mockImplementation(async (key, ttl, value) => {
    if (key.startsWith('rt:') && key !== `rt:${session.refreshToken}` && !successor) { successor = key.slice(3); entered(); await blocked; }
    await originalSet(key, ttl, value);
  });
  try {
    const pending = request(app).post('/api/auth/refresh').send({ refreshToken: session.refreshToken }).then(response => response);
    await reached;
    expect((await request(app).post('/api/auth/logout').auth(session.token, { type: 'bearer' }).send({ refreshToken: session.refreshToken })).status).toBe(200);
    release(); expect((await pending).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: successor })).status).toBe(401);
  } finally { release(); spy.mockRestore(); }
});

it('a legacy bearer logout closes its own family even without a refresh token', async () => {
  const { app, ctx, send, verify, complete } = setup();
  const sent = await send('legacy-logout@example.test'), proof = await verify('legacy-logout@example.test', sent.body.developmentCode), first = (await complete(proof.body.registrationToken)).body;
  ctx.users[0].passwordHash = legacyHashPassword('devicepass8');
  const second = (await request(app).post('/api/auth/login').send({ email: 'legacy-logout@example.test', password: 'devicepass8' })).body;
  expect((await request(app).post('/api/auth/logout').auth(first.legacyToken, { type: 'bearer' }).send({})).status).toBe(200);
  expect((await request(app).get('/api/auth/session').auth(first.token, { type: 'bearer' })).status).toBe(401);
  expect((await request(app).post('/api/auth/refresh').send({ refreshToken: first.refreshToken })).status).toBe(401);
  expect((await request(app).get('/api/auth/session').auth(second.token, { type: 'bearer' })).status).toBe(200);
});

it('an expired access bearer can close its own idle family without reviving normal access', async () => {
  const { app, send, verify, complete } = setup();
  const sent = await send('expired-logout@example.test'), proof = await verify('expired-logout@example.test', sent.body.developmentCode), session = (await complete(proof.body.registrationToken)).body;
  const expires = JSON.parse(Buffer.from(session.token.split('.')[1], 'base64url').toString()).exp * 1000;
  const clock = vi.spyOn(Date, 'now').mockReturnValue(expires - 10000);
  try {
    const renewed = await request(app).post('/api/auth/refresh').send({ refreshToken: session.refreshToken }); expect(renewed.status).toBe(200);
    clock.mockReturnValue(expires + 1000);
    expect((await request(app).get('/api/auth/session').auth(session.token, { type: 'bearer' })).status).toBe(401);
    expect((await request(app).get('/api/auth/session').auth(renewed.body.token, { type: 'bearer' })).status).toBe(200);
    expect((await request(app).post('/api/auth/logout').auth(session.token, { type: 'bearer' }).send({ refreshToken: renewed.body.refreshToken })).status).toBe(200);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: renewed.body.refreshToken })).status).toBe(401);
    expect((await request(app).get('/api/auth/session').auth(renewed.body.token, { type: 'bearer' })).status).toBe(401);
    expect((await request(app).get('/api/auth/session').auth(session.legacyToken, { type: 'bearer' })).status).toBe(401);
  } finally { clock.mockRestore(); }
});

it('expired logout cannot revoke a foreign refresh family or accept forged signed claims', async () => {
  const { app, send, verify, complete } = setup();
  async function account(email: string) { const sent = await send(email), proof = await verify(email, sent.body.developmentCode); return (await complete(proof.body.registrationToken)).body; }
  const alice = await account('expired-alice@example.test'), bob = await account('expired-bob@example.test');
  const expires = JSON.parse(Buffer.from(alice.token.split('.')[1], 'base64url').toString()).exp * 1000;
  const clock = vi.spyOn(Date, 'now').mockReturnValue(expires + 1000);
  try {
    const forged = `${alice.token.slice(0, -10)}abcdefghij`;
    expect((await request(app).post('/api/auth/logout').auth(forged, { type: 'bearer' }).send({ refreshToken: bob.refreshToken })).status).toBe(401);
    expect((await request(app).post('/api/auth/logout').auth(alice.token, { type: 'bearer' }).send({ refreshToken: bob.refreshToken })).status).toBe(200);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: alice.refreshToken })).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: bob.refreshToken })).status).toBe(200);
  } finally { clock.mockRestore(); }
});

it('reset during asynchronous token issuance cannot create a usable late legacy session', async () => {
  const { app, ctx } = setup();
  ctx.users.push({ id: 'token-race', email: 'token-race@example.test', username: 'Old', role: 'USER', passwordHash: 'old-hash', sessionVersion: 0, createdAt: 1 });
  const verify = vi.spyOn(passwords, 'verifyPassword').mockResolvedValue({ valid: true, needsRehash: false });
  const cache = getCache(), originalSet = cache.setex.bind(cache);
  let release!: () => void, entered!: () => void, held = false;
  const blocked = new Promise<void>(resolve => { release = resolve; }), reached = new Promise<void>(resolve => { entered = resolve; });
  const spy = vi.spyOn(cache, 'setex').mockImplementation(async (key, ttl, value) => {
    if (key.startsWith('legacy-sf:') && !held) { held = true; entered(); await blocked; }
    await originalSet(key, ttl, value);
  });
  try {
    const pending = request(app).post('/api/auth/login').send({ email: 'token-race@example.test', password: 'old-password' }).then(response => response);
    await reached; ctx.users[0].passwordHash = 'new-reset-hash'; ctx.users[0].sessionVersion = 1;
    release(); expect((await pending).status).toBe(401); expect(Object.keys(ctx.sessions)).toHaveLength(0);
  } finally { release(); spy.mockRestore(); verify.mockRestore(); }
});

it('an uploaded registration avatar can be reused only by its newly created owner and survives persistence retries', async () => {
  const { app, ctx, send, verify, complete, profile } = setup();
  const sent = await send('avatar-owner-transfer@example.test'), proof = await verify('avatar-owner-transfer@example.test', sent.body.developmentCode);
  const png = await sharp({ create: { width: 128, height: 128, channels: 4, background: '#ABCDEF' } }).png().toBuffer();
  const uploaded = await request(app).post('/api/auth/avatar').send({ registrationToken: proof.body.registrationToken, image: `data:image/png;base64,${png.toString('base64')}` });
  ctx.persistState.mockImplementationOnce(() => { throw new Error('disk'); });
  expect((await complete(proof.body.registrationToken, { avatar: uploaded.body.avatar })).status).toBe(503); expect(ctx.users).toHaveLength(0);
  ctx.persistState.mockImplementationOnce(() => {}).mockImplementationOnce(() => { throw new Error('disk'); });
  expect((await complete(proof.body.registrationToken, { avatar: uploaded.body.avatar })).status).toBe(503); expect(ctx.users).toHaveLength(1);
  const registered = await complete(proof.body.registrationToken, { avatar: uploaded.body.avatar }); expect(registered.status).toBe(200);
  const session = registered.body;
  expect((await request(app).post('/api/auth/profile/complete').auth(session.token, { type: 'bearer' }).send({ ...profile, avatar: uploaded.body.avatar, username: 'Updated Owner' })).status).toBe(200);
  const otherSent = await send('avatar-nonowner@example.test'), otherProof = await verify('avatar-nonowner@example.test', otherSent.body.developmentCode), other = (await complete(otherProof.body.registrationToken)).body;
  expect((await request(app).post('/api/auth/profile/complete').auth(other.token, { type: 'bearer' }).send({ ...profile, avatar: uploaded.body.avatar })).status).toBe(400);
});

it.each([false, true])('rejects an old-password login when reset changes credentials during %s rehash', async rehash => {
  const { app, ctx } = setup();
  ctx.users.push({ id: 'credential-race', email: 'credential-race@example.test', username: 'Old', role: 'USER', passwordHash: 'old-hash', sessionVersion: 0, createdAt: 1 });
  let release!: () => void, entered!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const reached = new Promise<void>(resolve => { entered = resolve; });
  const verify = vi.spyOn(passwords, 'verifyPassword').mockImplementation(async () => { if (!rehash) { entered(); await blocked; } return { valid: true, needsRehash: rehash }; });
  const hash = vi.spyOn(passwords, 'hashPassword').mockImplementation(async () => { entered(); await blocked; return 'old-password-rehashed'; });
  try {
    const pending = request(app).post('/api/auth/login').send({ email: 'credential-race@example.test', password: 'old-password' }).then(response => response);
    await reached;
    ctx.users[0].passwordHash = 'new-reset-hash'; ctx.users[0].sessionVersion = 1;
    release(); expect((await pending).status).toBe(401);
    expect(ctx.users[0].passwordHash).toBe('new-reset-hash'); expect(Object.keys(ctx.sessions)).toHaveLength(0);
  } finally { release(); verify.mockRestore(); hash.mockRestore(); }
});

it('retries interrupted session persistence without duplicate login rewards or legacy sessions', async () => {
  const { ctx, send, verify, complete } = setup();
  const sent = await send('retry@example.test'), proof = await verify('retry@example.test', sent.body.developmentCode);
  ctx.persistState.mockImplementationOnce(() => {}).mockImplementationOnce(() => { throw new Error('disk'); });
  expect((await complete(proof.body.registrationToken)).status).toBe(503);
  expect(ctx.users).toHaveLength(1); expect(ctx.levelEvents).toHaveLength(0); expect(Object.keys(ctx.sessions)).toHaveLength(0);
  expect((await complete(proof.body.registrationToken)).status).toBe(200);
  expect(ctx.levelEvents).toHaveLength(1); expect(Object.keys(ctx.sessions)).toHaveLength(1);
});

it('does not let logout revoke another account refresh token', async () => {
  const { app, send, verify, complete } = setup();
  async function account(email: string) { const sent = await send(email), proof = await verify(email, sent.body.developmentCode); return (await complete(proof.body.registrationToken)).body; }
  const alice = await account('alice@example.test'), bob = await account('bob@example.test');
  expect((await request(app).post('/api/auth/logout').auth(alice.token, { type: 'bearer' }).send({ refreshToken: bob.refreshToken })).status).toBe(200);
  expect((await request(app).post('/api/auth/refresh').send({ refreshToken: bob.refreshToken })).status).toBe(200);
});

it('unknown login email yields only a registration grant; failed resend keeps the previously delivered code valid', async () => {
  const { ctx, send, verify } = setup();
  const sent = await send('unknown-login@example.test', 'login');
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000);
  const mail = vi.spyOn(authMail, 'deliverAuthCode').mockRejectedValueOnce(new Error('provider down'));
  try {
    expect((await send('unknown-login@example.test', 'login')).status).toBe(503);
    const verified = await verify('unknown-login@example.test', sent.body.developmentCode, 'login'); expect(verified.body.kind).toBe('registration');
    expect(ctx.users).toHaveLength(0); expect(Object.keys(ctx.wallets)).toHaveLength(0);
  } finally { mail.mockRestore(); clock.mockRestore(); }
});

it('rejects expired codes, expired grants, duplicate tags and more than five tags while allowing an empty selection', async () => {
  const { app, send, verify, complete } = setup();
  const sent = await send('expired@example.test');
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 300001);
  try { expect((await verify('expired@example.test', sent.body.developmentCode)).status).toBe(401); } finally { clock.mockRestore(); }
  const next = await send('tag-limit@example.test'), proof = await verify('tag-limit@example.test', next.body.developmentCode), session = await complete(proof.body.registrationToken);
  const tags = (value: string[]) => request(app).put('/api/auth/preferences').auth(session.body.token, { type: 'bearer' }).send({ tags: value });
  expect((await tags(['coffee', 'coffee'])).status).toBe(400);
  expect((await tags(['valorant', 'pubg', 'fc', 'ml', 'chill', 'coffee'])).status).toBe(400);
  expect((await tags([])).body.tags).toEqual([]);
  const later = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 900001);
  try { expect((await complete(proof.body.registrationToken)).status).toBe(401); } finally { later.mockRestore(); }
});
