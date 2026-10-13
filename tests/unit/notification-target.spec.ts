import { afterEach, expect, it, vi } from 'vitest';
import type { AppNotification } from '../../shared/notifications';
import { businessApi } from '../../client/services/businessApi';
import { resolveNotificationTarget } from '../../client/components/notifications/target';

afterEach(() => vi.restoreAllMocks());
const notice: AppNotification = { id: 'n', userId: 'A', kind: 'ORDER_CREATED', target: { type: 'ORDER', id: 'real-order' }, createdAt: 10 };
const order: any = { id: 'real-order', userId: 'A', companionId: 'cp', role: 'BUYER', workflowVersion: 2, status: 'COMPLETED', serviceName: 'Real service', quantity: 1, totalPrice: 8 };

it('opens the latest authoritative order rather than notification-time status', async () => {
  vi.spyOn(businessApi, 'listOrders').mockResolvedValue([order]);
  expect(await resolveNotificationTarget('token', notice, 'A')).toEqual({ type: 'ORDER', order });
});
it('does not open a missing, foreign-buyer or legacy order', async () => {
  const get = vi.spyOn(businessApi, 'listOrders');
  for (const items of [[], [{ ...order, userId: 'B' }], [{ ...order, workflowVersion: undefined }]]) {
    get.mockResolvedValue(items);
    await expect(resolveNotificationTarget('token', notice, 'A')).rejects.toThrow('NOTIFICATION_TARGET_UNAVAILABLE');
  }
});
it('accepts the provider role from the authenticated participant-only order API', async () => {
  const providerOrder = { ...order, userId: 'buyer', role: 'COMPANION' };
  vi.spyOn(businessApi, 'listOrders').mockResolvedValue([providerOrder]);
  expect(await resolveNotificationTarget('token', notice, 'A')).toEqual({ type: 'ORDER', order: providerOrder });
});
it('opens only the current owner application with its matching companion ID', async () => {
  const review: AppNotification = { ...notice, kind: 'COMPANION_REJECTED', target: { type: 'APPLICATION', id: 'cp' } };
  const application: any = { id: 'cp', userId: 'A', status: 'APPROVED' };
  const get = vi.spyOn(businessApi, 'getCompanionApplication').mockResolvedValue({ application });
  expect(await resolveNotificationTarget('token', review, 'A')).toEqual({ type: 'APPLICATION', application });
  for (const value of [null, { ...application, userId: 'B' }, { ...application, id: 'other' }]) {
    get.mockResolvedValue({ application: value });
    await expect(resolveNotificationTarget('token', review, 'A')).rejects.toThrow('NOTIFICATION_TARGET_UNAVAILABLE');
  }
});
it('rejects a foreign notification or incompatible target before requesting any private data', async () => {
  const get = vi.spyOn(businessApi, 'listOrders');
  await expect(resolveNotificationTarget('token', { ...notice, userId: 'B' }, 'A')).rejects.toThrow('NOTIFICATION_TARGET_UNAVAILABLE');
  await expect(resolveNotificationTarget('token', { ...notice, target: { type: 'APPLICATION', id: 'cp' } }, 'A')).rejects.toThrow('NOTIFICATION_TARGET_UNAVAILABLE');
  expect(get).not.toHaveBeenCalled();
});
