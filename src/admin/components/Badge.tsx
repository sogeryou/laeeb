import { riskLevelClass, statusClass } from '../utils/ui';

/** 状态徽章（账号/订单/提现等）。 */
export function Badge({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-1 text-xs font-black ${
        statusClass[label] ?? 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {label}
    </span>
  );
}

/** 风险等级徽章。 */
export function RiskBadge({ level }: { level: string }) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-1 text-xs font-black ${
        riskLevelClass[level] ?? 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {level}
    </span>
  );
}
