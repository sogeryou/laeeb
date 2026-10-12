import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { businessApi } from '../../client/services/businessApi';

let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetcher = vi.fn(async () => new Response('{}', { headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => vi.unstubAllGlobals());
it('sends authoritative service/coupon selection and the stable request ID without losing fields', async () => {
  const selection = { companionId: 'cp', serviceId: 'ranked', quantity: 3, couponGrantId: 'grant' };
  await businessApi.quoteOrder('access', selection);
  await businessApi.createOrder('access', { ...selection, expectedTotal: 42.5, requestId: 'retry-key' });
  expect(fetcher.mock.calls[0][0]).toBe('/api/orders/quote');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(selection);
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ ...selection, expectedTotal: 42.5, requestId: 'retry-key' });
  expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer access');
});
it('retains completion/dispute evidence and encodes order IDs', async () => {
  await businessApi.updateOrder('access', 'order/one', 'complete', { evidence: ['Match replay', 'https://example.test/proof'] });
  await businessApi.updateOrder('access', 'order/one', 'dispute', { reason: 'Incomplete session', evidence: ['proof'] });
  expect(fetcher.mock.calls[0][0]).toBe('/api/orders/order%2Fone/complete');
  expect(JSON.parse(fetcher.mock.calls[0][1].body).evidence).toEqual(['Match replay', 'https://example.test/proof']);
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ reason: 'Incomplete session', evidence: ['proof'] });
});
it('forwards full review feedback and tags and requests only the current account coupons', async () => {
  await businessApi.createReview('access', 'order', 4, 'Detailed feedback', ['Friendly']);
  await businessApi.listCoupons('access');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ orderId: 'order', rating: 4, content: 'Detailed feedback', tags: ['Friendly'] });
  expect(fetcher.mock.calls[1][0]).toBe('/api/coupons/me');
  expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer access');
});
it('does not convert an insufficient-balance API response into success', async () => {
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'WALLET_INSUFFICIENT_BALANCE' } }), { status: 409, headers: { 'content-type': 'application/json' } }));
  await expect(businessApi.createOrder('access', { companionId: 'cp', quantity: 1, requestId: 'new' })).rejects.toThrow('WALLET_INSUFFICIENT_BALANCE');
});
