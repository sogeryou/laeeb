import type { RiskHit } from '../types';

/** [MOCK] 充值风控命中（docx §4：退款 / 高频充值）。 */
export const mockRiskHits: RiskHit[] = [
  { id: 'RK-9001', time: '2026-06-27 12:56', userId: 'U10091', userName: 'ShadowReap', amount: '$120', total: '$620', reason: '1 小时内连续 5 笔充值，且设备关联 4 个账号', level: '高', category: '高频充值', handled: false },
  { id: 'RK-9002', time: '2026-06-27 10:42', userId: 'U10138', userName: 'FalconDuo', amount: '$20', total: '$80', reason: '退款账户再次下单，设备维度命中黑名单', level: '高', category: '退款', handled: false },
  { id: 'RK-9003', time: '2026-06-26 22:18', userId: 'U10201', userName: 'GulfAce', amount: '$50', total: '$450', reason: '充值后高频送礼给同一陪玩', level: '中', category: '高频充值', handled: false },
];
