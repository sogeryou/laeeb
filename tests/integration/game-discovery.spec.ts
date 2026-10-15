import express from 'express';
import request from 'supertest';
import { afterEach, expect, it, vi } from 'vitest';
import { registerBusinessRoutes } from '../../backend/routes/business';
import { initialLevel } from '../../backend/player-center/officialLevel';

const now = Date.UTC(2026, 9, 15, 12);
const day = 86_400_000;

function setup() {
  vi.spyOn(Date, 'now').mockReturnValue(now);
  const state: any = {
    users: [], companions: [], orders: [], reviews: [], exposureLogs: [{ companionId: 'a', eventType: 'impression', createdAt: now }],
    wallets: {}, diamondWallets: {}, walletTransactions: [], couponTemplates: [], couponGrants: [], riskEvents: [], levelEvents: [],
  };
  const ctx: any = {
    ...state, persistState: vi.fn(),
    getUserById: (id: string) => state.users.find((u: any) => u?.id === id),
    getBanError: (u: any, module: string) => !u || u.accountStatus === 'FROZEN' || u.banModules?.[module] ? 'BANNED' : null,
    authMiddleware: vi.fn((_req: any, res: any) => res.sendStatus(401)),
    sendError: (res: any, status: number, code: string) => res.status(status).json({ error: { code } }),
  };
  const app = express(); app.use(express.json()); registerBusinessRoutes(app, ctx);
  const add = (id: string, changes: any = {}, userChanges: any = {}) => {
    const companion = { id, userId: `user-${id}`, gameName: 'PUBG Mobile', intro: `Intro ${id}`, hourlyRate: 9, status: 'APPROVED', availability: 'ONLINE', ranking: initialLevel(), createdAt: 1, updatedAt: 1, ...changes };
    const user = { id: companion.userId, username: `Player ${id}`, avatar: '/real-avatar.png', bio: `Bio ${id}`, tags: ['Duo'], accountStatus: 'ACTIVE', ...userChanges };
    state.companions.push(companion); state.users.push(user);
    return { companion, user };
  };
  const get = (query = '', game = 'pubg') => request(app).get(`/api/games/${game}/companions${query ? `?${query}` : ''}`);
  return { app, ctx, state, add, get };
}

afterEach(() => vi.restoreAllMocks());

it('registers a public no-store discovery route with literal defaults and empty metadata', async () => {
  const s = setup();
  const response = await s.get();
  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.body).toEqual({ gameId: 'pubg', gameName: 'PUBG Mobile', query: { status: 'ALL', gender: 'ALL', minPrice: 0, maxPrice: 10000, sort: 'DEFAULT' }, page: 1, limit: 20, total: 0, onlineCount: 0, items: [], nextPage: null });
  expect(s.ctx.authMiddleware).not.toHaveBeenCalled();
});

it('uses current exact primary game names instead of stale application IDs or extra services', async () => {
  const s = setup();
  s.add('mobile', { gameName: '  pUbG   mobile  ', application: { details: { gameId: 'val' } } });
  s.add('pc', { gameName: 'PUBG PC', application: { details: { gameId: 'pubg' } } });
  s.add('battlegrounds', { gameName: 'PUBG: BATTLEGROUNDS' });
  s.add('edited', { gameName: 'Valorant', application: { details: { gameId: 'pubg' } }, services: [{ id: 'extra', name: 'PUBG Mobile', unitPrice: 5, unit: 'hr' }] });
  s.add('custom', { gameName: 'Battle Chess', application: { details: { gameId: 'pubg' } } });
  expect((await s.get()).body.items.map((p: any) => p.id)).toEqual(['mobile']);
  expect((await s.get('', 'val')).body.items.map((p: any) => p.id)).toEqual(['edited']);
});

it('includes aliases from the old catalog display names', async () => {
  const s = setup(); s.add('old', { gameName: 'Battle Royale' });
  expect((await s.get()).body.items.map((p: any) => p.id)).toEqual(['old']);
});

