import { useMemo, useState } from 'react';
import { CreditCard, Download } from 'lucide-react';
import { Badge, DataTable, Field, Metric, MiniActionButton, ModalShell, Panel, SelectInput, TextInput } from '../../components';
import { useToast } from '../../components/Toast';
import { useTableQuery } from '../../hooks/useTableQuery';
import { useAdminStore } from '../../store/useAdminStore';
import type { WithdrawalRow } from '../../types';
import { exportCsv } from '../../utils/csv';
import { diamondsToUsd, formatDiamondsWithUsd, formatNumber, formatUsd } from '../../utils/format';

const statusOptions = ['全部', '待审核', '复核中', '已通过', '已拒绝'];

/** 提现审核（docx §2.A）。 */
export function WithdrawalReviewPanel() {
  const { state, dispatch } = useAdminStore();
  const { toast } = useToast();
  const [actionRow, setActionRow] = useState<WithdrawalRow | null>(null);

  const q = useTableQuery<WithdrawalRow>(state.withdrawals, {
    statusKey: 'status',
    dateKey: 'requestedAt',
    searchKeys: ['userId', 'userName', 'orderId'],
  });

  const handleExport = () =>
    exportCsv(
      '提现审核',
      ['申请时间', 'ID', '订单ID', '用户名', '账号状态', '提现渠道', '提现钻石', '提现美金', '结余钻石', '手续费', '实到美金', '提现信息', '提现状态'],
      q.filtered.map((r) => [
        r.requestedAt, r.userId, r.orderId, r.userName, r.accountStatus, r.channel, r.diamonds, r.diamondsUsd, r.remainingDiamonds, r.fee, r.netUsd, r.info, r.status,
      ]),
    );

  return (
    <Panel
      title="提现审核"
      icon={CreditCard}
      action={
        <button onClick={handleExport} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50">
          <Download className="size-4" /> 导出
        </button>
      }
    >
      <div className="mb-4 grid gap-3 rounded-md bg-slate-50 p-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
        <Field label="搜索（ID/用户名/订单ID）">
          <TextInput value={q.keyword} onChange={q.setKeyword} placeholder="输入关键字" />
        </Field>
        <Field label="提现状态">
          <SelectInput value={q.status} onChange={q.setStatus} options={statusOptions} />
        </Field>
        <Field label="申请日期(起)">
          <TextInput type="date" value={q.dateRange.start ?? ''} onChange={(v) => q.setDateRange({ ...q.dateRange, start: v })} />
        </Field>
        <div className="flex items-end">
          <button type="button" onClick={q.reset} className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
            重置
          </button>
        </div>
      </div>

      <DataTable
        columns={['申请时间', 'ID', '订单ID', '用户名', '账号状态', '提现渠道', '提现钻石(美金)', '结余钻石(美金)', '手续费', '实到美金', '提现信息', '提现状态', '操作']}
        rows={q.pageItems.map((row) => [
          row.requestedAt,
          row.userId,
          row.orderId,
          row.userName,
          <Badge label={row.accountStatus} />,
          row.channel,
          formatDiamondsWithUsd(row.diamonds),
          `${formatNumber(row.remainingDiamonds)} / ${formatUsd(diamondsToUsd(row.remainingDiamonds))}`,
          formatUsd(row.fee),
          formatUsd(row.netUsd),
          row.info,
          <Badge label={row.status} />,
          <div className="flex gap-1">
            <MiniActionButton label="处理" tone="success" onClick={() => setActionRow(row)} />
          </div>,
        ])}
        minWidth={1200}
        emptyText="暂无符合条件的提现申请"
        pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage }}
      />

      {actionRow && (
        <WithdrawalActionModal
          row={actionRow}
          onClose={() => setActionRow(null)}
          onConfirm={(decision) => {
            dispatch({ type: 'WITHDRAW_REVIEW', payload: { id: actionRow.id, decision } });
            toast(`提现 ${actionRow.orderId} 已${decision}`, decision === '审核拒绝' ? 'error' : 'success');
            setActionRow(null);
          }}
        />
      )}
    </Panel>
  );
}

function WithdrawalActionModal({
  row,
  onClose,
  onConfirm,
}: {
  row: WithdrawalRow;
  onClose: () => void;
  onConfirm: (decision: '审核通过' | '审核拒绝' | '转入复核') => void;
}) {
  const [action, setAction] = useState<'审核通过' | '审核拒绝' | '转入复核'>(
    row.status === '复核中' ? '转入复核' : '审核通过',
  );

  return (
    <ModalShell
      title="提现审核操作"
      subtitle={`${row.userId} / ${row.userName} · 订单ID：${row.orderId}`}
      onClose={onClose}
      onConfirm={() => onConfirm(action)}
      confirmText="确认提交"
      footerTone={action === '审核拒绝' ? 'danger' : 'success'}
    >
      <div className="grid gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-3">
        <Metric label="提现钻石" value={formatDiamondsWithUsd(row.diamonds)} />
        <Metric label="手续费" value={formatUsd(row.fee)} />
        <Metric label="实到美金" value={formatUsd(row.netUsd)} />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-black text-slate-700">审核结果</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(['审核通过', '审核拒绝', '转入复核'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setAction(item)}
              className={`h-10 rounded-md border px-3 text-sm font-black ${
                action === item ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-1">
        <span className="text-sm font-black text-slate-700">审核备注</span>
        <textarea
          className="min-h-24 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          placeholder="填写通过原因、拒绝原因或复核说明"
        />
      </label>
    </ModalShell>
  );
}
