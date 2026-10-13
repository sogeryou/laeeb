import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { useOrders } from '../../client/hooks/useOrders';
import { businessApi } from '../../client/services/businessApi';

let root: ReactTestRenderer;
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('reconciles the current-owner notification order before detail selection and rejects obsolete scopes', async () => {
  const browser = new EventTarget() as any; browser.setInterval = setInterval; browser.clearInterval = clearInterval;
  vi.stubGlobal('window', browser); vi.stubGlobal('document', { visibilityState: 'visible' }); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const get = vi.spyOn(businessApi, 'listOrders').mockResolvedValue([]); vi.spyOn(businessApi, 'listCoupons').mockResolvedValue([]);
  let hook!: ReturnType<typeof useOrders>;
  const Host = ({ owner = 'A' }: { owner?: string }) => { hook = useOrders(owner, owner, false, async () => {}); return null; };
  await act(async () => { root = create(React.createElement(Host)); });
  const saved: any = { id: 'real-order', userId: 'A', role: 'BUYER', status: 'COMPLETED', workflowVersion: 2, createdAt: 10, totalPrice: 8 };
  expect(hook.reconcileFetchedOrder).toBeTypeOf('function');
  await act(async () => { expect(hook.reconcileFetchedOrder(saved, 'A', 'A', () => true)).toBe(true); });
  expect(hook.items.find(row => row.id === saved.id)?.status).toBe('COMPLETED');
  expect(hook.reconcileFetchedOrder(saved, 'A', 'A', () => false)).toBe(false);
  get.mockResolvedValue([]); await act(async () => root.update(React.createElement(Host, { owner: 'B' })));
  expect(hook.reconcileFetchedOrder(saved, 'A', 'A', () => true)).toBe(false); expect(hook.items).toEqual([]);
});