it('returns only explicit public identity and service fields without private state or write side effects', async () => {
  const s = setup();
  s.add('a', { application: { details: { rank: 'private-rank', platform: 'private-platform' }, requestFingerprint: 'private-fingerprint', rejectionReason: 'private-reason' }, secret: 'private-companion', services: [{ id: 'extra', name: 'Coaching', unitPrice: 6, unit: 'match', secret: 'private-service' }] }, { gender: 'F', email: 'private-email', phone: 'private-phone', passwordHash: 'private-hash', permissions: ['private-permission'], wallet: { secret: 'private-wallet' } });
  s.state.orders.push({ companionId: 'a', status: 'CREATED', expiresAt: now - day, secret: 'private-order' });
  const before = structuredClone(s.state);
  const response = await s.get();
  expect(response.status).toBe(200);
  expect(response.body.items[0]).toMatchObject({ id: 'a', userId: 'user-a', name: 'Player a', avatarUrl: '/real-avatar.png', bio: 'Bio a', tags: ['Duo'], profileGender: 'F', game: 'PUBG Mobile', onlineStatus: 'Online', price: 9, bookable: true, rating: 0, orderCount: '0', reviewCount: 0, completedOrders30d: 0 });
  expect(Object.keys(response.body.items[0]).sort()).toEqual(['id', 'userId', 'name', 'avatarUrl', 'bio', 'tags', 'profileGender', 'game', 'onlineStatus', 'price', 'bookable', 'rating', 'orderCount', 'reviewCount', 'completedOrders30d', 'services'].sort());
  expect(JSON.stringify(response.body)).not.toContain('private-');
  expect(response.body.items[0].services.map((v: any) => v.id)).toEqual(['a', 'extra']);
  expect(s.state).toEqual(before);
  expect(s.ctx.persistState).not.toHaveBeenCalled();
  expect(s.ctx.exposureLogs).toEqual(before.exposureLogs);
});

it.each(['PENDING', 'REJECTED', 'MISSING_USER', 'FROZEN', 'RISK_HOLD', 'SUSPENDED', 'ORDER', 'ACCEPT_ORDER'])('excludes %s providers and rechecks live eligibility on every request', async restriction => {
  const s = setup(); const { companion, user } = s.add('a'); s.add('b');
  expect((await s.get()).body.total).toBe(2);
  if (['PENDING', 'REJECTED'].includes(restriction)) companion.status = restriction;
  if (restriction === 'MISSING_USER') s.state.users.shift();
  if (['FROZEN', 'RISK_HOLD'].includes(restriction)) user.accountStatus = restriction;
  if (restriction === 'SUSPENDED') companion.ranking.suspended = true;
  if (['ORDER', 'ACCEPT_ORDER'].includes(restriction)) user.banModules = { [restriction]: true };
  const response = await s.get();
  expect(response.body.items.map((p: any) => p.id)).toEqual(['b']);
  expect(response.body.onlineCount).toBe(1);
  expect(s.ctx.persistState).not.toHaveBeenCalled();
});

it('filters actual gender, status and displayed primary price independently from game online count', async () => {
  const s = setup();
  s.add('a', { hourlyRate: 12.5, services: [{ id: 'cheap', name: 'Extra', unitPrice: 1, unit: 'match' }] }, { gender: 'F' });
  s.add('b', { availability: 'BUSY' }, { gender: 'M' });
  s.add('c', { availability: 'OFFLINE' }, { gender: 'U' });
  s.add('d', {}, { gender: undefined });
  const response = await s.get('status=ONLINE&gender=F&minPrice=12.50&maxPrice=12.50&sort=SCORE');
  expect(response.status).toBe(200);
  expect(response.body.query).toEqual({ status: 'ONLINE', gender: 'F', minPrice: 12.5, maxPrice: 12.5, sort: 'SCORE' });
  expect(response.body).toMatchObject({ total: 1, onlineCount: 2 });
  expect(response.body.items.map((p: any) => p.id)).toEqual(['a']);
  expect(response.body.items[0].services[0]).toMatchObject({ id: 'a', variants: [{ name: 'PUBG Mobile', price: 12.5, unit: 'hr' }] });
  expect((await s.get('maxPrice=2')).body.total).toBe(0);
  expect((await s.get('gender=U')).body.items.map((p: any) => p.id)).toEqual(['c']);
  expect((await s.get('gender=M')).body.items.map((p: any) => p.id)).toEqual(['b']);
});

