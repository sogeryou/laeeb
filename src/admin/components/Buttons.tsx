import React from 'react';

/** 大号操作按钮（带图标）。 */
export function ActionButton({
  icon: Icon,
  label,
  tone = 'default',
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: 'default' | 'danger';
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-black transition ${
        tone === 'danger'
          ? 'bg-rose-600 text-white hover:bg-rose-700'
          : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

/** 表格行内小按钮。 */
export function MiniActionButton({
  label,
  tone = 'default',
  onClick,
}: {
  label: string;
  tone?: 'default' | 'success' | 'danger';
  onClick: () => void;
}) {
  const toneClass = {
    default: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    danger: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 whitespace-nowrap rounded border px-2.5 text-xs font-black ${toneClass}`}
    >
      {label}
    </button>
  );
}

/** 仅图标的微型按钮。 */
export function IconMiniButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="mx-0.5 inline-grid size-6 place-items-center rounded bg-white/85 text-slate-700 hover:bg-white hover:text-emerald-700"
    >
      <Icon className="size-4" />
    </button>
  );
}

/** 指标小卡。 */
export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black text-slate-950">{value}</p>
    </div>
  );
}
