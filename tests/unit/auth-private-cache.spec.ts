import { createElement, act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useAppState } from '../../client/app/useAppState';
import { businessApi } from '../../client/services/businessApi';
import { clearSession, storeSession } from '../../client/features/auth/session';
import type { AuthUser } from '../../shared/auth';

vi.mock('../../client/hooks/useDeviceId', () => ({ useDeviceId: () => 'test-device' }));
vi.mock('../../client/i18n/I18nProvider', () => { const value = { locale: 'en', setLocale: () => {}, t: (key: string) => key, supportedLocales: ['en'], getLocaleLabel: (key: string) => key }; return { useI18n: () => value }; });
const user = (id: string): AuthUser => ({ id, email: `${id}@local.test`, username: id, role: 'USER', permissions: [], profileComplete: true, accountStatus: 'ACTIVE' });
const memoryStorage = () => { const data = new Map<string,string>(); return { getItem: (key:string) => data.get(key) ?? null, setItem: (key:string,value:string) => data.set(key,value), removeItem: (key:string) => data.delete(key) }; };
class DetailEvent extends Event { detail: unknown; constructor(name: string, init: { detail: unknown }) { super(name); this.detail = init.detail; } }
let root: ReactTestRenderer;
let app: ReturnType<typeof useAppState>;
function Harness() { app = useAppState(); return null; }
beforeEach(async () => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setInterval, clearInterval, setTimeout, clearTimeout, scrollTo: () => {}, location: { pathname: '/' } }));
  vi.stubGlobal('localStorage', memoryStorage()); vi.stubGlobal('sessionStorage', memoryStorage()); vi.stubGlobal('CustomEvent', DetailEvent);
  vi.stubGlobal('document', { hidden: false, visibilityState: 'visible' }); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ items: [], nextBefore: null }), { headers: { 'content-type': 'application/json' } })));
  vi.spyOn(businessApi, 'listRechargePackages').mockResolvedValue([]);
  vi.spyOn(businessApi, 'listCompanionRankings').mockResolvedValue([]);
  vi.spyOn(businessApi, 'getWalletBalance').mockResolvedValue({ userId: 'a', balance: 0 } as any);
  vi.spyOn(businessApi, 'listWalletTransactions').mockResolvedValue([]);
  clearSession();
  await act(async () => { root = create(createElement(Harness)); });
  await act(async () => { storeSession({ token: 'access-a', refreshToken: 'refresh-a', user: user('a') }); });
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('does not apply old wallet and transaction responses after logout', async () => {
  let finishWallet!: (value: any) => void; let finishTransactions!: (value: any) => void;
  vi.spyOn(businessApi, 'getWalletBalance').mockReturnValueOnce(new Promise(resolve => { finishWallet = resolve; }));
  vi.spyOn(businessApi, 'listWalletTransactions').mockReturnValueOnce(new Promise(resolve => { finishTransactions = resolve; }));
  const wallet = app.fetchWallet(); const transactions = app.fetchTransactions();
  await act(async () => clearSession());
  await act(async () => { finishWallet({ userId: 'a', balance: 123 }); finishTransactions([{ id: 'a-private' }]); await Promise.all([wallet, transactions]); });
  expect(app.wallet).toBeNull(); expect(app.transactions).toEqual([]);
});
it('clears private cached data on account change without clearing it for token rotation', async () => {
  vi.mocked(businessApi.getWalletBalance).mockImplementation(() => new Promise(() => {}));
  vi.mocked(businessApi.listWalletTransactions).mockImplementation(() => new Promise(() => {}));
  await act(async () => { app.setWallet({ userId: 'a', balance: 123 } as any); app.setTransactions([{ id: 'a-private' }] as any); });
  await act(async () => storeSession({ token: 'rotated-a', refreshToken: 'rotated-refresh-a', user: user('a') }));
  expect(app.wallet?.balance).toBe(123);
  await act(async () => storeSession({ token: 'access-b', refreshToken: 'refresh-b', user: user('b') }));
  expect(app.wallet).toBeNull(); expect(app.transactions).toEqual([]);
});
