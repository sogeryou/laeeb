/** 账号状态（docx §1 状态：正常 / 冻结 / 风控中）。 */
export type UserStatus = '正常' | '冻结' | '风控中';

/** 当前身份（docx §1 用户 / 陪玩）。 */
export type Role = '用户' | '陪玩';

/** 订单状态。 */
export type OrderStatus = '待确认' | '进行中' | '已完成' | '已取消' | '纠纷中';

/** 提现状态（docx §2.A）。 */
export type WithdrawalStatus = '待审核' | '已通过' | '已拒绝';

/** 资产种类。 */
export type AssetKind = '金币' | '钻石';

/** 风险等级。 */
export type RiskLevel = '高' | '中' | '低';

/** 封禁维度（docx §2.B：账号 / 设备）。 */
export type BanDimension = '账号' | '设备';

/** 封禁模块（docx §2.B：账号/下单/接单/充值/提现/私聊/动态）。 */
export type BanModule = '账号' | '下单' | '接单' | '充值' | '提现' | '私聊' | '动态';

/** 时间区间筛选。 */
export interface DateRange {
  start?: string;
  end?: string;
}

/** 通用列表查询参数。 */
export interface TableQuery {
  keyword?: string;
  type?: string;
  status?: string;
  dateRange?: DateRange;
  page?: number;
  pageSize?: number;
}

/** 分页结果包装。 */
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 写操作统一返回。 */
export interface MutationResult {
  ok: boolean;
  message: string;
}
