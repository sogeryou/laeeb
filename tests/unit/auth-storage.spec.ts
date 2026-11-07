import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
let testDir: string | undefined;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); if (testDir) fs.rmSync(testDir, { recursive: true, force: true }); testDir = undefined; });
async function setup() {
  vi.resetModules(); testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'le3eb-auth-storage-'));
  vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('LOCAL_DATA_DIR', testDir);
  return { ...(await import('../../backend/state/jsonState')), file: path.join(testDir, 'storage.json') };
}
it('writes private, atomic snapshots and leaves the prior snapshot intact on rename failure', async () => {
  const { saveState, defaultState, file } = await setup(); const initial = defaultState();
  saveState(initial); expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  const before = fs.readFileSync(file, 'utf8');
  const rename = vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => { throw new Error('disk'); });
  const updated = defaultState(); updated.wallets.a = { userId: 'a', balance: 1, lastUpdated: 1 };
  expect(() => saveState(updated)).toThrow('disk'); expect(fs.readFileSync(file, 'utf8')).toBe(before); rename.mockRestore();
});
it('migrates legacy auth state without losing old users, orders, wallets or account status', async () => {
  const { migrateState } = await setup();
  const state = migrateState({ schemaVersion: 11, users: [{ id: 'old', username: 'Old', email: 'old@example.test', role: 'PLAYER', accountStatus: 'FROZEN', passwordHash: 'old', createdAt: 1 }], wallets: { old: { userId: 'old', balance: 9, lastUpdated: 1 } }, orders: [{ id: 'o' }] });
  expect(state.users[0].id).toBe('old'); expect(state.users[0].accountStatus).toBe('FROZEN'); expect(state.users[0].birthDate).toBeUndefined(); expect(state.wallets.old.balance).toBe(9); expect(state.orders[0].id).toBe('o'); expect(state.authState?.codes).toEqual({});
});

it('does not replace an existing corrupt snapshot', async () => {
  const { loadState, file } = await setup();
  fs.writeFileSync(file, '{broken');
  expect(() => loadState()).toThrow();
  expect(fs.readFileSync(file, 'utf8')).toBe('{broken');
});

it('initializes a genuinely missing snapshot', async () => {
  const { loadState, file } = await setup();
  const state = loadState();
  expect(fs.existsSync(file)).toBe(true);
  expect(JSON.parse(fs.readFileSync(file, 'utf8')).schemaVersion).toBe(state.schemaVersion);
});

it('loads an existing valid snapshot without losing its balance', async () => {
  const { loadState, saveState, defaultState } = await setup();
  const existing = defaultState();
  existing.wallets.player = { userId: 'player', balance: 42, lastUpdated: 1 };
  saveState(existing);
  expect(loadState().wallets.player.balance).toBe(42);
});

it('does not initialize when reading an existing snapshot fails', async () => {
  const { loadState, file } = await setup();
  fs.writeFileSync(file, 'original');
  const read = vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
    throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
  });
  expect(() => loadState()).toThrow('permission denied');
  read.mockRestore();
  expect(fs.readFileSync(file, 'utf8')).toBe('original');
});

it('preserves old bytes and throws when migration cannot be saved', async () => {
  const { loadState, file } = await setup();
  const old = JSON.stringify({ schemaVersion: 11, users: [], wallets: { player: { userId: 'player', balance: 17, lastUpdated: 1 } } });
  fs.writeFileSync(file, old);
  const rename = vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => { throw new Error('rename failed'); });
  expect(() => loadState()).toThrow('rename failed');
  rename.mockRestore();
  expect(fs.readFileSync(file, 'utf8')).toBe(old);
});

it.each(['null', '[]', '"text"'])('rejects invalid JSON root %s without replacing it', async raw => {
  const { loadState, file } = await setup();
  fs.writeFileSync(file, raw);
  expect(() => loadState()).toThrow();
  expect(fs.readFileSync(file, 'utf8')).toBe(raw);
});

it('rejects a future schema without downgrading or overwriting it', async () => {
  const { loadState, file, STORAGE_SCHEMA_VERSION } = await setup();
  const future = JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION + 1, users: [], wallets: {} });
  fs.writeFileSync(file, future);
  expect(() => loadState()).toThrow();
  expect(fs.readFileSync(file, 'utf8')).toBe(future);
});

it('loads and migrates a valid legacy snapshot without losing its balance', async () => {
  const { loadState, file, STORAGE_SCHEMA_VERSION } = await setup();
  fs.writeFileSync(file, JSON.stringify({ schemaVersion: 11, users: [], wallets: { player: { userId: 'player', balance: 23, lastUpdated: 1 } } }));
  const state = loadState();
  expect(state.schemaVersion).toBe(STORAGE_SCHEMA_VERSION);
  expect(state.wallets.player.balance).toBe(23);
  expect(JSON.parse(fs.readFileSync(file, 'utf8')).wallets.player.balance).toBe(23);
});

it.each([
  ['wallets', 'bad'],
  ['diamondWallets', []],
  ['walletTransactions', {}],
  ['orders', {}],
  ['wallets', { player: { userId: 'player', balance: 'bad', lastUpdated: 1 } }],
  ['diamondWallets', { player: 'bad' }],
  ['walletTransactions', [null]],
  ['orders', ['bad']],
])('rejects malformed %s data without rewriting the snapshot', async (field, value) => {
  const { loadState, file, STORAGE_SCHEMA_VERSION } = await setup();
  const raw = JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION, users: [], [field]: value });
  fs.writeFileSync(file, raw);
  expect(() => loadState()).toThrow();
  expect(fs.readFileSync(file, 'utf8')).toBe(raw);
});

it('does not replace a dangling storage snapshot symlink', async () => {
  const { loadState, file } = await setup();
  const target = `${file}.missing`;
  fs.symlinkSync(target, file);
  expect(() => loadState()).toThrow();
  expect(fs.lstatSync(file).isSymbolicLink()).toBe(true);
  expect(fs.readlinkSync(file)).toBe(target);
  expect(fs.existsSync(target)).toBe(false);
});

it.each(['codes', 'grants', 'sends', 'failures', 'uploads'].flatMap(field =>
  ['bad', null, [], 42, false].map(value => ({ field, value })),
))('rejects malformed authState.$field map $value without rewriting the snapshot', async ({ field, value }) => {
  const { loadState, file, STORAGE_SCHEMA_VERSION } = await setup();
  const raw = JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION, authState: { [field]: value } });
  fs.writeFileSync(file, raw);
  expect(() => loadState()).toThrow(`Invalid storage snapshot field: authState.${field}`);
  expect(fs.readFileSync(file, 'utf8')).toBe(raw);
});

it('fills missing legacy auth maps while preserving present records and wallet balances', async () => {
  const { loadState, file, STORAGE_SCHEMA_VERSION } = await setup();
  fs.writeFileSync(file, JSON.stringify({
    schemaVersion: 11,
    authState: { codes: {} },
    wallets: { player: { userId: 'player', balance: 31, lastUpdated: 1 } },
  }));
  const state = loadState();
  expect(state.schemaVersion).toBe(STORAGE_SCHEMA_VERSION);
  expect(state.authState).toEqual({ codes: {}, grants: {}, sends: {}, failures: {}, uploads: {} });
  expect(state.wallets.player.balance).toBe(31);
  expect(JSON.parse(fs.readFileSync(file, 'utf8')).authState).toEqual(state.authState);
});
