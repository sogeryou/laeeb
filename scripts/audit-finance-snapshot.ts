import { constants, openSync, fstatSync, readFileSync, closeSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { analyzeFinanceSnapshot } from '../backend/finance/reconciliation.js';

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--input' || !isAbsolute(args[1])) {
    process.stderr.write('AUDIT_USAGE_ERROR\n'); process.exitCode = 1; return;
  }
  let fd: number | undefined;
  let bytes: Buffer;
  try {
    // NONBLOCK prevents a FIFO from hanging before the regular-file check.
    fd = openSync(args[1], constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    if (!fstatSync(fd).isFile()) throw new Error();
    bytes = readFileSync(fd);
  } catch {
    process.stderr.write('AUDIT_READ_ERROR\n'); process.exitCode = 1; return;
  } finally { if (fd !== undefined) closeSync(fd); }
  let input: unknown;
  try { input = JSON.parse(bytes.toString('utf8')); }
  catch { process.stderr.write('AUDIT_JSON_ERROR\n'); process.exitCode = 1; return; }
  const report = analyzeFinanceSnapshot(input);
  process.stdout.write(JSON.stringify({ ...report, input: { sha256: createHash('sha256').update(bytes).digest('hex'), byteCount: bytes.length } }) + '\n');
  process.exitCode = report.findings.some(f => f.severity === 'ERROR') ? 2 : 0;
}
main();
