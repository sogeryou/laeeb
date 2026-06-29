import React from 'react';

/** 标题面板容器。 */
export function Panel({
  title,
  icon: Icon,
  action,
  className = '',
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-md border border-slate-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-emerald-700" />
          <h2 className="text-base font-black text-slate-950">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
