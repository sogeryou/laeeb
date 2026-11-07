import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('creates only fresh isolated auth/composer data while preserving the original business fixtures', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url)), file = path.join(root, 'scripts/auth-composer-preview.ts');
  expect(fs.existsSync(file)).toBe(true);
  const output = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { pathToFileURL } from 'node:url';
    const root = ${JSON.stringify(root)};
    let source = fs.readFileSync(path.join(root, 'scripts/auth-composer-preview.ts'), 'utf8');
    const launch = "await import('../backend/server.js');";
    if (!source.trimEnd().endsWith(launch)) throw Error('Unexpected fixture launch');
    source = source.slice(0, source.lastIndexOf(launch));
    for (const relative of ['../backend/state/jsonState.js', '../backend/domain/types.js']) source = source.replace("'" + relative + "'", JSON.stringify(pathToFileURL(path.resolve(root, 'scripts', relative).replace(/\\.js$/, '.ts')).href));
    try {
      await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
      const dir = process.env.LOCAL_DATA_DIR;
      if (path.dirname(dir) !== os.tmpdir() || !path.basename(dir).startsWith('le3eb-auth-composer-')) throw Error('Unsafe fixture path');
      const state = JSON.parse(fs.readFileSync(path.join(dir, 'storage.json'), 'utf8'));
      console.log('AUTH_COMPOSER_FIXTURE=' + JSON.stringify({state, env: {host: process.env.LOCAL_BIND_HOST, payment: process.env.PAYMENT_PROVIDER, storage: process.env.STORAGE_BACKEND, cron: process.env.SETTLEMENT_CRON_DISABLED, database: process.env.DATABASE_URL, redis: process.env.REDIS_URL, mail: process.env.AUTH_MAIL_API_KEY}}));
    } finally {
      const dir = process.env.LOCAL_DATA_DIR;
      if (dir && path.dirname(dir) === os.tmpdir() && path.basename(dir).startsWith('le3eb-auth-composer-')) fs.rmSync(dir, {recursive:true, force:true});
    }
  `], { cwd: root, encoding: 'utf8', timeout: 30000, env: { ...process.env, NODE_ENV: 'development', PORT: '3021', DATABASE_URL: 'must-be-cleared', REDIS_URL: 'must-be-cleared', AUTH_MAIL_API_KEY: 'must-be-cleared' } });
  const { state, env } = JSON.parse(output.split('\n').find(line => line.startsWith('AUTH_COMPOSER_FIXTURE='))!.slice('AUTH_COMPOSER_FIXTURE='.length));
  expect(env).toEqual({ host: '127.0.0.1', payment: 'sandbox', storage: 'json', cron: 'true' });
  expect(state.orders).toHaveLength(39); expect(state.reviews).toHaveLength(39); expect(state.walletTransactions).toHaveLength(39);
  expect(state.wallets['preview-new-00'].balance).toBe(500); expect(state.diamondWallets['preview-player'].balance).toBe(1900);
  expect(state.users.find((u: any) => u.id === 'auth-composer-member')).toMatchObject({ tags: ['valorant', 'ranked'], role: 'USER' });
});

it.each([{ NODE_ENV: 'production', PORT: '3021' }, { NODE_ENV: 'development', PORT: '3020' }])('refuses unsafe fixture environment %j', environment => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  expect(fs.existsSync(path.join(root, 'scripts/auth-composer-preview.ts'))).toBe(true);
  let error: any;
  try { execFileSync(process.execPath, ['--import', 'tsx', 'scripts/auth-composer-preview.ts'], { cwd: root, timeout: 10000, stdio: 'pipe', env: { ...process.env, ...environment } }); }
  catch (caught) { error = caught; }
  expect(error?.stderr?.toString()).toContain(environment.NODE_ENV === 'production' ? 'Preview is local development only' : 'Auth/composer preview requires port 3021');
});
