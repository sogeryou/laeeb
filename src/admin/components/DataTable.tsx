import React from 'react';

/** 数据表格。支持空态与可选分页条。 */
export function DataTable({
  columns,
  rows,
  emptyText = '暂无数据',
  minWidth = 880,
  pagination,
  onRowClick,
}: {
  columns: string[];
  rows: React.ReactNode[][];
  emptyText?: string;
  minWidth?: number;
  onRowClick?: (rowIndex: number) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
}) {
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-slate-200 text-xs font-black text-slate-500">
              {columns.map((column) => (
                <th key={column} className="px-3 py-3 first:pl-0 last:pr-0">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={`row-${rowIndex}`}
                onClick={onRowClick ? () => onRowClick(rowIndex) : undefined}
                className={`border-b border-slate-100 last:border-b-0 hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={`cell-${rowIndex}-${cellIndex}`}
                    className="px-3 py-3 align-middle text-slate-700 first:pl-0 last:pr-0"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
          {emptyText}
        </div>
      )}

      {pagination && pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-xs font-bold text-slate-500">
            共 {pagination.total} 条 · 第 {pagination.page} / {totalPages} 页
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {pagination.onPageSizeChange && (
              <label className="flex items-center gap-1 text-xs font-bold text-slate-500">
                每页
                <select
                  value={pagination.pageSize}
                  onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 outline-none focus:border-emerald-500"
                >
                  {[10, 30, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                条
              </label>
            )}
            <PageButton
              label="上一页"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            />
            <PageButton
              label="下一页"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PageButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