it('does not impose a 100-price cutoff or invent bookability for out-of-band, zero, busy or offline prices', async () => {
  const s = setup();
  s.add('expensive', { hourlyRate: 250 }); s.add('zero', { hourlyRate: 0 });
  s.add('busy', { availability: 'BUSY' }); s.add('offline', { availability: 'OFFLINE' }); s.add('online');
  const response = await s.get('minPrice=200&maxPrice=300');
  expect(response.status).toBe(200);
  expect(response.body.items).toMatchObject([{ id: 'expensive', price: 250, bookable: false }]);
  const all = (await s.get()).body.items;
  expect(all.map((p: any) => [p.id, p.bookable])).toEqual([['expensive', false], ['online', true], ['zero', false], ['busy', false], ['offline', false]]);
  expect(all.find((p: any) => p.id === 'busy').onlineStatus).toBe('Busy');
  expect(all.find((p: any) => p.id === 'offline').onlineStatus).toBe('Offline');
});

it('keeps the authoritative primary service ahead of legacy duplicates and reads current edits', async () => {
  const s = setup();
  const { companion } = s.add('a', { services: [{ id: 'a', name: 'Old primary', unitPrice: 1, unit: 'match' }, { id: 'extra', name: 'Real extra', unitPrice: 5, unit: 'hr' }] });
  const first = (await s.get()).body.items[0];
  expect(first.services.map((v: any) => v.id)).toEqual(['a', 'extra']);
  expect(first.services[0]).toMatchObject({ id: 'a', name: 'PUBG Mobile', variants: [{ name: 'PUBG Mobile', price: 9, unit: 'hr' }] });
  companion.hourlyRate = 14;
  expect((await s.get('minPrice=14&maxPrice=14')).body.items[0]).toMatchObject({ price: 14, bookable: true });
  companion.gameName = 'Valorant';
  expect((await s.get()).body.total).toBe(0);
  expect((await s.get('', 'val')).body.items[0].services[0]).toMatchObject({ id: 'a', name: 'Valorant', variants: [{ name: 'Valorant', price: 14, unit: 'hr' }] });
  expect(s.ctx.persistState).not.toHaveBeenCalled();
});

it('preserves legacy IDs, names and units exactly as existing checkout presents them', async () => {
  const s = setup();
  s.add(' legacy-id ', { services: [{ id: ' extra-id ', name: ' Real extra ', unitPrice: 5, unit: ' legacy-unit ' }] });
  const response = await s.get();
  expect(response.status).toBe(200);
  expect(response.body.items[0]).toMatchObject({ id: ' legacy-id ', userId: 'user- legacy-id ' });
  expect(response.body.items[0].services.map((v: any) => v.id)).toEqual([' legacy-id ', ' extra-id ']);
  expect(response.body.items[0].services[1]).toMatchObject({ name: ' Real extra ', variants: [{ name: ' Real extra ', price: 5, unit: ' legacy-unit ' }] });
});

it('derives numeric settled 30-day metrics and approved valid ratings with stable ID ties', async () => {
  const s = setup(); s.add('z'); s.add('b'); s.add('a'); s.add('empty');
  const order = (companionId: string, changes: any = {}) => s.state.orders.push({ companionId, status: 'COMPLETED', settlementDone: true, completedAt: now - 1, ...changes });
  for (let i = 0; i < 12; i++) order('z');
  order('a'); order('a'); order('b'); order('b');
  for (const changes of [{ completedAt: now - 30 * day }, { completedAt: now + 1 }, { completedAt: undefined }, { completedAt: NaN }, { completedAt: String(now - 1) }, { settlementDone: false }, { settlementDone: 'yes' }, { status: 'CANCELLED' }]) order('a', changes);
  const review = (companionId: string, rating: any, status = 'APPROVED') => s.state.reviews.push({ companionId, rating, status });
  review('a', 5); review('a', 3); review('b', 4); review('z', 2);
  for (const rating of [0, 6, NaN, Infinity, '5', null]) review('a', rating);
  review('a', 1, 'PENDING'); review('a', 1, 'REJECTED');
  const byOrders = (await s.get('sort=ORDERS')).body.items;
  expect(byOrders.map((p: any) => p.id)).toEqual(['z', 'a', 'b', 'empty']);
  expect(byOrders.find((p: any) => p.id === 'a')).toMatchObject({ completedOrders30d: 2, orderCount: '2', reviewCount: 2, rating: 4 });
  expect(byOrders.find((p: any) => p.id === 'empty')).toMatchObject({ completedOrders30d: 0, orderCount: '0', reviewCount: 0, rating: 0 });
  expect((await s.get('sort=SCORE')).body.items.map((p: any) => p.id)).toEqual(['a', 'b', 'z', 'empty']);
});

