import type { CompanionService, CompanionStat } from '../types';

/** [MOCK] 陪玩服务与价格（docx §2.C）。 */
export const mockCompanionServices: CompanionService[] = [
  {
    id: 'U10082',
    name: 'Lumina_Sky',
    audit: '已认证',
    service: 'Valorant',
    price: '100 金币/局',
    level: 'S',
    rank: 'Immortal 2',
    platform: 'iOS / Discord',
    positions: 'Duelist / Sentinel',
    style: '稳定上分、轻松聊天',
    screenshots: ['段位截图-Valorant-01'],
    voice: 'voice_lumina_intro.mp3',
    serviceItems: [
      { category: 'Valorant', name: '排位双排', price: '100 金币/局' },
      { category: 'Valorant', name: '教学复盘', price: '220 金币/小时' },
      { category: '语音聊天', name: '轻松陪聊', price: '60 金币/30分钟' },
    ],
  },
  {
    id: 'U10104',
    name: 'Aria_Flow',
    audit: '待审核',
    service: 'PUBG Mobile',
    price: '80 金币/局',
    level: 'A',
    rank: 'Conqueror',
    platform: 'Android / WhatsApp',
    positions: '突击位 / 指挥',
    style: '高互动、带新手',
    screenshots: ['段位截图-PUBG-01'],
    voice: 'voice_aria_intro.mp3',
    serviceItems: [
      { category: 'PUBG Mobile', name: '经典四排', price: '80 金币/局' },
      { category: 'PUBG Mobile', name: '冲分车队', price: '140 金币/小时' },
      { category: '语音聊天', name: '英语练习', price: '70 金币/30分钟' },
    ],
  },
  {
    id: 'U10220',
    name: 'MenaCarry',
    audit: '待审核',
    service: 'League',
    price: '140 金币/小时',
    level: '待评定',
    rank: 'Diamond I',
    platform: 'PC / Discord',
    positions: 'Jungle / Support',
    style: '指挥型、教学型',
    screenshots: ['段位截图-League-01'],
    voice: 'voice_mena_intro.mp3',
    serviceItems: [
      { category: 'League', name: '单双排陪玩', price: '140 金币/小时' },
      { category: 'League', name: '打野路线教学', price: '200 金币/小时' },
    ],
  },
];

/** [MOCK] 陪玩经营统计（docx §3 陪玩数据）。 */
export const mockCompanionStats: CompanionStat[] = [
  { id: 'U10082', name: 'Lumina_Sky', services: 7, completed: 324, disputes: 2, rating: '5.0 (842)', orderIncome: 48200, giftIncome: 13600, visitors: 18420, audit: '已认证' },
  { id: 'U10104', name: 'Aria_Flow', services: 5, completed: 218, disputes: 5, rating: '4.8 (516)', orderIncome: 36100, giftIncome: 8700, visitors: 12940, audit: '待审核' },
  { id: 'U10220', name: 'MenaCarry', services: 3, completed: 0, disputes: 0, rating: '待积累', orderIncome: 0, giftIncome: 0, visitors: 420, audit: '待审核' },
];
