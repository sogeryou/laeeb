import type { OrderTrendPoint, RechargeRecord, RechargeTrendPoint } from '../types';

/** [MOCK] 充值数据明细（docx §3 充值数据字段）。 */
export const mockRechargeRecords: RechargeRecord[] = [
  { id: 'RC-88421', time: '2026-06-22 19:30:00', userId: 'U10091', userName: 'ShadowReap', innerOrderNo: 'IN20260622001', outerOrderNo: 'GP-88421', usdTotal: 49.99, channelFee: 7.5, coinsTotal: 3000, platform: 'Google Pay' },
  { id: 'RC-88455', time: '2026-06-25 10:12:00', userId: 'U10201', userName: 'GulfAce', innerOrderNo: 'IN20260625014', outerOrderNo: 'AP-88455', usdTotal: 99.99, channelFee: 15, coinsTotal: 6000, platform: 'Apple Pay' },
  { id: 'RC-88470', time: '2026-06-26 16:40:00', userId: 'U10082', userName: 'Lumina_Sky', innerOrderNo: 'IN20260626031', outerOrderNo: 'GP-88470', usdTotal: 19.99, channelFee: 3, coinsTotal: 1200, platform: 'Google Pay' },
  { id: 'RC-88492', time: '2026-06-27 08:05:00', userId: 'U10138', userName: 'FalconDuo', innerOrderNo: 'IN20260627009', outerOrderNo: 'GP-88492', usdTotal: 4.99, channelFee: 0.75, coinsTotal: 300, platform: 'Google Pay' },
  { id: 'RC-88510', time: '2026-06-27 13:22:00', userId: 'U10104', userName: 'Aria_Flow', innerOrderNo: 'IN20260627042', outerOrderNo: 'AP-88510', usdTotal: 9.99, channelFee: 1.5, coinsTotal: 600, platform: 'Apple Pay' },
];

/** [MOCK] 充值趋势（docx §3 充值数据，图表）。 */
export const mockRechargeTrend: RechargeTrendPoint[] = [
  { day: '06/21', amount: 12800, users: 280 },
  { day: '06/22', amount: 18400, users: 342 },
  { day: '06/23', amount: 16200, users: 318 },
  { day: '06/24', amount: 23600, users: 411 },
  { day: '06/25', amount: 21800, users: 396 },
  { day: '06/26', amount: 27400, users: 462 },
  { day: '06/27', amount: 31800, users: 520 },
];

/** [MOCK] 订单状态分布（图表，运行时会与 store 订单合并校准）。 */
export const mockOrderTrend: OrderTrendPoint[] = [
  { type: '完成', count: 1280 },
  { type: '进行中', count: 260 },
  { type: '取消', count: 148 },
  { type: '纠纷', count: 32 },
];
