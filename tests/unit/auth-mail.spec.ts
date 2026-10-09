import { createServer, type Server } from 'node:http';
import { afterEach, expect, it, vi } from 'vitest';
let server: Server | undefined;
afterEach(async () => { if (server) await new Promise<void>(resolve => server!.close(() => resolve())); server = undefined; vi.unstubAllEnvs(); vi.resetModules(); });
async function mailer(mode: 'development' | 'provider' | 'unavailable', nodeEnv = 'test') {
  vi.resetModules(); vi.stubEnv('NODE_ENV', nodeEnv); vi.stubEnv('AUTH_EMAIL_DELIVERY', mode);
  vi.stubEnv('JWT_SECRET', 'x'.repeat(64)); vi.stubEnv('ADMIN_EMAIL', 'admin@example.test'); vi.stubEnv('ADMIN_PASSWORD', 'not-a-live-password');
  return import('../../backend/auth/mail');
}
it('requires explicit development mode and never exposes development codes in production', async () => {
  const input = { email: 'a@example.test', code: '123456', purpose: 'login' as const };
  expect(await (await mailer('development')).deliverAuthCode(input)).toEqual({ developmentCode: '123456' });
  await expect((await mailer('unavailable')).deliverAuthCode(input)).rejects.toThrow('AUTH_MAIL_UNAVAILABLE');
  await expect((await mailer('development', 'production')).deliverAuthCode(input)).rejects.toThrow('AUTH_MAIL_UNAVAILABLE');
});
it('delivers real HTTP requests to the configured provider and reports delivery rejection honestly', async () => {
  let status = 200; const received: any[] = [];
  server = createServer(async (req, res) => { let body = ''; for await (const chunk of req) body += chunk; received.push({ auth: req.headers.authorization, body: JSON.parse(body) }); res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: 'provider-id' })); });
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number };
  vi.stubEnv('AUTH_MAIL_ENDPOINT', `http://127.0.0.1:${address.port}/emails`); vi.stubEnv('AUTH_MAIL_API_KEY', 'test-only-key'); vi.stubEnv('AUTH_MAIL_FROM', 'auth@example.test');
  const { deliverAuthCode } = await mailer('provider');
  const result = await deliverAuthCode({ email: 'a@example.test', code: '654321', purpose: 'register', locale: 'ar' });
  expect(result).toEqual({}); expect(received[0].auth).toBe('Bearer test-only-key'); expect(received[0].body.to).toEqual(['a@example.test']); expect(received[0].body.text).toContain('654321');
  status = 503; await expect(deliverAuthCode({ email: 'a@example.test', code: '654321', purpose: 'reset' })).rejects.toThrow('AUTH_MAIL_DELIVERY_FAILED');
});
