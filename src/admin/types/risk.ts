import type { RiskLevel } from './common';

/** 充值风控命中（docx §4：退款 / 高频充值）。 */
export interface RiskHit {
  id: string;
  time: string;
  userId: string;
  userName: string;
  amount: string;
  total: string;
  reason: string;
  level: RiskLevel;
  category: '退款' | '高频充值' | '设备关联' | '私下交易';
  handled: boolean;
}
