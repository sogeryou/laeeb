import type { CompanionService, CompanionStat } from '../types';

/** [MOCK] 陪玩服务与价格（docx §2.C）。 */
export const mockCompanionServices: CompanionService[] = [
  { id: 'U10082', name: 'Lumina_Sky', audit: '已认证', service: 'Valorant', price: '100 金币/局' },
  { id: 'U10104', name: 'Aria_Flow', audit: '资料复审', service: 'PUBG Mobile', price: '80 金币/局' },
  { id: 'U10220', name: 'MenaCarry', audit: '待审核', service: 'League', price: '140 金币/小时' },
];

/** [MOCK] 陪玩经营统计（docx §3 陪玩数据）。 */
export const mockCompanionStats: CompanionStat[] = [
  { id: 'U10082', name: 'Lumina_Sky', services: 7, completed: 324, disputes: 2, rating: '5.0 (842)', orderIncome: 48200, giftIncome: 13600, visitors: 18420, audit: '已认证' },
  { id: 'U10104', name: 'Aria_Flow', services: 5, completed: 218, disputes: 5, rating: '4.8 (516)', orderIncome: 36100, giftIncome: 8700, visitors: 12940, audit: '资料复审' },
  { id: 'U10220', name: 'MenaCarry', services: 3, completed: 0, disputes: 0, rating: '待积累', orderIncome: 0, giftIncome: 0, visitors: 420, audit: '待审核' },
];
