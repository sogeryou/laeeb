import type {
  AssetKind,
  BanDimension,
  BanModule,
  WithdrawalStatus,
} from '../types';

/** 资产增减（金币 / 钻石），支持批量用户。 */
export interface AssetAdjustPayload {
  userIds: string[];
  asset: AssetKind;
  /** 正数为增加，负数为减少。 */
  delta: number;
  operator: string;
}

/** 下发代金券。 */
export interface VoucherGrantPayload {
  userIds: string[];
  count: number;
  value: number;
  operator: string;
}

/** 提现审核处置。 */
export interface WithdrawReviewPayload {
  id: string;
  decision: '审核通过' | '审核拒绝' | '转入复核';
  note?: string;
}

/** 封禁。 */
export interface UserBanPayload {
  userId: string;
  dimensions: BanDimension[];
  modules: BanModule[];
  reason?: string;
}

/** 解封。 */
export interface UserUnbanPayload {
  userId: string;
  dimensions: BanDimension[];
}

/** 基础信息字段更新 / 删除。 */
export type EditableUserField =
  | 'name'
  | 'gender'
  | 'country'
  | 'phone'
  | 'email'
  | 'contentRegion'
  | 'signature';

/** 陪玩管理处置。 */
export interface CompanionReviewPayload {
  id: string;
  action: '审核通过' | '审核驳回' | '移除陪玩' | '调整服务价格';
  service?: string;
  price?: string;
}

/** 纠纷处置。 */
export interface DisputeResolvePayload {
  id: string;
  result: '用户申诉通过' | '用户申诉驳回' | '部分赔付';
  refundCoins: number;
  deductDiamonds: number;
}

/** 全部业务动作。 */
export type AdminAction =
  | { type: 'ASSET_ADJUST'; payload: AssetAdjustPayload }
  | { type: 'VOUCHER_GRANT'; payload: VoucherGrantPayload }
  | { type: 'WITHDRAW_REVIEW'; payload: WithdrawReviewPayload }
  | { type: 'USER_BAN'; payload: UserBanPayload }
  | { type: 'USER_UNBAN'; payload: UserUnbanPayload }
  | { type: 'USER_FIELD_UPDATE'; payload: { userId: string; field: EditableUserField; value: string } }
  | { type: 'USER_FIELD_DELETE'; payload: { userId: string; field: EditableUserField } }
  | { type: 'COMPANION_REVIEW'; payload: CompanionReviewPayload }
  | { type: 'DISPUTE_RESOLVE'; payload: DisputeResolvePayload }
  | { type: 'RISK_HANDLE'; payload: { id: string; ban: boolean } };

/** 提现 decision → 状态映射。 */
export const withdrawDecisionStatus: Record<WithdrawReviewPayload['decision'], WithdrawalStatus> = {
  审核通过: '已通过',
  审核拒绝: '已拒绝',
  转入复核: '复核中',
};
