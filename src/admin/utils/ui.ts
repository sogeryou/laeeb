/**
 * 统一样式 token。沿用演示版 emerald/slate 浅色主题，集中收敛高频 className，
 * 避免散落重复，保持视觉一致。
 */

/** 通用输入框。 */
export const inputClass =
  'h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

/** 高一档（查询条）输入框。 */
export const inputClassLg =
  'h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

/** 主操作按钮。 */
export const primaryBtnClass =
  'h-11 rounded-md bg-emerald-700 px-5 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500';

/** 次操作按钮。 */
export const secondaryBtnClass =
  'h-11 rounded-md border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50';

/** 字段标签。 */
export const fieldLabelClass = 'text-xs font-black text-slate-500';

/** 状态徽章配色（账号/订单/提现等共用）。 */
export const statusClass: Record<string, string> = {
  正常: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  冻结: 'border-rose-200 bg-rose-50 text-rose-700',
  风控中: 'border-amber-200 bg-amber-50 text-amber-700',
  待审核: 'border-amber-200 bg-amber-50 text-amber-700',
  复审中: 'border-sky-200 bg-sky-50 text-sky-700',
  复核中: 'border-sky-200 bg-sky-50 text-sky-700',
  已通过: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  已认证: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  已拒绝: 'border-rose-200 bg-rose-50 text-rose-700',
  已完成: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  审核完成: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  已处理: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  纠纷中: 'border-rose-200 bg-rose-50 text-rose-700',
  进行中: 'border-sky-200 bg-sky-50 text-sky-700',
  待确认: 'border-amber-200 bg-amber-50 text-amber-700',
  取证中: 'border-sky-200 bg-sky-50 text-sky-700',
  已取消: 'border-slate-200 bg-slate-50 text-slate-600',
  已撤销: 'border-slate-200 bg-slate-50 text-slate-600',
  已移除: 'border-slate-200 bg-slate-50 text-slate-600',
};

/** 风险等级配色。 */
export const riskLevelClass: Record<string, string> = {
  高: 'border-rose-200 bg-rose-50 text-rose-700',
  中: 'border-amber-200 bg-amber-50 text-amber-700',
  低: 'border-slate-200 bg-slate-50 text-slate-600',
};
