import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('creates only fresh isolated discovery data while preserving the original business fixtures', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url)), file = path.join(root, 'scripts/game-discovery-preview.ts');
  expect(fs.existsSync(file)).toBe(true);
  const output = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { pathToFileURL } from 'node:url';
    const root = ${JSON.stringify(root)};
    let source = fs.readFileSync(path.join(root, 'scripts/game-discovery-preview.ts'), 'utf8');
    const launch = "await import('../backend/server.js');";
    if (!source.trimEnd().endsWith(launch)) throw Error('Unexpected fixture launch');
    source = source.slice(0, source.lastIndexOf(launch));
    for (const relative of ['../backend/state/jsonState.js', '../backend/domain/types.js']) source = source.replace("'" + relative + "'", JSON.stringify(pathToFileURL(path.resolve(root, 'scripts', relative).replace(/\\.js$/, '.ts')).href));
    try {
      await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
      const dir = process.env.LOCAL_DATA_DIR;
      if (path.dirname(dir) !== os.tmpdir() || !path.basename(dir).startsWith('le3eb-game-discovery-')) throw Error('Unsafe fixture path');
      const state = JSON.parse(fs.readFileSync(path.join(dir, 'storage.json'), 'utf8'));
      console.log('DISCOVERY_FIXTURE=' + JSON.stringify({state, env: {host: process.env.LOCAL_BIND_HOST, payment: process.env.PAYMENT_PROVIDER, storage: process.env.STORAGE_BACKEND, cron: process.env.SETTLEMENT_CRON_DISABLED, database: process.env.DATABASE_URL, redis: process.env.REDIS_URL, mail: process.env.AUTH_MAIL_API_KEY}}));
    } finally {
      const dir = process.env.LOCAL_DATA_DIR;
      if (dir && path.dirname(dir) === os.tmpdir() && path.basename(dir).startsWith('le3eb-game-discovery-')) fs.rmSync(dir, {recursive:true, force:true});
    }
  `], { cwd: root, encoding: 'utf8', timeout: 30000, env: { ...process.env, NODE_ENV: 'development', PORT: '3020', DATABASE_URL: 'must-be-cleared', REDIS_URL: 'must-be-cleared', AUTH_MAIL_API_KEY: 'must-be-cleared' } });
  const { state, env } = JSON.parse(output.split('\n').find(line => line.startsWith('DISCOVERY_FIXTURE='))!.slice('DISCOVERY_FIXTURE='.length));
  expect(env).toEqual({ host: '127.0.0.1', payment: 'sandbox', storage: 'json', cron: 'true' });
  expect(state.orders).toHaveLength(39); expect(state.reviews).toHaveLength(39); expect(state.walletTransactions).toHaveLength(39);
  expect(state.wallets['preview-new-00'].balance).toBe(500); expect(state.diamondWallets['preview-player'].balance).toBe(1900);
  expect(state.companions.filter((p: any) => p.id.startsWith('discovery-val-'))).toHaveLength(24);
  expect(state.companions.some((p: any) => p.gameName === 'PUBG Mobile')).toBe(true);
  expect(state.companions.some((p: any) => p.hourlyRate > 100)).toBe(true);
  expect(state.companions.some((p: any) => p.status === 'PENDING')).toBe(true);
  expect(state.users.some((u: any) => u.accountStatus === 'FROZEN')).toBe(true);
});
