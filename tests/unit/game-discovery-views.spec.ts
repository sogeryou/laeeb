import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GameDetailView } from '../../client/views/GameDetailView';
import { EPalCard } from '../../client/components/cards/EPalCard';

let app: any, discovery: any, root: ReactTestRenderer;
vi.mock('../../client/app/AppContext', () => ({ useApp: () => app }));
vi.mock('../../client/hooks/useGameDiscovery', () => ({ useGameDiscovery: () => discovery }));
vi.mock('motion/react', () => ({ motion: { div: ({ children, ...props }: any) => React.createElement('div', props, children) }, AnimatePresence: ({ children }: any) => children }));
const person = { id: 'actual', userId: 'provider', name: 'Real Player', avatarUrl: '/actual.png', game: 'Valorant', price: 150, rating: 0, reviewCount: 0, completedOrders30d: 0, orderCount: '0', onlineStatus: 'Online', tags: [], bookable: true,
  services: [{ id: 'actual', name: 'Valorant', icon: '', posterUrl: '/actual.png', description: 'Actual service', rating: 0, orderCount: '0', screenshots: [], variants: [{ name: 'Valorant', price: 150, unit: 'hr' }] }] };
const render = async (element = React.createElement(GameDetailView)) => { await act(async () => { root = create(element); }); };
const button = (name: string) => root.root.findAllByType('button').find(node => node.props['aria-label'] === name || node.children.includes(name))!;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.stubGlobal('window', new EventTarget());
  app = { currentView: 'GAME_DETAIL', locale: 'en', selectedGame: { id: 'val', name: 'Tactical Duo', onlineCount: '850 Online', imageUrl: '/hero.png', category: 'GAMES' }, authToken: 'buyer-token', authUser: { id: 'buyer' },
    epalSortBy: 'DEFAULT', setEpalSortBy: vi.fn(), epalFilters: { status: 'ALL', gender: 'ALL', priceRange: [0, 10000], rank: 'ALL', platform: 'ALL', server: 'ALL' }, setEpalFilters: vi.fn(),
    showEpalFilterModal: false, setShowEpalFilterModal: vi.fn(), navigateTo: vi.fn(), handleBack: vi.fn(),
    EPALS: [{ ...person, name: 'Prototype Player', game: 'Tactical Duo' }], playingEPalId: null, handlePlayToggle: vi.fn(),
  };
  discovery = { items: [person], total: 1, onlineCount: 1, loading: false, loadingMore: false, error: '', hasMore: false, refresh: vi.fn(), retry: vi.fn(), loadMore: vi.fn(), canUse: vi.fn(() => true) };
});
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.unstubAllGlobals(); });
it('uses real people and online counts rather than prototype cards or static catalog numbers', async () => {
  await render(); const text = JSON.stringify(root.toJSON());
  expect(text).toContain('Real Player'); expect(text).not.toContain('Prototype Player'); expect(text).not.toContain('850 Online'); expect(text).toContain('1 online');
  expect(text).toContain('No reviews'); expect(root.root.findAllByType('audio')).toHaveLength(0); expect(button('Play voice')).toBeUndefined();
});
it('navigates using the actual primary service and rechecks the live request guard', async () => {
  await render(); await act(async () => button('Book Real Player').props.onClick());
  expect(app.navigateTo).toHaveBeenCalledWith('ORDER_CONFIRM', { epal: person, serviceId: 'actual' });
  app.navigateTo.mockClear(); discovery.canUse.mockReturnValue(false);
  await act(async () => button('Book Real Player').props.onClick()); expect(app.navigateTo).not.toHaveBeenCalled();
});
it('keeps cached results visible on a failed refresh but prevents stale and self bookings', async () => {
  discovery.error = 'NETWORK_ERROR'; await render(); expect(root.root.findAll(node => node.props.role === 'alert')).toHaveLength(1);
  expect(button('Book Real Player').props.disabled).toBe(true); await act(async () => button('Retry').props.onClick()); expect(discovery.retry).toHaveBeenCalled();
  discovery.error = ''; app.authUser.id = 'provider'; await act(async () => root.update(React.createElement(GameDetailView)));
  expect(button('Book Real Player').props.disabled).toBe(true);
  expect(button('Book Real Player').props.title).toBe('Your profile');
});
it('renders genuine empty/loading states and Arabic RTL controls', async () => {
  discovery.items = []; discovery.loading = true; discovery.total = null; discovery.onlineCount = null; await render();
  expect(root.root.findAll(node => node.props.role === 'status').length).toBeGreaterThan(0); expect(JSON.stringify(root.toJSON())).not.toContain('No companions');
  discovery.loading = false; discovery.total = 0; discovery.onlineCount = 0; app.locale = 'ar'; await act(async () => root.update(React.createElement(GameDetailView)));
  expect(root.root.findAll(node => node.props.dir === 'rtl').length).toBeGreaterThan(0); expect(JSON.stringify(root.toJSON())).toContain('تصفية');
});
it('shows real status and disables booking without simulated audio only for opted-in cards', async () => {
  await render(React.createElement(EPalCard, { epal: { ...person, onlineStatus: 'Busy' }, onProfileClick: vi.fn(), onOrderClick: vi.fn(), discovery: { locale: 'en', reviewCount: 0, canOrder: false } } as any));
  expect(button('Book Real Player').props.disabled).toBe(true); expect(JSON.stringify(root.toJSON())).toContain('Busy'); expect(root.root.findAllByType('button')).toHaveLength(1);
  await act(async () => root.update(React.createElement(EPalCard, { epal: person, onProfileClick: vi.fn(), onOrderClick: vi.fn(), onPlayToggle: vi.fn() })));
  expect(JSON.stringify(root.toJSON())).toContain('per hour'); expect(root.root.findAllByType('button')).toHaveLength(2);
});
it('keeps filter drafts local until valid Apply and supports full-bound reset', async () => {
  const path = '../../client/components/game-discovery/GameDiscoveryFilters'; const module = await import(path).catch(() => ({}));
  expect(typeof module.GameDiscoveryFilters).toBe('function'); const onApply = vi.fn(), onClose = vi.fn();
  const query = { status: 'ALL', gender: 'ALL', minPrice: 0, maxPrice: 10000, sort: 'DEFAULT' };
  await render(React.createElement(module.GameDiscoveryFilters, { locale: 'en', query, onApply, onClose }));
  const max = root.root.findByProps({ id: 'discovery-max-price' }); await act(async () => max.props.onChange({ target: { value: '160' } })); expect(onApply).not.toHaveBeenCalled();
  await act(async () => root.root.findByProps({ id: 'discovery-min-price' }).props.onChange({ target: { value: '200' } })); expect(button('Apply Filters').props.disabled).toBe(true);
  await act(async () => button('Reset All').props.onClick()); expect(onApply).toHaveBeenCalledWith(query); expect(onClose).toHaveBeenCalled();
});
