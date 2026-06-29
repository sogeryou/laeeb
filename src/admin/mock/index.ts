import type { AdminState } from '../store/reducer';
import { mockCompanionServices, mockCompanionStats } from './companions.mock';
import { mockDisputes } from './disputes.mock';
import { mockOrderTrend, mockRechargeRecords, mockRechargeTrend } from './finance.mock';
import { mockLedgers } from './ledgers.mock';
import { mockOrders } from './orders.mock';
import { mockRiskHits } from './risk.mock';
import { mockLinkedAccountIds, mockUsers } from './users.mock';
import { mockWithdrawals } from './withdrawals.mock';

/**
 * [MOCK] 聚合生成后台初始 store 快照。
 * 真实接入后删除本目录并改 USE_MOCK=false，详见 ./README.md。
 */
export function createMockSeed(): AdminState {
  return {
    users: structuredClone(mockUsers),
    ledgers: structuredClone(mockLedgers),
    orders: structuredClone(mockOrders),
    withdrawals: structuredClone(mockWithdrawals),
    assetOps: [],
    companionServices: structuredClone(mockCompanionServices),
    companionStats: structuredClone(mockCompanionStats),
    disputes: structuredClone(mockDisputes),
    riskHits: structuredClone(mockRiskHits),
    rechargeRecords: structuredClone(mockRechargeRecords),
    rechargeTrend: structuredClone(mockRechargeTrend),
    orderTrend: structuredClone(mockOrderTrend),
    linkedAccountIds: structuredClone(mockLinkedAccountIds),
    operator: 'admin_joy',
    seq: 100000,
  };
}
