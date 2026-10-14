import { afterEach, expect, it, vi } from 'vitest';
import { businessApi } from '../../client/services/businessApi';

afterEach(() => vi.unstubAllGlobals());
it('reads and patches only the authenticated account profile with the exact contract', async () => {
  const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ user: { id: 'owner' }, bio: '', revision: 'a'.repeat(64) }), { headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetcher);
  expect(typeof businessApi.getAccountProfile).toBe('function');
  expect(typeof businessApi.updateAccountProfile).toBe('function');
  await businessApi.getAccountProfile('access');
  const input = { username: 'Real name', bio: 'Patient teammate', revision: 'a'.repeat(64), avatar: { type: 'system' as const, value: 'sage' } };
  await businessApi.updateAccountProfile('access', input);
  expect(fetcher.mock.calls[0]).toEqual(['/api/account/profile', { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer access' } }]);
  expect(fetcher.mock.calls[1]).toEqual(['/api/account/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer access' }, body: JSON.stringify(input) }]);
});
it('loads current peer identity from the authenticated social endpoint with an encoded ID', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ userId: 'peer' }), { headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetcher); expect(typeof businessApi.getSocialPeer).toBe('function');
  await businessApi.getSocialPeer('access', 'peer / id');
  expect(fetcher).toHaveBeenCalledWith('/api/social/peer/peer%20%2F%20id', { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer access' } });
});
