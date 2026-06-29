import type { WithdrawalRow } from '../types';

/** [MOCK] 提现申请种子（docx §2.A）。 */
export const mockWithdrawals: WithdrawalRow[] = [
  { id: 'W-2368', requestedAt: '2026-06-27 11:36', userId: 'U10104', userName: 'Aria_Flow', accountStatus: '正常', channel: 'PayPal', diamonds: 4500, diamondsUsd: 45, remainingDiamonds: 18440, fee: 2.25, netUsd: 42.75, orderId: 'WD2026062701', info: 'aria.pay@example.com', status: '待审核' },
  { id: 'W-2362', requestedAt: '2026-06-27 09:10', userId: 'U10082', userName: 'Lumina_Sky', accountStatus: '正常', channel: 'Bank', diamonds: 8000, diamondsUsd: 80, remainingDiamonds: 9360, fee: 4, netUsd: 76, orderId: 'WD2026062700', info: 'IBAN **** 9132', status: '复核中' },
  { id: 'W-2351', requestedAt: '2026-06-26 17:22', userId: 'U10138', userName: 'FalconDuo', accountStatus: '冻结', channel: 'Payoneer', diamonds: 1200, diamondsUsd: 12, remainingDiamonds: 0, fee: 0.6, netUsd: 11.4, orderId: 'WD2026062617', info: 'risk-linked device', status: '已拒绝' },
  { id: 'W-2344', requestedAt: '2026-06-26 12:08', userId: 'U10220', userName: 'MenaCarry', accountStatus: '正常', channel: 'PayPal', diamonds: 1000, diamondsUsd: 10, remainingDiamonds: 1200, fee: 0.5, netUsd: 9.5, orderId: 'WD2026062601', info: 'mena.pay@example.com', status: '待审核' },
];
