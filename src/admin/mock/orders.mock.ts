import type { OrderRow } from '../types';

/** [MOCK] 订单记录种子（docx §1.B 下单/接单 + §3 订单数据）。 */
export const mockOrders: OrderRow[] = [
  { id: 'O-78942', time: '2026-06-27 12:50:00', userId: 'U10091', userName: 'ShadowReap', epalId: 'U10082', epalName: 'Lumina_Sky', service: 'Valorant 上分', unitPrice: 100, quantity: 3, total: 300, status: '已完成' },
  { id: 'O-78940', time: '2026-06-27 11:28:00', userId: 'U10138', userName: 'FalconDuo', epalId: 'U10104', epalName: 'Aria_Flow', service: 'PUBG Mobile 双排', unitPrice: 80, quantity: 2, total: 160, status: '纠纷中' },
  { id: 'O-78931', time: '2026-06-26 23:06:00', userId: 'U10091', userName: 'ShadowReap', epalId: 'U10104', epalName: 'Aria_Flow', service: '语音聊天', unitPrice: 60, quantity: 1, total: 60, status: '已完成' },
  { id: 'O-78912', time: '2026-06-26 18:43:00', userId: 'U10082', userName: 'Lumina_Sky', epalId: 'U10104', epalName: 'Aria_Flow', service: 'League Coaching', unitPrice: 140, quantity: 2, total: 280, status: '已取消' },
  { id: 'O-78905', time: '2026-06-25 20:10:00', userId: 'U10201', userName: 'GulfAce', epalId: 'U10082', epalName: 'Lumina_Sky', service: 'Valorant 上分', unitPrice: 100, quantity: 5, total: 500, status: '已完成' },
  { id: 'O-78890', time: '2026-06-24 14:22:00', userId: 'U10138', userName: 'FalconDuo', epalId: 'U10220', epalName: 'MenaCarry', service: 'PUBG Mobile 双排', unitPrice: 80, quantity: 1, total: 80, status: '进行中' },
  { id: 'O-78870', time: '2026-06-23 09:15:00', userId: 'U10201', userName: 'GulfAce', epalId: 'U10104', epalName: 'Aria_Flow', service: '语音聊天', unitPrice: 60, quantity: 4, total: 240, status: '已完成' },
  { id: 'O-78851', time: '2026-06-22 21:48:00', userId: 'U10091', userName: 'ShadowReap', epalId: 'U10220', epalName: 'MenaCarry', service: 'League Coaching', unitPrice: 140, quantity: 1, total: 140, status: '待确认' },
];
