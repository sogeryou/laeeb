import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const run = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', resolve('scripts/audit-finance-snapshot.ts'), ...args], { encoding: 'utf8', timeout: 10000 });
const minimal = { users: [], wallets: {}, diamondWallets: {}, orders: [], withdrawalRequests: [], walletTransactions: [] };
describe('snapshot CLI', () => {
  it('requires explicit absolute input and rejects unknown flags', () => {
    for (const args of [[], ['--input', 'relative.json'], ['--repair'], ['--input', '/abs', '--repair']]) {
      const r = run(...args); expect(r.status).toBe(1); expect(r.stderr).toBe('AUDIT_USAGE_ERROR\n'); expect(r.stdout).toBe('');
    }
  });
  it.each([['clean', minimal, 0], ['missing', {}, 2], ['suspicious', { ...minimal, users: [{ id: 'u', email: 'UNIQUE_PRIVATE_SENTINEL' }], withdrawalRequests: [{ id: 'w', userId: 'u', status: 'APPROVED', diamondAmount: 1 }] }, 0], ['malformed', '{UNIQUE_PRIVATE_SENTINEL', 1]] as const)('reads %s fixtures without writing or leaking', (_name, data, status) => {
    const dir = mkdtempSync(join(tmpdir(), 'finance-audit-')); dirs.push(dir);
    const file = join(dir, 'snapshot.json'); writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
    const before = readFileSync(file); const listing = readdirSync(dir);
    const r = run('--input', file); expect(r.status).toBe(status); expect(r.stdout + r.stderr).not.toContain('UNIQUE_PRIVATE_SENTINEL');
    expect(readFileSync(file)).toEqual(before); expect(readdirSync(dir)).toEqual(listing);
    if (status !== 1) {
      const report = JSON.parse(r.stdout); expect(report.input).toEqual({ sha256: createHash('sha256').update(before).digest('hex'), byteCount: before.length });
      expect(report.fullReconciliation).toBe(false); expect(r.stdout).not.toContain(file); expect(r.stderr).toBe('');
    } else expect(r.stderr).toBe('AUDIT_JSON_ERROR\n');
  });
  it('rejects missing files, directories and final-component symlinks', () => {
    const dir = mkdtempSync(join(tmpdir(), 'finance-audit-')); dirs.push(dir);
    const target = join(dir, 'target'); writeFileSync(target, JSON.stringify(minimal)); symlinkSync(target, join(dir, 'link'));
    const before = readdirSync(dir);
    for (const file of [join(dir, 'missing'), dir, join(dir, 'link')]) { const r = run('--input', file); expect(r.status).toBe(1); expect(r.stderr).toBe('AUDIT_READ_ERROR\n'); expect(r.stdout).toBe(''); }
    expect(readdirSync(dir)).toEqual(before);
  });
});
