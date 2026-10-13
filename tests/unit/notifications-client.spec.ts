import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AppNotification, NotificationsPage } from '../../shared/notifications';
import { businessApi } from '../../client/services/businessApi';
import { useNotifications } from '../../client/hooks/useNotifications';

const browser = new EventTarget() as EventTarget & { setInterval: typeof setInterval; clearInterval: typeof clearInterval };
browser.setInterval = setInterval; browser.clearInterval = clearInterval;
const notification = (owner = 'A', id = 'n', createdAt = 100): AppNotification => ({ id, userId: owner, kind: 'ORDER_CREATED', target: { type: 'ORDER', id: 'order' }, serviceName: 'Ranked duo', createdAt });
const page = (owner = 'A', items = [notification(owner)], unreadCount = items.filter(item => item.readAt === undefined).length, nextCursor: string | null = null): NotificationsPage => ({ ownerId: owner, items, unreadCount, nextCursor });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
let renderers: ReactTestRenderer[];
let hook: ReturnType<typeof useNotifications>;
const Host = ({ owner = 'A', token = 'A', enabled = true }: { owner?: string; token?: string | null; enabled?: boolean }) => { hook = useNotifications(token, owner, enabled); return null; };
async function render(props: React.ComponentProps<typeof Host> = {}) {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(React.createElement(Host, props)); }); renderers.push(root); return root;
}
const session = (id: string | null, token: string | null) => browser.dispatchEvent(new CustomEvent('le3eb:session', { detail: { token, user: id ? { id, profileComplete: true, role: 'USER' } : null } }));
beforeEach(() => { renderers = []; vi.stubGlobal('window', browser); vi.stubGlobal('document', { visibilityState: 'visible' }); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(async () => { await act(async () => { renderers.forEach(root => root.unmount()); }); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('loads only for an eligible authenticated profile and returns real unread count', async () => {
  const get = vi.spyOn(businessApi, 'listNotifications').mockResolvedValue(page());
  const root = await render({ enabled: false });
  expect(get).not.toHaveBeenCalled(); expect(hook.items).toEqual([]);
  await act(async () => root.update(React.createElement(Host, { enabled: true })));
  expect(hook.items).toEqual([notification()]); expect(hook.unreadCount).toBe(1);
});

it('preserves the confirmed list and count on a transient refresh failure', async () => {
  const get = vi.spyOn(businessApi, 'listNotifications').mockResolvedValueOnce(page()).mockRejectedValueOnce(Error('READ_FAILED'));
  await render(); await act(async () => { await hook.refresh(); });
  expect(hook.items).toEqual([notification()]); expect(hook.unreadCount).toBe(1); expect(hook.error).toBe('READ_FAILED'); expect(hook.loading).toBe(false);
  get.mockResolvedValue(page()); await act(async () => { await hook.refresh(); }); expect(hook.error).toBe('');
});

it('does not optimistically mark read and locks duplicate clicks before render', async () => {
  vi.spyOn(businessApi, 'listNotifications').mockResolvedValue(page());
  const pending = deferred<any>(); const read = vi.spyOn(businessApi, 'readNotification').mockReturnValue(pending.promise);
  await render(); let operation!: Promise<AppNotification | null>;
  await act(async () => { operation = hook.markRead('n'); void hook.markRead('n'); });
  expect(read).toHaveBeenCalledTimes(1); expect(hook.items[0].readAt).toBeUndefined(); expect(hook.pendingId).toBe('n');
  await act(async () => { pending.resolve({ ownerId: 'A', notification: { ...notification(), readAt: 120 }, unreadCount: 0 }); await operation; });
  expect(hook.items[0].readAt).toBe(120); expect(hook.unreadCount).toBe(0); expect(hook.pendingId).toBeNull();
});

it('ignores a list started before a persisted read acknowledgement', async () => {
  const get = vi.spyOn(businessApi, 'listNotifications').mockResolvedValue(page());
  vi.spyOn(businessApi, 'readNotification').mockResolvedValue({ ownerId: 'A', notification: { ...notification(), readAt: 120 }, unreadCount: 0 });
  await render(); const old = deferred<NotificationsPage>(); get.mockReturnValueOnce(old.promise);
  let refresh!: Promise<void>; await act(async () => { refresh = hook.refresh(); });
  await act(async () => { await hook.markRead('n'); });
  await act(async () => { old.resolve(page()); await refresh; });
  expect(hook.items[0].readAt).toBe(120); expect(hook.unreadCount).toBe(0);
});

it('retains unread state on failed save and retries the same ID without fabricated success', async () => {
  vi.spyOn(businessApi, 'listNotifications').mockResolvedValue(page());
  const read = vi.spyOn(businessApi, 'readNotification').mockRejectedValueOnce(Error('NOTIFICATION_SAVE_FAILED')).mockResolvedValueOnce({ ownerId: 'A', notification: { ...notification(), readAt: 130 }, unreadCount: 0 });
  await render(); await act(async () => { expect(await hook.markRead('n')).toBeNull(); });
  expect(hook.items[0].readAt).toBeUndefined(); expect(hook.error).toBe('NOTIFICATION_SAVE_FAILED');
  await act(async () => { await hook.markRead('n'); });
  expect(read.mock.calls.map(call => call[1])).toEqual(['n', 'n']); expect(hook.items[0].readAt).toBe(130);
  await act(async () => { await hook.markRead('n'); }); expect(read).toHaveBeenCalledTimes(2);
});

it('applies read-all only after a valid server result and invalidates a pending list', async () => {
  const get = vi.spyOn(businessApi, 'listNotifications').mockResolvedValue(page('A', [notification('A', 'n1'), notification('A', 'n2')]));
  const readAll = vi.spyOn(businessApi, 'readAllNotifications').mockResolvedValue({ ownerId: 'A', updatedIds: ['n1', 'n2'], readAt: 140, unreadCount: 0 });
  await render(); const old = deferred<NotificationsPage>(); get.mockReturnValueOnce(old.promise);
  let refresh!: Promise<void>; await act(async () => { refresh = hook.refresh(); });
  await act(async () => { await hook.markAllRead(); });
  await act(async () => { old.resolve(page('A', [notification('A', 'n1'), notification('A', 'n2')])); await refresh; });
  expect(hook.items.every(item => item.readAt === 140)).toBe(true); expect(hook.unreadCount).toBe(0);
  await act(async () => { await hook.markAllRead(); }); expect(readAll).toHaveBeenCalledOnce();
});

it('rejects foreign-owner pages and wrong-ID read acknowledgements without replacing confirmed data', async () => {
  const get = vi.spyOn(businessApi, 'listNotifications').mockResolvedValue(page()); await render();
  get.mockResolvedValue(page('B')); await act(async () => { await hook.refresh(); });
  expect(hook.items).toEqual([notification()]); expect(hook.error).toBe('NOTIFICATION_RESPONSE_INVALID');
  vi.spyOn(businessApi, 'readNotification').mockResolvedValue({ ownerId: 'A', notification: { ...notification('A', 'wrong'), readAt: 120 }, unreadCount: 0 });
  await act(async () => { expect(await hook.markRead('n')).toBeNull(); }); expect(hook.items[0].readAt).toBeUndefined();
});

it('does not revive an old A list after a rendered A-B-A account switch', async () => {
  const old = deferred<NotificationsPage>();
  vi.spyOn(businessApi, 'listNotifications').mockReturnValueOnce(old.promise).mockImplementation(token => Promise.resolve(page(token, [])));
  const root = await render();
  await act(async () => root.update(React.createElement(Host, { owner: 'B', token: 'B' })));
  await act(async () => root.update(React.createElement(Host, { owner: 'A', token: 'A' })));
  await act(async () => old.resolve(page())); expect(hook.items).toEqual([]); expect(hook.unreadCount).toBe(0);
});

it('invalidates token-only logout and rapid A-B-A session events before props update', async () => {
  const get = vi.spyOn(businessApi, 'listNotifications').mockResolvedValue(page());
  const root = await render(); const guard = hook.sessionGuard('A', 'A');
  await act(async () => { session('A', null); }); expect(hook.items).toEqual([]); expect(guard()).toBe(false);
  get.mockImplementation(token => Promise.resolve(page(token === 'new-A' ? 'A' : token, [])));
  await act(async () => { session('B', 'B'); session('A', 'new-A'); root.update(React.createElement(Host, { token: 'new-A' })); });
  expect(hook.items).toEqual([]); expect(guard()).toBe(false);
});

it('preserves a read mutation across same-owner token rotation but hides it after logout', async () => {
  vi.spyOn(businessApi, 'listNotifications').mockResolvedValue(page());
  const pending = deferred<any>(); vi.spyOn(businessApi, 'readNotification').mockReturnValue(pending.promise);
  const root = await render(); let operation!: Promise<AppNotification | null>;
  await act(async () => { operation = hook.markRead('n'); });
  await act(async () => { session('A', 'new'); root.update(React.createElement(Host, { token: 'new' })); });
  expect(hook.items).toEqual([notification()]); expect(hook.pendingId).toBe('n');
  await act(async () => { pending.resolve({ ownerId: 'A', notification: { ...notification(), readAt: 160 }, unreadCount: 0 }); await operation; });
  expect(hook.items[0].readAt).toBe(160); expect(hook.pendingId).toBeNull();
  await act(async () => { session(null, null); }); expect(hook.items).toEqual([]);
});

it('merges and deduplicates pages without resetting an expanded background-refresh frontier', async () => {
  const get = vi.spyOn(businessApi, 'listNotifications').mockResolvedValueOnce(page('A', [notification('A', 'n2', 200), notification('A', 'n1')], 3, 'n1'))
    .mockResolvedValueOnce(page('A', [notification('A', 'n1'), notification('A', 'n0', 50)], 3));
  await render(); await act(async () => { await hook.loadMore(); }); expect(hook.items.map(item => item.id)).toEqual(['n2', 'n1', 'n0']);
  get.mockResolvedValueOnce(page('A', [notification('A', 'n3', 300), notification('A', 'n2', 200)], 4, 'n2'))
    .mockResolvedValueOnce(page('A', [notification('A', 'n1'), notification('A', 'n0', 50)], 4));
  await act(async () => { await hook.refresh(false); }); expect(hook.items.map(item => item.id)).toEqual(['n3', 'n2', 'n1', 'n0']); expect(hook.nextCursor).toBeNull();
  get.mockResolvedValue(page('A', [notification('A', 'n3', 300), notification('A', 'n2', 200)], 4, 'n2'));
  await act(async () => { await hook.refresh(); }); expect(hook.items.map(item => item.id)).toEqual(['n3', 'n2']); expect(hook.nextCursor).toBe('n2');
});

it('rejects late results and target guards after unmount', async () => {
  vi.spyOn(businessApi, 'listNotifications').mockResolvedValue(page());
  const pending = deferred<any>(); vi.spyOn(businessApi, 'readNotification').mockReturnValue(pending.promise);
  const root = await render(); const guard = hook.sessionGuard('A', 'A'); let operation!: Promise<AppNotification | null>;
  await act(async () => { operation = hook.markRead('n'); root.unmount(); }); renderers = [];
  pending.resolve({ ownerId: 'A', notification: { ...notification(), readAt: 160 }, unreadCount: 0 });
  expect(await operation).toBeNull(); expect(guard()).toBe(false);
});

it('fills an expanded-list gap when more than one page arrives between background polls', async () => {
  const old = Array.from({ length: 40 }, (_, index) => notification('A', `n${index + 1}`, index + 1)).reverse();
  const all = Array.from({ length: 65 }, (_, index) => notification('A', `n${index + 1}`, index + 1)).reverse();
  const get = vi.spyOn(businessApi, 'listNotifications').mockResolvedValueOnce(page('A', old.slice(0, 20), 40, 'n21'))
    .mockResolvedValueOnce(page('A', old.slice(20), 40));
  await render(); await act(async () => { await hook.loadMore(); }); expect(hook.items).toHaveLength(40);
  get.mockResolvedValueOnce(page('A', all.slice(0, 20), 65, 'n46')).mockResolvedValueOnce(page('A', all.slice(20, 40), 65, 'n26'))
    .mockResolvedValueOnce(page('A', all.slice(40, 60), 65, 'n6')).mockResolvedValueOnce(page('A', all.slice(60), 65));
  await act(async () => { await hook.refresh(false); });
  expect(hook.items.map(row => row.id)).toEqual(all.map(row => row.id)); expect(hook.nextCursor).toBeNull();
  expect(get.mock.calls.slice(-3).map(call => call[1]?.cursor)).toEqual(['n46', 'n26', 'n6']);
});

it('reconciles an already-read server row after an idempotent cross-session read-all acknowledgement', async () => {
  vi.spyOn(businessApi, 'listNotifications').mockResolvedValue(page());
  vi.spyOn(businessApi, 'readAllNotifications').mockResolvedValue({ ownerId: 'A', updatedIds: [], readAt: 200, unreadCount: 0 });
  await render(); expect(hook.items[0].readAt).toBeUndefined();
  await act(async () => { await hook.markAllRead(); });
  expect(hook.unreadCount).toBe(0); expect(hook.items[0].readAt).toBe(200);
});

it('refreshes read timestamps across the expanded frontier after another session reads everything', async () => {
  const rows = Array.from({ length: 40 }, (_, index) => notification('A', `n${index + 1}`, index + 1)).reverse();
  const get = vi.spyOn(businessApi, 'listNotifications').mockResolvedValueOnce(page('A', rows.slice(0, 20), 40, 'n21'))
    .mockResolvedValueOnce(page('A', rows.slice(20), 40));
  await render(); await act(async () => { await hook.loadMore(); });
  const saved = rows.map(row => ({ ...row, readAt: 200 }));
  get.mockResolvedValueOnce(page('A', saved.slice(0, 20), 0, 'n21')).mockResolvedValueOnce(page('A', saved.slice(20), 0));
  await act(async () => { await hook.refresh(false); });
  expect(hook.unreadCount).toBe(0); expect(hook.items).toEqual(saved); expect(hook.nextCursor).toBeNull();
});

it.each(['createdAt', 'readAt'] as const)('rejects an out-of-Date-range %s without replacing confirmed rows', async field => {
  const get = vi.spyOn(businessApi, 'listNotifications').mockResolvedValue(page());
  await render(); get.mockResolvedValue(page('A', [{ ...notification(), [field]: 9_000_000_000_000_000 }]));
  await act(async () => { await hook.refresh(); });
  expect(hook.items).toEqual([notification()]); expect(hook.error).toBe('NOTIFICATION_RESPONSE_INVALID');
});

it('keeps a valid continuation after refreshing a partially expanded frontier', async () => {
  const rows = Array.from({ length: 60 }, (_, index) => notification('A', `n${index + 1}`, index + 1)).reverse();
  const all = Array.from({ length: 65 }, (_, index) => notification('A', `n${index + 1}`, index + 1)).reverse();
  const get = vi.spyOn(businessApi, 'listNotifications').mockResolvedValueOnce(page('A', rows.slice(0, 20), 60, 'n41'))
    .mockResolvedValueOnce(page('A', rows.slice(20, 40), 60, 'n21'));
  await render(); await act(async () => { await hook.loadMore(); });
  get.mockResolvedValueOnce(page('A', all.slice(0, 20), 65, 'n46')).mockResolvedValueOnce(page('A', all.slice(20, 40), 65, 'n26'))
    .mockResolvedValueOnce(page('A', all.slice(40, 60), 65, 'n6'));
  await act(async () => { await hook.refresh(false); });
  expect(hook.items).toEqual(all.slice(0, 60)); expect(hook.nextCursor).toBe('n6');
  get.mockResolvedValueOnce(page('A', all.slice(60), 65));
  await act(async () => { await hook.loadMore(); });
  expect(get.mock.calls.at(-1)?.[1]?.cursor).toBe('n6'); expect(hook.items).toEqual(all); expect(hook.nextCursor).toBeNull();
});
