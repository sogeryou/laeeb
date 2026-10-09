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
