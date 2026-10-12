import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { businessApi } from '../../client/services/businessApi';

let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetcher = vi.fn(async () => new Response('{}', { headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => vi.unstubAllGlobals());

it('loads and saves the authenticated owner draft without sending ownership fields', async () => {
  const draft = { gameName: 'PUBG Mobile', intro: 'Duo', hourlyRate: 9, updatedAt: 1, services: [{ id: 'ranked', name: 'Ranked match', unitPrice: 7.5, unit: 'match' as const }] };
  await businessApi.getManagedCompanionProfile('access');
  await businessApi.updateManagedCompanionProfile('access', draft);
  expect(fetcher.mock.calls[0][0]).toBe('/api/companions/me/profile');
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer access');
  expect(fetcher.mock.calls[1][1].method).toBe('PATCH');
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual(draft);
});

it('encodes public profile IDs and does not require a private session', async () => {
  await businessApi.getPublicCompanionProfile('cp/one');
  expect(fetcher.mock.calls[0][0]).toBe('/api/companions/cp%2Fone/profile');
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined();
});

it('does not report a stale profile save as success', async () => {
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'COMPANION_PROFILE_STALE' } }), { status: 409, headers: { 'content-type': 'application/json' } }));
  await expect(businessApi.updateManagedCompanionProfile('access', { gameName: 'Game', intro: 'Duo', hourlyRate: 9, updatedAt: 1, services: [] })).rejects.toThrow('COMPANION_PROFILE_STALE');
});