it('paginates bounded live results with filtered totals and literal page acknowledgements', async () => {
  const s = setup(); for (const id of ['e', 'c', 'd', 'a', 'b']) s.add(id);
  const first = (await s.get('limit=2')).body;
  expect(first).toMatchObject({ page: 1, limit: 2, total: 5, onlineCount: 5, nextPage: 2 });
  expect(first.items.map((p: any) => p.id)).toEqual(['a', 'b']);
  const second = (await s.get('page=2&limit=2')).body;
  expect(second).toMatchObject({ page: 2, limit: 2, nextPage: 3 });
  expect(second.items.map((p: any) => p.id)).toEqual(['c', 'd']);
  const last = (await s.get('page=3&limit=2')).body;
  expect(last.items.map((p: any) => p.id)).toEqual(['e']); expect(last.nextPage).toBeNull();
  const past = (await s.get('page=9007199254740991&limit=50')).body;
  expect(past).toMatchObject({ page: Number.MAX_SAFE_INTEGER, limit: 50, total: 5, items: [], nextPage: null });
  s.state.companions[2].gameName = 'Valorant';
  expect((await s.get('page=2&limit=2')).body.items.map((p: any) => p.id)).toEqual(['c', 'e']);
});

it.each(['unknown', 'PUBG', '__proto__'])('returns a standard no-store 404 for unsupported ID %s', async game => {
  const s = setup(); const response = await s.get('', game);
  expect(response.status).toBe(404); expect(response.body.error.code).toBeTruthy();
  expect(response.headers['cache-control']).toBe('no-store');
});

it.each([
  'status=BUSY', 'status=online', 'gender=Female', 'sort=PRICE', 'status=', 'gender=', 'sort=',
  'page=0', 'page=-1', 'page=1.5', 'page=1e2', 'page=9007199254740992', 'page=',
  'limit=0', 'limit=51', 'limit=1.1', 'limit=Infinity', 'limit=',
  'minPrice=-1', 'minPrice=NaN', 'maxPrice=Infinity', 'maxPrice=1.001', 'minPrice=1e2',
  'minPrice=', 'maxPrice=', 'minPrice=200&maxPrice=100', 'minPrice=0x10', 'maxPrice=%20',
  'userId=provider', 'ownerId=provider', 'admin=true', 'anything=1',
  'status=ALL&status=ONLINE', 'gender[]=M', 'page=1&page=2', 'limit[]=2', 'minPrice[x]=1', 'sort[x]=SCORE',
  '__proto__=injected', '__proto__[status]=ONLINE',
])('strictly rejects malformed or unrecognized query: %s', async query => {
  const s = setup(); s.add('a'); const response = await s.get(query);
  expect(response.status).toBe(400); expect(response.body.error.code).toBeTruthy();
  expect(response.headers['cache-control']).toBe('no-store');
  expect(s.ctx.persistState).not.toHaveBeenCalled();
});

it('isolates malformed legacy records instead of crashing or exposing structured private fields', async () => {
  const s = setup(); s.add('good');
  s.state.companions.push(null, { id: 'bad-name', gameName: {} });
  s.state.users.unshift(null); s.state.orders.push(null); s.state.reviews.push(null);
  s.add('bad-price', { hourlyRate: Infinity }); s.add('negative', { hourlyRate: -1 });
  s.add('bad-services', { services: { not: 'an array' } });
  s.add('invalid-extra', { services: [null, { id: 'broken', unitPrice: Infinity }, { id: 'valid', name: 'Real extra', unitPrice: 5, unit: 'match' }] });
  s.add('bad-public', {}, { tags: [{ email: 'private-tag' }], bio: { passwordHash: 'private-bio' } });
  const before = structuredClone(s.state);
  const response = await s.get();
  expect(response.status).toBe(200);
  expect(response.body.items.some((p: any) => p.id === 'good')).toBe(true);
  expect(response.body.items.some((p: any) => ['bad-price', 'negative', 'bad-public'].includes(p.id))).toBe(false);
  expect(response.body.items.find((p: any) => p.id === 'invalid-extra')?.services.map((v: any) => v.id)).toEqual(['invalid-extra', 'valid']);
  expect(JSON.stringify(response.body)).not.toContain('private-');
  expect(s.state).toEqual(before); expect(s.ctx.persistState).not.toHaveBeenCalled();
});
