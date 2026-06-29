import type { BanDimension, BanModule, OrderStatus, Role, UserStatus } from './common';

/**
 * 后台用户实体（docx §1.A 基础信息全字段）。
 * 字段命名沿用演示版以平滑迁移。
 */
export interface AdminUser {
  id: string;
  name: string;
  gender: string;
  role: Role;
  country: string;
  phone: string;
  email: string;
  registeredAt: string;
  lastLoginAt: string;
  coins: number;
  diamonds: number;
  followers: number;
  totalRecharge: number;
  status: UserStatus;
  ip: string;
  device: string;
  did: string;
  linkedAccounts: number;
  mid: string;
  showId: string;
  roomId: string;
  avatar: string;
  userTag: string;
  guildName: string;
  guildId: string;
  following: number;
  signature: string;
  loginSource: string;
  version: string;
  systemLanguage: string;
  birthday: string;
  adid: string;
  simCard: string;
  registerIp: string;
  usedProxy: boolean;
  usedVpn: boolean;
  channelPackage: string;
  innerUsd: number;
  wealthLevel: number;
  vipLevel: number;
  contentRegion: string;
  totalReceivedDiamonds: number;
  /** 当前生效的封禁记录（账号被封时存在）。 */
  bans?: BanRecord[];
}

/** 封禁记录。 */
export interface BanRecord {
  dimensions: BanDimension[];
  modules: BanModule[];
  reason: string;
  bannedAt: string;
}

/** 流水资产类型（docx §1.B 行为信息）。 */
export type LedgerAsset = '金币' | '钻石' | '礼物' | '收礼' | '端内美金';

/** 资金流水（docx §1.B：类型 / 数额 / 变动后数额）。 */
export interface LedgerRow {
  id: string;
  time: string;
  userId: string;
  type: string;
  asset: LedgerAsset;
  amount: number;
  balanceAfter: number;
  reference: string;
}

/** 订单记录（下单 / 接单，docx §1.B）。 */
export interface OrderRow {
  id: string;
  time: string;
  userId: string;
  userName: string;
  epalId: string;
  epalName: string;
  service: string;
  unitPrice: number;
  quantity: number;
  total: number;
  status: OrderStatus;
}
