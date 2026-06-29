import type { LedgerRow } from '../types';

/** [MOCK] 资金流水种子（docx §1.B：金币/钻石/礼物/收礼/端内美金）。userId 存 "ID / 昵称"。 */
export const mockLedgers: LedgerRow[] = [
  { id: 'L901', time: '2026-06-11 16:13:47(UTC+3)', userId: 'U10082 / Lumina_Sky', type: 'football_add', asset: '金币', amount: 100, balanceAfter: 340583, reference: 'SYS-ADD-901' },
  { id: 'L902', time: '2026-06-11 16:13:47(UTC+3)', userId: 'U10082 / Lumina_Sky', type: 'football_reduce', asset: '金币', amount: -100, balanceAfter: 340483, reference: 'SYS-REDUCE-902' },
  { id: 'L903', time: '2026-06-11 16:13:41(UTC+3)', userId: 'U10082 / Lumina_Sky', type: 'football_add', asset: '金币', amount: 10, balanceAfter: 340583, reference: 'SYS-ADD-903' },
  { id: 'L904', time: '2026-06-11 16:13:41(UTC+3)', userId: 'U10082 / Lumina_Sky', type: 'football_reduce', asset: '金币', amount: -100, balanceAfter: 340573, reference: 'SYS-REDUCE-904' },
  { id: 'L905', time: '2026-06-04 18:33:56(UTC+3)', userId: 'U10082 / Lumina_Sky', type: '面板礼物(语音房)', asset: '礼物', amount: -20000, balanceAfter: 340763, reference: 'GIFT-ROOM-441' },
  { id: 'L906', time: '2026-05-01 19:22:24(UTC+3)', userId: 'U10082 / Lumina_Sky', type: 'official_number', asset: '金币', amount: 300000, balanceAfter: 360763, reference: 'OFFICIAL-202605' },
  { id: 'L907', time: '2026-05-01 00:00:03(UTC+3)', userId: 'U10082 / Lumina_Sky', type: 'tickets2coins_usd', asset: '金币', amount: 13255, balanceAfter: 60763, reference: 'R-5531' },
  { id: 'L908', time: '2026-04-29 20:27:44(UTC+3)', userId: 'U10082 / Lumina_Sky', type: '幸运礼物减金币', asset: '礼物', amount: -1000, balanceAfter: 47508, reference: 'LUCKY-GIFT-92' },
  { id: 'L909', time: '2026-06-27 11:36:10(UTC+3)', userId: 'U10104 / Aria_Flow', type: 'withdraw_apply', asset: '钻石', amount: -4500, balanceAfter: 18440, reference: 'W-2368' },
  { id: 'L910', time: '2026-06-27 13:02:12(UTC+3)', userId: 'U10082 / Lumina_Sky', type: 'order_income', asset: '钻石', amount: 900, balanceAfter: 9360, reference: 'O-78942' },
  { id: 'L911', time: '2026-06-26 21:42:09(UTC+3)', userId: 'U10082 / Lumina_Sky', type: 'gift_receive_private', asset: '收礼', amount: 1880, balanceAfter: 12880, reference: 'GIFT-IM-219' },
  { id: 'L912', time: '2026-06-25 08:02:33(UTC+3)', userId: 'U10082 / Lumina_Sky', type: 'inner_usd_adjust', asset: '端内美金', amount: 45, balanceAfter: 45, reference: 'USD-ADJ-18' },
  { id: 'L913', time: '2026-06-27 09:12:00(UTC+3)', userId: 'U10104 / Aria_Flow', type: 'order_income', asset: '钻石', amount: 1600, balanceAfter: 20040, reference: 'O-78931' },
  { id: 'L914', time: '2026-06-20 15:48:11(UTC+3)', userId: 'U10104 / Aria_Flow', type: 'withdraw_apply', asset: '钻石', amount: -8000, balanceAfter: 12040, reference: 'W-2299' },
  { id: 'L915', time: '2026-06-15 10:05:42(UTC+3)', userId: 'U10220 / MenaCarry', type: 'order_income', asset: '钻石', amount: 1200, balanceAfter: 1200, reference: 'O-78800' },
  { id: 'L916', time: '2026-06-22 19:30:00(UTC+3)', userId: 'U10091 / ShadowReap', type: 'recharge', asset: '金币', amount: 6000, balanceAfter: 6420, reference: 'RC-88421' },
];
