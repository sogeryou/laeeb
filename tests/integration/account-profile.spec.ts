import express from 'express';
import request from 'supertest';
import { afterAll, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { registerAccountProfileRoutes } from '../../backend/account/profile';
import { registerAuthRoutes } from '../../backend/routes/auth';
import { registerSocialRoutes } from '../../backend/routes/social';
import { registerSocialContentRoutes } from '../../backend/routes/socialContent';
import { registerBusinessRoutes } from '../../backend/routes/business';
import { profileAllowsRequest, systemAvatarUrl, toAuthUser } from '../../backend/auth/profile';
import { defaultState, migrateState } from '../../backend/state/jsonState';
import { newAuthState } from '../../backend/auth/state';
import { initialLevel } from '../../backend/player-center/officialLevel';

vi.hoisted(() => { process.env.AUTH_AVATAR_DIR = `/tmp/le3eb-account-profile-avatars-${process.pid}-${Date.now()}`; });
afterAll(async () => {
  if (process.env.AUTH_AVATAR_DIR?.startsWith('/tmp/le3eb-account-profile-avatars-')) {
    await fs.rm(process.env.AUTH_AVATAR_DIR, { recursive: true, force: true });
  }
});

function setup(saved?: any) {
  const state: any = saved || {
    ...defaultState(), authState: newAuthState(),
    users: ['buyer', 'provider', 'other'].map(id => ({
      id, username: id, email: `${id}@test.local`, passwordHash: 'fixture-only', role: id === 'provider' ? 'PLAYER' : 'USER',
      createdAt: 1, accountStatus: 'ACTIVE', gender: 'U', birthDate: '2000-01-01', avatar: systemAvatarUrl('sage'),
      consent: { termsVersion: 'fixture', privacyVersion: 'fixture', acceptedAt: 1 }, tags: ['voice'],
    })),
    companions: [{ id: 'cp', userId: 'provider', gameName: 'Game', intro: 'Legacy service introduction', hourlyRate: 8,
      status: 'APPROVED', availability: 'ONLINE', ranking: initialLevel(), createdAt: 1, updatedAt: 1,
      services: [{ id: 'match', name: 'Ranked', unitPrice: 6, unit: 'match' }] }],
  };
  let persisted: any;
  const ctx: any = {
    ...state,
    persistState: vi.fn(() => { persisted = structuredClone(state); }),
    getUserById: (id: string) => state.users.find((u: any) => u.id === id),
    toPublicUser: toAuthUser, createToken: () => 'fixture-token',
    getBanError: () => null,
    requireAdmin: () => (_req: any, res: any) => res.sendStatus(403),
    authMiddleware: (req: any, res: any, next: any) => {
      const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
      const user = ctx.getUserById(token);
      if (!user) return ctx.sendError(res, 401, 'AUTH_UNAUTHORIZED', 'Unauthorized');
      if (!profileAllowsRequest(user, req.path, req.method)) return ctx.sendError(res, 403, 'AUTH_PROFILE_INCOMPLETE', 'Complete profile');
      req.authUserId = user.id; req.authUser = user; next();
    },
    sendError: (res: any, status: number, code: string, message: string, details?: any) => res.status(status).json({ error: { code, message, details } }),
  };
  const app = express(); app.use(express.json({ limit: '3mb' }));
  registerAccountProfileRoutes(app, ctx); registerAuthRoutes(app, ctx);
  registerSocialRoutes(app, ctx); registerSocialContentRoutes(app, ctx); registerBusinessRoutes(app, ctx);
  const get = (url = '/api/account/profile', actor = 'buyer') => request(app).get(url).auth(actor, { type: 'bearer' });
  const patch = (body: any, actor = 'buyer') => request(app).patch('/api/account/profile').auth(actor, { type: 'bearer' }).send(body);
  const draft = async (changes: any = {}, actor = 'buyer') => {
    const current = await get('/api/account/profile', actor);
    expect(current.status).toBe(200);
    return { revision: current.body.revision, username: 'New nickname', bio: 'Personal bio', ...changes };
  };
  return { app, ctx, state, get, patch, draft, saved: () => persisted };
}

it('returns the authenticated owner and default empty bio without saving or private credential fields', async () => {
  const s = setup(); const current = await s.get();
  expect(current.status).toBe(200);
  expect(current.headers['cache-control']).toBe('no-store');
  expect(current.body).toMatchObject({ user: { id: 'buyer', username: 'buyer', role: 'USER', profileComplete: true }, bio: '' });
  expect(current.body.revision).toMatch(/^[a-f0-9]{64}$/);
  for (const key of ['password', 'passwordHash', 'birthDate', 'consent', 'sessionVersion']) expect(current.body.user).not.toHaveProperty(key);
  expect((await s.get()).body).toEqual(current.body);
  expect((await s.get('/api/account/profile', 'other')).body.user.id).toBe('other');
  expect(s.ctx.persistState).not.toHaveBeenCalled();
  expect(s.state.users[0]).not.toHaveProperty('bio');
});

it('uses authoritative auth eligibility and no-store on rejected reads and writes', async () => {
  const s = setup();
  for (const response of [await request(s.app).get('/api/account/profile'), await request(s.app).patch('/api/account/profile').send({})]) {
    expect(response.status).toBe(401); expect(response.headers['cache-control']).toBe('no-store');
  }
  delete s.state.users[0].birthDate;
  for (const response of [await s.get(), await s.patch({})]) {
    expect(response.status).toBe(403); expect(response.body.error.code).toBe('AUTH_PROFILE_INCOMPLETE');
    expect(response.headers['cache-control']).toBe('no-store');
  }
  expect(s.ctx.persistState).not.toHaveBeenCalled();
});

it('trims nickname and personal bio, preserves all unrelated state and recovers saved fields after restoration', async () => {
  const s = setup(); const before = structuredClone(s.state);
  const result = await s.patch(await s.draft({ username: '  لاعب جديد  ', bio: '  Hello\nمرحبا  ', avatar: { type: 'system', value: 'gold' } }));
  expect(result.status).toBe(200); expect(result.headers['cache-control']).toBe('no-store');
  expect(result.body).toMatchObject({ bio: 'Hello\nمرحبا', user: { id: 'buyer', username: 'لاعب جديد', bio: 'Hello\nمرحبا', avatar: systemAvatarUrl('gold'), role: 'USER', permissions: [] } });
  const expected = structuredClone(before);
  Object.assign(expected.users[0], { username: 'لاعب جديد', bio: 'Hello\nمرحبا', avatar: systemAvatarUrl('gold') });
  expect(s.state).toEqual(expected); expect(s.saved()).toEqual(expected);
  const restored = setup(migrateState(JSON.parse(JSON.stringify(s.saved())), false));
  expect((await restored.get()).body).toEqual(result.body);
  expect(restored.state.schemaVersion).toBe(before.schemaVersion);
  expect((toAuthUser(s.state.users[0]) as any).bio).toBe('Hello\nمرحبا');
});

it('keeps an omitted avatar and intentionally clears a saved bio', async () => {
  const s = setup(); s.state.users[0].bio = 'Old bio';
  const result = await s.patch(await s.draft({ bio: '  ' }));
  expect(result.status).toBe(200); expect(result.body.bio).toBe('');
  expect(s.state.users[0].avatar).toBe(systemAvatarUrl('sage'));
});

it.each(['userId', 'id', 'role', 'password', 'permissions', 'gender', 'birthDate', 'acceptedTerms', 'consent', 'url'])('rejects injected %s without mutation', async field => {
  const s = setup(); const original = structuredClone(s.state);
  const result = await s.patch(await s.draft({ [field]: 'other' }));
  expect(result.status).toBe(400); expect(result.body.error.code).toBe('INPUT_INVALID');
  expect(result.headers['cache-control']).toBe('no-store');
  expect(s.state).toEqual(original); expect(s.ctx.persistState).not.toHaveBeenCalled();
});

it.each([
  null, [], {}, { revision: '' }, { revision: 1 }, { username: 'x' }, { username: 'x'.repeat(33) },
  { username: 'ab\u0000' }, { username: 'a\u200db' }, { username: 'x'.repeat(10000) },
  { bio: 5 }, { bio: 'x'.repeat(281) }, { bio: 'a\u0000b' }, { bio: 'a\u001bb' }, { bio: 'a\u202eb' },
  { bio: ' '.repeat(5000) }, { avatar: null }, { avatar: { type: 'external', value: 'url' } },
  { avatar: { type: 'system', value: 'sage', url: 'https://invalid.test' } },
])('rejects malformed and oversized input %#', async changes => {
  const s = setup(); const body = await s.draft();
  const result = await s.patch(changes === null || Array.isArray(changes) || Object.keys(changes).length === 0 ? changes : { ...body, ...changes });
  expect(result.status).toBe(400); expect(result.body.error.code).toBe('INPUT_INVALID');
  expect(s.ctx.persistState).not.toHaveBeenCalled(); expect(s.state.users[0].username).toBe('buyer');
});

it('counts bio graphemes, supports emoji joiners, Arabic and plain text without interpreting markup', async () => {
  const s = setup(); const family = '👨‍👩‍👧‍👦';
  const valid = await s.patch(await s.draft({ bio: family.repeat(280) }));
  expect(valid.status).toBe(200); expect(valid.body.bio).toBe(family.repeat(280));
  const invalid = await s.patch(await s.draft({ bio: family.repeat(281) }));
  expect(invalid.status).toBe(400); expect(invalid.body.error.code).toBe('INPUT_INVALID');
  const text = '<script>not executed</script> مرحبا';
  expect((await s.patch(await s.draft({ bio: text }))).body.bio).toBe(text);
});

it('rejects case-insensitive nickname collisions but allows the same owner to change casing', async () => {
  const s = setup(); const conflict = await s.patch(await s.draft({ username: '  PROVIDER  ' }));
  expect(conflict.status).toBe(409); expect(conflict.body.error.code).toBe('PROFILE_NICKNAME_TAKEN');
  expect(s.ctx.persistState).not.toHaveBeenCalled();
  const result = await s.patch(await s.draft({ username: 'BUYER' }));
  expect(result.status).toBe(200); expect(result.body.user.username).toBe('BUYER');
});

it('uses the canonical URL for an owned upload and never uses stored or client-supplied arbitrary URLs', async () => {
  const s = setup(); const id = 'a'.repeat(48);
  s.state.authState.uploads[id] = { owner: 'user:buyer', url: 'https://invalid.test/avatar.png', createdAt: 1 };
  const result = await s.patch(await s.draft({ avatar: { type: 'upload', value: id } }));
  expect(result.status).toBe(200); expect(result.body.user.avatar).toBe(`/api/auth/avatars/uploads/${id}.png`);
  expect(s.state.authState.uploads[id].url).toBe('https://invalid.test/avatar.png');
});

it.each(['other', 'grant', 'missing', 'path', 'url', 'system'])('rejects invalid or foreign avatar %s with the same non-disclosing error', async kind => {
  const s = setup(); const id = 'b'.repeat(48);
  if (kind === 'other' || kind === 'grant') s.state.authState.uploads[id] = { owner: `${kind === 'other' ? 'user:other' : 'grant:fixture'}`, url: `/api/auth/avatars/uploads/${id}.png`, createdAt: 1 };
  const avatar = { type: kind === 'system' ? 'system' : 'upload', value: kind === 'path' ? '../file' : kind === 'url' ? 'https://invalid.test/avatar.png' : kind === 'system' ? 'unknown' : id };
  const result = await s.patch(await s.draft({ avatar }));
  expect(result.status).toBe(400); expect(result.body.error.code).toBe('PROFILE_AVATAR_INVALID');
  expect(s.ctx.persistState).not.toHaveBeenCalled(); expect(s.state.users[0].avatar).toBe(systemAvatarUrl('sage'));
});

it('rejects stale changed state but replays exact desired state without a second save', async () => {
  const s = setup(); const body = await s.draft();
  const result = await s.patch(body); expect(result.status).toBe(200);
  expect(result.body.revision).not.toBe(body.revision);
  const replay = await s.patch(body); expect(replay.status).toBe(200); expect(replay.body).toEqual(result.body);
  const stale = await s.patch({ ...body, bio: 'Changed draft' });
  expect(stale.status).toBe(409); expect(stale.body.error.code).toBe('PROFILE_STALE');
  expect((await s.get()).body).toEqual(result.body); expect(s.ctx.persistState).toHaveBeenCalledTimes(1);
});

it('returns current no-op state before stale rejection without materializing a legacy bio', async () => {
  const s = setup();
  const result = await s.patch({ revision: '0'.repeat(64), username: 'buyer', bio: '', avatar: { type: 'system', value: 'sage' } });
  expect(result.status).toBe(200); expect(result.body).toEqual((await s.get()).body);
  expect(s.ctx.persistState).not.toHaveBeenCalled(); expect(s.state.users[0]).not.toHaveProperty('bio');
});

it.each(['username', 'bio', 'avatar'])('detects a %s update performed by another existing writer', async field => {
  const s = setup(); const body = await s.draft();
  s.state.users[0][field] = field === 'avatar' ? systemAvatarUrl('peach') : 'External change';
  const changed = await s.get(); expect(changed.body.revision).not.toBe(body.revision);
  const result = await s.patch(body); expect(result.status).toBe(409); expect(result.body.error.code).toBe('PROFILE_STALE');
  expect(s.ctx.persistState).not.toHaveBeenCalled();
});

it('includes owner in the revision even for otherwise identical identity fields', async () => {
  const s = setup(); s.state.users[2].username = s.state.users[0].username;
  expect((await s.get('/api/account/profile', 'other')).body.revision).not.toBe((await s.get()).body.revision);
});

it('serializes concurrent same-revision changed writes while allowing duplicate retries', async () => {
  const s = setup(); const body = await s.draft();
  const results = await Promise.all([s.patch(body), s.patch({ ...body, username: 'Competing name' })]);
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
  expect(results.find(r => r.status === 409)?.body.error.code).toBe('PROFILE_STALE');
  expect(s.ctx.persistState).toHaveBeenCalledTimes(1);
  const current = (await s.get()).body;
  const retry = { revision: current.revision, username: 'Retry name', bio: 'Retry bio' };
  const duplicates = await Promise.all([s.patch(retry), s.patch(retry)]);
  expect(duplicates.map(r => r.status)).toEqual([200, 200]); expect(duplicates[0].body).toEqual(duplicates[1].body);
  expect(s.ctx.persistState).toHaveBeenCalledTimes(2);
});

it('restores the same user object, absent fields and nested references on failed save, then permits retry', async () => {
  const s = setup(); const user = s.state.users[0], consent = user.consent, tags = user.tags;
  const previous = structuredClone(user), body = await s.draft({ avatar: { type: 'system', value: 'peach' } });
  const current = (await s.get()).body;
  s.ctx.persistState.mockImplementationOnce(() => { throw new Error('disk failure'); });
  const result = await s.patch(body); expect(result.status).toBe(503); expect(result.body.error.code).toBe('PROFILE_SAVE_FAILED');
  expect(result.headers['cache-control']).toBe('no-store');
  expect(s.state.users[0]).toBe(user); expect(user).toEqual(previous); expect(user).not.toHaveProperty('bio');
  expect(user.consent).toBe(consent); expect(user.tags).toBe(tags); expect((await s.get()).body).toEqual(current);
  expect((await s.patch(body)).status).toBe(200);
});

it('projects current identity into peers, conversations, post/comment authors and public companion without exposing private fields', async () => {
  const s = setup();
  s.state.socialMessages.push({ id: 'm', senderId: 'provider', receiverId: 'buyer', content: 'Hello', timestamp: 1, type: 'text', requestId: 'm' });
  s.state.socialPosts.push({ id: 'post', userId: 'provider', content: 'Existing post', timestamp: 1, requestId: 'post', status: 'APPROVED', approvedAt: 1 });
  s.state.socialComments.push({ id: 'comment', postId: 'post', userId: 'provider', content: 'Existing comment', timestamp: 2, requestId: 'comment', status: 'APPROVED', approvedAt: 2 });
  s.state.orders.push({ id: 'order', userId: 'buyer', companionId: 'cp', status: 'COMPLETED', createdAt: 1, completedAt: Date.now(),
    settlementDone: true, serviceId: 'match', serviceName: 'Ranked', unitPrice: 6, totalPrice: 6 });
  const companion = s.state.companions[0], services = companion.services, before = structuredClone(s.state);
  const result = await s.patch(await s.draft({ username: 'Current player', bio: 'Personal introduction', avatar: { type: 'system', value: 'peach' } }, 'provider'), 'provider');
  expect(result.status).toBe(200);
  const identity = { userId: 'provider', name: 'Current player', avatarUrl: systemAvatarUrl('peach'), bio: 'Personal introduction' };
  const peer = await s.get('/api/social/peer/cp'); expect(peer.body).toMatchObject(identity);
  expect((await s.get('/api/social/peer/provider')).body).toEqual(peer.body);
  expect((await s.get('/api/social/conversations')).body.items[0].participant).toMatchObject(identity);
  const post = (await s.get('/api/social/posts/post')).body;
  expect(post).toMatchObject({ userName: 'Current player', userAvatar: systemAvatarUrl('peach') });
  expect(post.commentsList[0]).toMatchObject({ userName: 'Current player', userAvatar: systemAvatarUrl('peach') });
  const publicProfile = (await request(s.app).get('/api/companions/cp/profile')).body;
  expect(publicProfile).toMatchObject({ ...identity, price: 8, orderCount: '1' });
  expect(publicProfile.services.every((service: any) => service.description === 'Legacy service introduction')).toBe(true);
  for (const projection of [peer.body, post, post.commentsList[0], publicProfile]) {
    for (const key of ['email', 'passwordHash', 'birthDate', 'consent', 'permissions', 'owner', 'sessionVersion']) expect(projection).not.toHaveProperty(key);
  }
  const expected = structuredClone(before);
  Object.assign(expected.users[1], { username: 'Current player', bio: 'Personal introduction', avatar: systemAvatarUrl('peach') });
  expect(s.state).toEqual(expected); expect(s.state.companions[0]).toBe(companion); expect(companion.services).toBe(services);
});

it('uses legacy companion intro only for absent personal bio, while explicit clearing stays empty', async () => {
  const s = setup();
  expect((await request(s.app).get('/api/companions/cp/profile')).body.bio).toBe('Legacy service introduction');
  const result = await s.patch(await s.draft({ bio: '', username: 'provider' }, 'provider'), 'provider');
  expect(result.status).toBe(200);
  // No-op on a legacy empty personal bio does not materialize a field; a later explicit clear does.
  await s.patch(await s.draft({ bio: 'Personal introduction' }, 'provider'), 'provider');
  await s.patch(await s.draft({ bio: '' }, 'provider'), 'provider');
  const publicProfile = (await request(s.app).get('/api/companions/cp/profile')).body;
  expect(publicProfile.bio).toBe(''); expect((await s.get('/api/social/peer/cp')).body.bio).toBe('');
  expect(publicProfile.services[0].description).toBe('Legacy service introduction');
});

it.each(['post', 'comment'])('projects the saved %s author avatar', async kind => {
  const s = setup();
  s.state.users[1].avatar = systemAvatarUrl('gold');
  s.state.socialPosts.push({ id: 'post', userId: 'provider', content: 'Existing post', timestamp: 1, requestId: 'post', status: 'APPROVED', approvedAt: 1 });
  s.state.socialComments.push({ id: 'comment', postId: 'post', userId: 'provider', content: 'Existing comment', timestamp: 1, requestId: 'comment', status: 'APPROVED', approvedAt: 1 });
  const response = await s.get('/api/social/posts/post');
  expect((kind === 'post' ? response.body : response.body.commentsList[0]).userAvatar).toBe(systemAvatarUrl('gold'));
});

it('projects a saved provider personal bio while retaining service intro', async () => {
  const s = setup(); s.state.users[1].bio = 'Personal bio';
  const response = await request(s.app).get('/api/companions/cp/profile');
  expect(response.body.bio).toBe('Personal bio');
  expect(response.body.services[0].description).toBe('Legacy service introduction');
});

it('exposes an ordinary buyer personal bio and avatar through authenticated social identity', async () => {
  const s = setup();
  expect((await s.patch(await s.draft({ bio: 'Buyer personal introduction', avatar: { type: 'system', value: 'gold' } }))).status).toBe(200);
  const peer = await s.get('/api/social/peer/buyer', 'provider');
  expect(peer.body).toMatchObject({ id: 'buyer', userId: 'buyer', name: 'New nickname', avatarUrl: systemAvatarUrl('gold'), bio: 'Buyer personal introduction', price: 0, game: '' });
  expect(peer.body).not.toHaveProperty('email'); expect(peer.body).not.toHaveProperty('services');
});

it('removes only a failed newly installed avatar record/file, preserves previous uploads and never changes saved identity', async () => {
  const s = setup(); const userBefore = structuredClone(s.state.users[0]);
  s.state.sessions.buyer = { token: 'buyer', userId: 'buyer', expiresAt: Date.now() + 60000 };
  const image = `data:image/png;base64,${(await sharp({ create: { width: 64, height: 64, channels: 4, background: '#33aa66' } }).png().toBuffer()).toString('base64')}`;
  const upload = () => request(s.app).post('/api/auth/avatar').auth('buyer', { type: 'bearer' }).send({ image });
  const first = await upload(); expect(first.status).toBe(200);
  const previous = structuredClone(s.state.authState.uploads);
  let failedId = '';
  s.ctx.persistState.mockImplementationOnce(() => {
    failedId = Object.keys(s.state.authState.uploads).find(id => !previous[id])!;
    throw new Error('disk failure');
  });
  const failed = await upload(); expect(failed.status).toBe(503); expect(failed.body).not.toHaveProperty('avatar');
  expect(failedId).toMatch(/^[a-f0-9]{48}$/);
  expect(s.state.authState.uploads).toEqual(previous);
  const avatarDir = process.env.AUTH_AVATAR_DIR!;
  expect(await fs.readdir(avatarDir)).toEqual([`${first.body.avatar.value}.png`]);
  expect((await request(s.app).get(`/api/auth/avatars/uploads/${failedId}.png`)).status).toBe(404);
  expect((await s.patch(await s.draft({ avatar: { type: 'upload', value: failedId } }))).body.error.code).toBe('PROFILE_AVATAR_INVALID');
  const savedFile = await fs.readFile(path.join(avatarDir, `${first.body.avatar.value}.png`));
  expect((await sharp(savedFile).metadata()).width).toBe(256);
  expect(s.state.users[0]).toEqual(userBefore);
  const retry = await upload(); expect(retry.status).toBe(200); expect(Object.keys(s.state.authState.uploads)).toHaveLength(2);
  expect(s.state.users[0]).toEqual(userBefore);
  const committed = await s.patch(await s.draft({ avatar: retry.body.avatar }));
  expect(committed.status).toBe(200); expect(committed.body.user.avatar).toBe(retry.body.url);
});
