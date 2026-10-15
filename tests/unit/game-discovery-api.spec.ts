import { afterEach, expect, it, vi } from 'vitest';
import { businessApi } from '../../client/services/businessApi';

afterEach(() => vi.unstubAllGlobals());
it('serializes the public game query and pagination without account credentials', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{}', { headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetcher);
  expect(typeof businessApi.getGameCompanions).toBe('function');
  await businessApi.getGameCompanions('game / id', { status: 'ONLINE', gender: 'F', minPrice: 5.25, maxPrice: 160, sort: 'ORDERS' }, 2, 20);
  const [url, options] = fetcher.mock.calls[0];
  expect(url.split('?')[0]).toBe('/api/games/game%20%2F%20id/companions');
  expect(Object.fromEntries(new URLSearchParams(url.split('?')[1]))).toEqual({ status: 'ONLINE', gender: 'F', minPrice: '5.25', maxPrice: '160', sort: 'ORDERS', page: '2', limit: '20' });
  expect(options).toEqual({ method: 'GET', headers: { 'Content-Type': 'application/json' } });
});
it('uses explicit defaults for page size and propagates a real API failure', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'GAME_NOT_FOUND', message: 'Unknown game' } }), { status: 404, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetcher);
  expect(typeof businessApi.getGameCompanions).toBe('function');
  await expect(businessApi.getGameCompanions('missing', { status: 'ALL', gender: 'ALL', minPrice: 0, maxPrice: 10000, sort: 'DEFAULT' })).rejects.toThrow();
  const query = new URLSearchParams(fetcher.mock.calls[0][0].split('?')[1]);
  expect(query.get('maxPrice')).toBe('10000'); expect(query.get('page')).toBe('1'); expect(query.get('limit')).toBe('20');
});
