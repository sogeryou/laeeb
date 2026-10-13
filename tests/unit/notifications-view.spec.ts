import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NotificationsView } from '../../client/views/NotificationsView';

let app: any;
let root: ReactTestRenderer;
vi.mock('../../client/app/AppContext', () => ({ useApp: () => app }));
vi.mock('motion/react', () => ({ motion: { div: ({ children, ...props }: any) => React.createElement('div', props, children) }, AnimatePresence: ({ children }: any) => children }));
const button = (name: string) => root.root.findAllByType('button').find(node => node.props['aria-label'] === name || node.children.includes(name))!;
const render = async () => { await act(async () => { root = create(React.createElement(NotificationsView)); }); };
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  app = { locale: 'en', handleBack: vi.fn(), notificationOpeningId: null, openNotification: vi.fn(async () => {}), notifications: {
    items: [], unreadCount: 0, loading: false, loadingMore: false, pendingId: null, error: '', nextCursor: null,
    refresh: vi.fn(async () => {}), markRead: vi.fn(async () => {}), markAllRead: vi.fn(async () => {}), loadMore: vi.fn(async () => {}),
  } };
});
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.unstubAllGlobals(); });

it('renders the true empty state and no fabricated recharge/chat/system examples', async () => {
  await render();
  const json = JSON.stringify(root.toJSON());
  expect(json).toContain('No notifications yet');
  for (const example of ['Player123', 'Player456', 'Recharge Successful', 'System Update', '2 mins ago']) expect(json).not.toContain(example);
  expect(button('Mark all as read').props.disabled).toBe(true);
});
it('shows the actual service and forwards read/open/read-all commands without simulating a result', async () => {
  const item = { id: 'n', userId: 'A', kind: 'ORDER_ACCEPTED', target: { type: 'ORDER', id: 'o' }, serviceName: 'Actual ranked service', createdAt: 100 };
  app.notifications.items = [item]; app.notifications.unreadCount = 1;
  await render(); expect(JSON.stringify(root.toJSON())).toContain('Actual ranked service');
  await act(async () => { await button('Mark as read').props.onClick(); });
  expect(app.notifications.markRead).toHaveBeenCalledWith('n');
  await act(async () => { await button('Open notification: Order accepted').props.onClick(); });
  expect(app.openNotification).toHaveBeenCalledWith(item);
  await act(async () => { await button('Mark all as read').props.onClick(); });
  expect(app.notifications.markAllRead).toHaveBeenCalledOnce();
  expect(item).not.toHaveProperty('readAt');
});
it('retains the list on errors, exposes refresh, and supports a stable load-more command', async () => {
  app.notifications.items = [{ id: 'n', userId: 'A', kind: 'COMPANION_APPROVED', target: { type: 'APPLICATION', id: 'cp' }, createdAt: 100, readAt: 120 }];
  app.notifications.error = 'NOTIFICATION_SAVE_FAILED'; app.notifications.nextCursor = 'n';
  await render(); expect(root.root.findAll(node => node.props.role === 'alert')).toHaveLength(1);
  expect(JSON.stringify(root.toJSON())).toContain('Application approved');
  await act(async () => { await button('Refresh notifications').props.onClick(); }); expect(app.notifications.refresh).toHaveBeenCalled();
  await act(async () => { await button('Load more').props.onClick(); }); expect(app.notifications.loadMore).toHaveBeenCalledOnce();
});
it('uses Arabic copy and right-to-left layout and disables commands while saving', async () => {
  app.locale = 'ar'; app.notifications.unreadCount = 2; app.notifications.pendingId = 'all';
  await render(); expect(JSON.stringify(root.toJSON())).toContain('الإشعارات');
  expect(root.root.findAll(node => node.props.dir === 'rtl').length).toBeGreaterThan(0);
  expect(button('تحديد الكل كمقروء').props.disabled).toBe(true);
});
