import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAppState } from '../../client/app/useAppState';
import { businessApi } from '../../client/services/businessApi';
import { authApi } from '../../client/features/auth/api';
import * as sessionApi from '../../client/features/auth/session';
import { rememberReturn, takeReturn } from '../../client/features/auth/routing';
import type { AuthSession } from '../../shared/auth';
import type { EPal } from '../../shared/types';
import type { View } from '../../client/router/routes';

vi.mock('../../client/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'en', t: translate }) }));
vi.mock('../../client/hooks/useDeviceId', () => ({ useDeviceId: () => 'local-device' }));
vi.mock('../../client/hooks/useSocial', () => ({ useSocial: () => ({ posts: [], chatSessions: [], currentMessages: [], setCurrentMessages: vi.fn() }) }));
vi.mock('../../client/hooks/useOrders', () => ({ useOrders: () => ({ items: [], coupons: [], refresh: vi.fn() }) }));
vi.mock('../../client/hooks/useNotifications', () => ({ useNotifications: () => ({}) }));
vi.mock('../../client/hooks/useAccountProfile', () => ({ useAccountProfile: () => ({}) }));
vi.mock('../../client/hooks/usePeerIdentity', () => ({ usePeerIdentity: () => ({}) }));
vi.mock('../../client/hooks/usePublicCompanionProfile', () => ({ usePublicCompanionProfile: () => ({}) }));
vi.mock('../../client/hooks/useCompanionApplication', () => ({ useCompanionApplication: () => ({ application: null, draft: {}, setDraft: vi.fn() }) }));

const translate = (key: string) => key;
const storage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const session = (id = 'buyer', token = `token-${id}`): AuthSession => ({ token, user: { id, email: `${id}@local.test`, username: id, role: 'USER', permissions: [], accountStatus: 'ACTIVE', profileComplete: true } });
const companion = (id = 'discovery-val-00'): EPal => ({
  id, userId: 'real-provider', name: 'Real companion', avatarUrl: '/real.png', game: 'Valorant', price: 25,
  rating: 0, orderCount: '0', tags: [], onlineStatus: 'Online',
  services: [
    { id, name: 'Valorant', icon: '', posterUrl: '/real.png', description: 'Current primary', rating: 0, orderCount: '0', screenshots: [], variants: [{ name: 'Valorant', price: 25, unit: 'hr' }] },
    { id: 'extra', name: 'Extra', icon: '', posterUrl: '/real.png', description: '', rating: 0, orderCount: '0', screenshots: [], variants: [{ name: 'Extra', price: 9, unit: 'match' }] },
  ],
});
let app: ReturnType<typeof useAppState>;
let root: ReactTestRenderer | null;
let browser: EventTarget & { location: { pathname: string }; history: { pushState: ReturnType<typeof vi.fn>; replaceState: ReturnType<typeof vi.fn> }; setTimeout: typeof setTimeout; setInterval: typeof setInterval; clearInterval: typeof clearInterval; scrollTo: ReturnType<typeof vi.fn> };
function Host() { app = useAppState(); return null; }
async function render() { await act(async () => { root = create(React.createElement(Host)); }); }
async function publish(value: AuthSession | null) { await act(async () => { if (value) sessionApi.storeSession(value); else sessionApi.clearSession(); }); }
async function discover() { await act(async () => app.navigateTo('GAME_DETAIL', app.GAMES.find(game => game.id === 'val'))); }
async function filter() { await act(async () => { app.setEpalFilters({ ...app.epalFilters, priceRange: [5, 30] }); app.setEpalSortBy('SCORE'); app.setShowEpalFilterModal(true); }); }
function expectDiscovery(reset = true) {
  expect(app.currentView).toBe('GAME_DETAIL'); expect(app.selectedGame?.id).toBe('val');
  expect(app.epalFilters.priceRange).toEqual(reset ? [0, 10000] : [5, 30]);
  expect(app.epalSortBy).toBe(reset ? 'DEFAULT' : 'SCORE');
  expect(app.showEpalFilterModal).toBe(!reset);
}
async function savedReturn(view: View = 'ORDER_CONFIRM', epal = companion()) {
  rememberReturn(view, view === 'ORDER_CONFIRM' ? { epal } : epal);
  browser.location.pathname = '/auth/login';
  expect(app.pendingNavigationRef.current).toBeNull();
  await act(async () => { await app.finishAuthSession(session(), false); });
}

beforeEach(() => {
  root = null;
  browser = Object.assign(new EventTarget(), { location: { pathname: '/' }, history: {
    pushState: vi.fn((_a, _b, path) => { browser.location.pathname = path; }),
    replaceState: vi.fn((_a, _b, path) => { browser.location.pathname = path; }),
  }, setTimeout, setInterval, clearInterval, scrollTo: vi.fn() });
  vi.stubGlobal('window', browser); vi.stubGlobal('document', { visibilityState: 'visible' });
  vi.stubGlobal('PopStateEvent', Event); vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage());
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  sessionApi.clearSession();
  vi.spyOn(sessionApi, 'restoreSession').mockResolvedValue(null);
  vi.spyOn(authApi, 'logout').mockResolvedValue({ ok: true });
  vi.spyOn(businessApi, 'listRechargePackages').mockResolvedValue([]);
  vi.spyOn(businessApi, 'getWalletBalance').mockResolvedValue({} as any);
  vi.spyOn(businessApi, 'listWalletTransactions').mockResolvedValue([]);
  vi.spyOn(businessApi, 'listCompanionRankings').mockResolvedValue([]);
  vi.spyOn(businessApi, 'getPublicCompanionProfile').mockResolvedValue(companion());
});
afterEach(async () => { if (root) await act(async () => root!.unmount()); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('keeps discovery when the initial stored session arrives but clears private application fields', async () => {
  const restored = deferred<AuthSession | null>(); vi.mocked(sessionApi.restoreSession).mockReturnValueOnce(restored.promise);
  localStorage.setItem('business_workbench_token', session().token);
  await render(); await discover(); await filter();
  await act(async () => { app.setApplicationDetails({ rank: 'private', platform: 'private', style: '', price: '99', discount: '' }); app.setSelectedServiceCategory('private'); });
  await act(async () => restored.resolve(session()));
  expectDiscovery(); expect(app.applicationDetails.rank).toBe(''); expect(app.selectedServiceCategory).toBeNull();
});
it('preserves discovery through owner switch and logout events while resetting filters', async () => {
  await render(); await publish(session()); await discover(); await filter();
  await publish(session('other')); expectDiscovery();
  await filter(); await publish(null); expectDiscovery();
});
it('preserves game and applied filters on same-owner token rotation', async () => {
  await render(); await publish(session()); await discover(); await filter();
  await publish(session('buyer', 'rotated')); expectDiscovery(false);
});
it.each(['login', 'switch', 'logout'] as const)('restores public discovery on profile Back after %s without reviving an application draft', async change => {
  await render(); if (change !== 'login') await publish(session()); await discover(); await filter();
  await act(async () => app.navigateTo('PROFILE', companion()));
  await act(async () => { app.setSelectedGame(app.GAMES.find(game => game.id === 'pubg')!); app.setApplicationDetails({ rank: 'private', platform: '', style: '', price: '', discount: '' }); });
  await publish(change === 'logout' ? null : session(change === 'switch' ? 'other' : 'buyer'));
  await act(async () => app.handleBack()); expectDiscovery();
  await act(async () => app.navigateTo('HOME'));
  expect(app.selectedGame).toBeNull(); expect(app.applicationDetails.rank).toBe('');
});
it('does not keep a private-only application game on account switch', async () => {
  await render(); await publish(session());
  await act(async () => { app.navigateTo('APPLY_PLAYER'); app.setSelectedGame(app.GAMES[0]); });
  await publish(session('other')); expect(app.selectedGame).toBeNull();
});
it('clears private game and application fields on a synchronous A-B-A owner change', async () => {
  await render(); await publish(session());
  await act(async () => { app.navigateTo('APPLY_PLAYER'); app.setSelectedGame(app.GAMES[0]); app.setApplicationDetails({ rank: 'private', platform: '', style: '', price: '', discount: '' }); });
  await act(async () => { sessionApi.storeSession(session('other')); sessionApi.storeSession(session()); });
  expect(app.selectedGame).toBeNull(); expect(app.applicationDetails.rank).toBe('');
});
it.each(['PROFILE', 'IM_DETAIL', 'ORDER_CONFIRM'] as const)('resolves a saved real %s return with a fresh public read', async view => {
  await render(); await act(async () => app.setActiveServiceId('extra'));
  await savedReturn(view);
  expect(businessApi.getPublicCompanionProfile).toHaveBeenCalledTimes(1);
  expect(businessApi.getPublicCompanionProfile).toHaveBeenCalledWith('discovery-val-00');
  expect(app.currentView).toBe(view); expect(app.selectedEPal).toEqual(companion());
  if (view === 'ORDER_CONFIRM') { expect(app.activeServiceId).toBe(companion().id); expect(app.selectedVariant).toEqual({ name: 'Valorant', price: 25, unit: 'hr' }); }
  expect(takeReturn()).toBeNull();
  expect(sessionStorage.getItem('le3eb_auth_return')).toBeNull();
});
it('keeps in-memory guest chat and profile Back history through login', async () => {
  await render(); await discover(); await filter();
  await act(async () => { app.navigateTo('PROFILE', companion()); });
  await act(async () => app.navigateTo('IM_DETAIL', companion()));
  expect(app.showAuthModal).toBe(true);
  await act(async () => { app.finishAuthSession(session(), false); });
  expect(app.currentView).toBe('IM_DETAIL');
  await act(async () => app.handleBack()); expect(app.currentView).toBe('PROFILE');
  await act(async () => app.handleBack()); expectDiscovery();
});
it('does not let synchronous AuthFlow reentry consume an in-flight real return', async () => {
  await render(); const pending = deferred<EPal>(); vi.mocked(businessApi.getPublicCompanionProfile).mockReturnValue(pending.promise);
  rememberReturn('ORDER_CONFIRM', companion());
  await act(async () => { app.finishAuthSession(session(), false); });
  await act(async () => { app.finishAuthSession({ token: app.authToken!, user: app.authUser! }, false); });
  await act(async () => pending.resolve(companion()));
  expect(app.currentView).toBe('ORDER_CONFIRM'); expect(businessApi.getPublicCompanionProfile).toHaveBeenCalledTimes(1);
});
it('does not let repeated finishAuthSession override newer user navigation', async () => {
  await render(); const pending = deferred<EPal>(); vi.mocked(businessApi.getPublicCompanionProfile).mockReturnValueOnce(pending.promise);
  rememberReturn('ORDER_CONFIRM', companion());
  await act(async () => { app.finishAuthSession(session(), false); });
  await act(async () => { app.navigateTo('COMMUNITY'); app.finishAuthSession({ token: app.authToken!, user: app.authUser! }, false); });
  await act(async () => pending.resolve(companion()));
  expect(app.currentView).toBe('COMMUNITY'); expect(app.selectedEPal).toBeNull();
});
it('keeps the existing admin-role rejection during an in-flight public return', async () => {
  await render(); const pending = deferred<EPal>(); vi.mocked(businessApi.getPublicCompanionProfile).mockReturnValueOnce(pending.promise);
  rememberReturn('ORDER_CONFIRM', companion()); await act(async () => { app.finishAuthSession(session(), false); });
  await act(async () => { app.finishAuthSession(session(), true); });
  expect(app.authStatus).toBe('admin.login.notAdmin');
  await act(async () => pending.resolve(companion()));
});
it('lets a new return after A-B-A supersede the obsolete same-token operation', async () => {
  await render(); const old = deferred<EPal>(), fresh = deferred<EPal>();
  vi.mocked(businessApi.getPublicCompanionProfile).mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  rememberReturn('ORDER_CONFIRM', companion()); await act(async () => { app.finishAuthSession(session(), false); });
  await act(async () => { sessionApi.storeSession(session('other')); sessionApi.storeSession(session()); });
  rememberReturn('IM_DETAIL', companion('fresh-peer')); await act(async () => { app.finishAuthSession(session(), false); });
  expect(businessApi.getPublicCompanionProfile).toHaveBeenCalledTimes(2);
  await act(async () => old.resolve(companion()));
  await act(async () => { app.finishAuthSession(session(), false); });
  expect(businessApi.getPublicCompanionProfile).toHaveBeenCalledTimes(2);
  await act(async () => fresh.resolve(companion('fresh-peer')));
  expect(app.currentView).toBe('IM_DETAIL'); expect(app.selectedEPal?.id).toBe('fresh-peer');
});
it('does not leave a malformed saved target locked against a later valid return', async () => {
  await render(); await savedReturn('ORDER_CONFIRM', { ...companion(), id: '' });
  expect(app.toastMessage).toMatch(/unavailable/i); expect(businessApi.getPublicCompanionProfile).not.toHaveBeenCalled();
  await savedReturn('IM_DETAIL'); expect(app.currentView).toBe('IM_DETAIL');
});
it('uses the freshly read primary price rather than the old saved card or active extra service', async () => {
  await render(); const fresh = companion(); fresh.price = 30; fresh.services![0].variants[0].price = 30;
  vi.mocked(businessApi.getPublicCompanionProfile).mockResolvedValueOnce(fresh);
  await act(async () => app.setActiveServiceId('extra'));
  await savedReturn(); expect(app.activeServiceId).toBe(fresh.id); expect(app.selectedVariant?.price).toBe(30);
});
it.each(['navigate', 'back', 'direct view', 'popstate', 'logout', 'switch', 'A-B-A', 'rotation', 'credential storage', 'unmount'] as const)('ignores a delayed auth return after %s', async change => {
  await render(); const pending = deferred<EPal>(); vi.mocked(businessApi.getPublicCompanionProfile).mockReturnValueOnce(pending.promise);
  rememberReturn('ORDER_CONFIRM', companion());
  await act(async () => { app.finishAuthSession(session(), false); });
  expect(businessApi.getPublicCompanionProfile).toHaveBeenCalledTimes(1);
  if (change === 'navigate') await act(async () => app.navigateTo('COMMUNITY'));
  if (change === 'back') await act(async () => app.handleBack());
  if (change === 'direct view') await act(async () => app.setCurrentView('HOME'));
  if (change === 'popstate') await act(async () => browser.dispatchEvent(new Event('popstate')));
  if (change === 'logout') await act(async () => { await app.handleLogout(); });
  if (change === 'switch') await publish(session('other'));
  if (change === 'A-B-A') await act(async () => { sessionApi.storeSession(session('other')); sessionApi.storeSession(session()); });
  if (change === 'rotation') await publish(session('buyer', 'rotated'));
  if (change === 'credential storage') localStorage.setItem('business_workbench_token', 'rotated-before-session-event');
  if (change === 'unmount') { await act(async () => root!.unmount()); root = null; }
  const previous = { view: app.currentView, selected: app.selectedEPal, toast: app.toastMessage };
  await act(async () => pending.resolve(companion()));
  expect({ view: app.currentView, selected: app.selectedEPal, toast: app.toastMessage }).toEqual(previous);
});
it('ignores a delayed failure after user navigation', async () => {
  await render(); const pending = deferred<EPal>(); vi.mocked(businessApi.getPublicCompanionProfile).mockReturnValueOnce(pending.promise);
  rememberReturn('PROFILE', companion()); await act(async () => { app.finishAuthSession(session(), false); });
  expect(businessApi.getPublicCompanionProfile).toHaveBeenCalledTimes(1);
  await act(async () => app.navigateTo('COMMUNITY'));
  await act(async () => pending.reject(new Error('COMPANION_NOT_FOUND')));
  expect(app.currentView).toBe('COMMUNITY'); expect(app.toastMessage).toBe('');
});
it.each([
  ['missing', null], ['wrong identity', { ...companion(), id: 'wrong' }], ['missing provider', { ...companion(), userId: undefined }],
  ['missing service', { ...companion(), services: [] }], ['extra-only service', { ...companion(), services: companion().services!.slice(1) }],
  ['bad price', { ...companion(), services: [{ ...companion().services![0], variants: [{ name: 'Valorant', price: NaN, unit: 'hr' }] }] }],
  ['wrong primary price', { ...companion(), price: 10 }], ['wrong primary unit', { ...companion(), services: [{ ...companion().services![0], variants: [{ name: 'Valorant', price: 25, unit: 'match' }] }] }],
] as const)('shows unavailable instead of resuming an invalid public response: %s', async (_label, response) => {
  await render(); vi.mocked(businessApi.getPublicCompanionProfile).mockResolvedValueOnce(response as EPal);
  await savedReturn(); expect(app.currentView).toBe('HOME'); expect(app.selectedEPal).toBeNull(); expect(app.toastMessage).toMatch(/unavailable/i);
});
it('shows unavailable for a failed public read without prototype fallback', async () => {
  await render(); vi.mocked(businessApi.getPublicCompanionProfile).mockRejectedValueOnce(new Error('COMPANION_NOT_FOUND'));
  await savedReturn('PROFILE', { ...companion(), id: app.EPALS[0].id });
  expect(businessApi.getPublicCompanionProfile).toHaveBeenCalledWith(app.EPALS[0].id);
  expect(app.currentView).toBe('HOME'); expect(app.selectedEPal).toBeNull(); expect(app.toastMessage).toMatch(/unavailable/i);
});
it.each(['Busy', 'Offline', 'self'] as const)('does not resume immediate checkout for a fresh %s companion', async status => {
  await render(); vi.mocked(businessApi.getPublicCompanionProfile).mockResolvedValueOnce({ ...companion(), ...(status === 'self' ? { userId: 'buyer' } : { onlineStatus: status }) });
  await savedReturn(); expect(app.currentView).not.toBe('ORDER_CONFIRM'); expect(app.toastMessage).toMatch(/unavailable/i);
});
it.each(['Busy', 'Offline'] as const)('still allows a saved chat with a %s companion', async onlineStatus => {
  await render(); vi.mocked(businessApi.getPublicCompanionProfile).mockResolvedValueOnce({ ...companion(), onlineStatus });
  await savedReturn('IM_DETAIL'); expect(app.currentView).toBe('IM_DETAIL');
});
