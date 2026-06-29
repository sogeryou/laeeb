import React from 'react';

/**
 * 统一弹窗外壳。提供 onConfirm 时渲染"取消 / 确认"底栏，否则只渲染内容（如纯查看类弹窗）。
 */
export function ModalShell({
  title,
  subtitle,
  children,
  onClose,
  onConfirm,
  confirmText = '确认',
  confirmDisabled = false,
  footerTone = 'success',
  maxWidth = 'max-w-2xl',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  confirmDisabled?: boolean;
  footerTone?: 'success' | 'danger';
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className={`w-full ${maxWidth} rounded-md border border-slate-200 bg-white shadow-2xl`}>
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-black text-slate-950">{title}</h3>
            {subtitle && <p className="mt-1 text-xs font-bold text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-950"
            aria-label={`关闭${title}`}
          >
            ×
          </button>
        </div>

        <div className="max-h-[68vh] space-y-4 overflow-y-auto p-5">{children}</div>

        {onConfirm && (
          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={`h-10 rounded-md px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 ${
                footerTone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
