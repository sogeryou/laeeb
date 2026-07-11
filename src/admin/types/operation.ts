import type { AssetKind, UserStatus, WithdrawalStatus } from './common';

/** 提现申请（docx §2.A 提现审核全字段）。 */
export interface WithdrawalRow {
  id: string;
  requestedAt: string;
  userId: string;
  userName: string;
  accountStatus: UserStatus;
  channel: string;
  diamonds: number;
  diamondsUsd: number;
  remainingDiamonds: number;
  fee: number;
  netUsd: number;
  orderId: string;
  info: string;
  status: WithdrawalStatus;
}

/** 资产/代金券后台操作日志（docx §2.A）。 */
export interface AssetOperation {
  id: string;
  time: string;
  userId: string;
  asset: AssetKind | '代金券';
  amount: string;
  operator: string;
  reason: string;
  status: '已完成' | '复核中' | '已撤销';
}

/** 陪玩服务与价格（docx §2.C / §3 陪玩数据）。 */
export interface CompanionService {
  id: string;
  name: string;
  audit: '已认证' | '待审核' | '已拒绝' | '已移除';
  serviceAudits?: Record<string, '已认证' | '待审核' | '已拒绝' | '已移除'>;
  service: string;
  price: string;
  level: string;
  rank: string;
  platform: string;
  positions: string;
  style: string;
  screenshots: string[];
  voice: string;
  serviceItems: CompanionServiceItem[];
}

export interface CompanionServiceItem {
  category: string;
  name: string;
  price: string;
}

/** 陪玩经营统计（docx §3 陪玩数据）。 */
export interface CompanionStat {
  id: string;
  name: string;
  services: number;
  completed: number;
  disputes: number;
  rating: string;
  orderIncome: number;
  giftIncome: number;
  visitors: number;
  audit: string;
}

/** 纠纷 / 举报订单（docx §2.D）。 */
export type DisputeStatus = '待审核' | '复审中' | '审核完成';

export interface DisputeOrder {
  id: string;
  time: string;
  orderId: string;
  epalId: string;
  epalName: string;
  userId: string;
  userName: string;
  serviceType: string;
  unitPrice: number;
  quantity: number;
  total: number;
  evidence: string[];
  status: DisputeStatus;
}
