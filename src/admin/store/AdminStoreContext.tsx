import React, { createContext, useMemo, useReducer } from 'react';
import { USE_MOCK } from '../config';
import { createMockSeed } from '../mock'; // [MOCK] 仅 bootstrap 注入种子，UI 不依赖
import type { AdminAction } from './actions';
import { adminReducer, type AdminState } from './reducer';

/** 空状态（USE_MOCK=false 时由真实接口异步填充）。 */
function createEmptyState(): AdminState {
  return {
    users: [],
    ledgers: [],
    orders: [],
    withdrawals: [],
    assetOps: [],
    companionServices: [],
    companionStats: [],
    disputes: [],
    riskHits: [],
    rechargeRecords: [],
    rechargeTrend: [],
    orderTrend: [],
    linkedAccountIds: {},
    operator: 'admin_joy',
    seq: 100000,
  };
}

interface AdminStoreValue {
  state: AdminState;
  dispatch: React.Dispatch<AdminAction>;
}

export const AdminStoreContext = createContext<AdminStoreValue | null>(null);

export function AdminStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(
    adminReducer,
    undefined,
    () => (USE_MOCK ? createMockSeed() : createEmptyState()), // [MOCK]
  );
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
}
