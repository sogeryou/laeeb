import type { DisputeOrder } from '../types';

/** [MOCK] 纠纷 / 举报订单（docx §2.D）。 */
export const mockDisputes: DisputeOrder[] = [
  { id: 'D-4401', time: '2026-06-27 11:28', orderId: 'O-78940', epalId: 'U10104', epalName: 'Aria_Flow', userId: 'U10138', userName: 'FalconDuo', serviceType: 'PUBG Mobile', unitPrice: 80, quantity: 2, total: 160, evidence: ['截图 2 张', '视频 1 段'], status: '待审核' },
  { id: 'D-4395', time: '2026-06-26 23:06', orderId: 'O-78931', epalId: 'U10104', epalName: 'Aria_Flow', userId: 'U10091', userName: 'ShadowReap', serviceType: '语音聊天', unitPrice: 60, quantity: 1, total: 60, evidence: ['聊天截图 3 张'], status: '取证中' },
];
