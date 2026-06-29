/** 充值数据明细（docx §3 充值数据字段）。 */
export interface RechargeRecord {
  id: string;
  time: string;
  userId: string;
  userName: string;
  innerOrderNo: string;
  outerOrderNo: string;
  usdTotal: number;
  channelFee: number;
  coinsTotal: number;
  platform: string;
}

/** 财务大盘指标（docx §3 大盘数据，由 store 实时计算）。 */
export interface FinanceMetric {
  totalRechargeCoins: number;
  rechargeUsers: number;
  orderUsers: number;
  completedOrders: number;
  completedOrderCoins: number;
  giftCoins: number;
  diamondIncome: number;
  platformCoinBalance: number;
  platformDiamondBalance: number;
}

/** 充值趋势点（图表）。 */
export interface RechargeTrendPoint {
  day: string;
  amount: number;
  users: number;
}

/** 订单状态分布点（图表）。 */
export interface OrderTrendPoint {
  type: string;
  count: number;
}
