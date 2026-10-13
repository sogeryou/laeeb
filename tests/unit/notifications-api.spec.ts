import { afterEach, expect, it, vi } from 'vitest';
import { businessApi } from '../../client/services/businessApi';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

it('requests an authenticated notification page with an encoded cursor and bounded limit', async () => {
  const page = { ownerId: 'u', items: [], nextCursor: null, unreadCount: 0 };
  const fetcher = vi.fn().mockResolvedValue(response(page));
  vi.stubGlobal('fetch', fetcher);
  expect(businessApi.listNotifications).toBeTypeOf('function');
  expect(await businessApi.listNotifications('access', { cursor: 'notif/a?b', limit: 20 })).toEqual(page);
  const [url, options] = fetcher.mock.calls[0];
  expect(String(url)).toContain('/api/notifications?');
  const query = new URL(String(url), 'http://local.test').searchParams;
  expect(query.get('cursor')).toBe('notif/a?b');
  expect(query.get('limit')).toBe('20');
  expect(options.method).toBe('GET');
  expect(options.headers.Authorization).toBe('Bearer access');
  expect(options.body).toBeUndefined();
});

it('marks only the encoded notification ID read and sends no client-owned fields', async () => {
  const saved = { ownerId: 'u', notification: { id: 'n/a', userId: 'u', readAt: 100 }, unreadCount: 2 };
  const fetcher = vi.fn().mockResolvedValue(response(saved));
  vi.stubGlobal('fetch', fetcher);
  expect(businessApi.readNotification).toBeTypeOf('function');
  expect(await businessApi.readNotification('access', 'n/a')).toEqual(saved);
  expect(String(fetcher.mock.calls[0][0])).toContain('/api/notifications/n%2Fa/read');
  expect(fetcher.mock.calls[0][1].method).toBe('POST');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({});
});

it('marks all owned notifications read through the dedicated authenticated command', async () => {
  const saved = { ownerId: 'u', updatedIds: ['n'], readAt: 100, unreadCount: 0 };
  const fetcher = vi.fn().mockResolvedValue(response(saved));
  vi.stubGlobal('fetch', fetcher);
  expect(businessApi.readAllNotifications).toBeTypeOf('function');
  expect(await businessApi.readAllNotifications('access')).toEqual(saved);
  expect(String(fetcher.mock.calls[0][0])).toContain('/api/notifications/read-all');
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer access');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({});
});
