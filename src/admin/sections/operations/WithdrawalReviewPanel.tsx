import { useState } from 'react';
import { CreditCard, Download } from 'lucide-react';
import { Badge, DataTable, Field, Metric, ModalShell, Panel, SelectInput, TextInput } from '../../components';
import { useToast } from '../../components/Toast';
import { useTableQuery } from '../../hooks/useTableQuery';
import { useAdminStore } from '../../store/useAdminStore';
import type { WithdrawalRow } from '../../types';
import { exportXlsx } from '../../utils/exportXlsx';
import { diamondsToUsd, formatDiamondsWithUsd, formatNumber, formatUsd } from '../../utils/format';

const statusOptions = ['全部', '待审核', '已通过', '已拒绝'];

/** 提现审核（docx §2.A）。 */
export function WithdrawalReviewPanel() {
  const { state, dispatch } = useAdminStore();
  const { toast } = useToast();
  const [actionRow, setActionRow] = useState<WithdrawalRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchAction, setBatchAction] = useState<'审核通过' | '审核拒绝' | null>(null);
  const [draftUserId, setDraftUserId] = useState('');
  const [draftOrderId, setDraftOrderId] = useState('');
  const [userId, setUserId] = useState('');
  const [orderId, setOrderId] = useState('');

  const q = useTableQuery<WithdrawalRow>(state.withdrawals, {
    statusKey: 'status',
    dateKey: 'requestedAt',
    extra: (row) => {
      const userNeedle = userId.trim().toLowerCase();
      const orderNeedle = orderId.trim().toLowerCase();
      if (userNeedle && !row.userId.toLowerCase().includes(userNeedle)) return false;
      if (orderNeedle && !row.orderId.toLowerCase().includes(orderNeedle)) return false;
      return true;
    },
  });
  const pendingPageIds = q.pageItems.filter((row) => row.status === '待审核').map((row) => row.id);
  const selectedPendingIds = selectedIds.filter((id) => state.withdrawals.some((row) => row.id === id && row.status === '待审核'));

  const runSearch = () => {
    setUserId(draftUserId);
    setOrderId(draftOrderId);
    q.setPage(1);
  };

  const resetFilters = () => {
    setDraftUserId('');
    setDraftOrderId('');
    setUserId('');
    setOrderId('');
    setSelectedIds([]);
    q.reset();
  };

  const handleExport = () =>
    exportXlsx(
      '提现审核.xlsx',
      ['申请时间', 'ID', '订单ID', '用户名', '账号状态', '提现渠道', '提现钻石', '提现美金', '结余钻石', '手续费', '实到美金', '提现信息', '提现状态'],
      q.filtered.map((r) => [
        r.requestedAt, r.userId, r.orderId, r.userName, r.accountStatus, r.channel, r.diamonds, r.diamondsUsd, r.remainingDiamonds, r.fee, r.netUsd, r.info, r.status,
      ]),
    );

  const toggleSelected = (row: WithdrawalRow) => {
    if (row.status !== '待审核') return;
    setSelectedIds((prev) => (prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]));
  };

  const togglePageSelected = () => {
    if (pendingPageIds.length === 0) return;
    const allSelected = pendingPageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => {
      if (allSelected) return prev.filter((id) => !pendingPageIds.includes(id));
      return Array.from(new Set([...prev, ...pendingPageIds]));
    });
  };

  const handleReview = (ids: string[], decision: '审核通过' | '审核拒绝') => {
    const reviewableIds = ids.filter((id) => state.withdrawals.some((row) => row.id === id && row.status === '待审核'));
    reviewableIds.forEach((id) => dispatch({ type: 'WITHDRAW_REVIEW', payload: { id, decision } }));
    const skipped = ids.length - reviewableIds.length;
    toast(
      skipped > 0 ? `已${decision} ${reviewableIds.length} 笔提现，${skipped} 笔状态不可更改` : `已${decision} ${reviewableIds.length} 笔提现`,
      decision === '审核拒绝' ? 'error' : 'success',
    );
    setSelectedIds((prev) => prev.filter((id) => !reviewableIds.includes(id)));
    setActionRow(null);
    setBatchAction(null);
  };

  return (
    <Panel
      title="提现审核"
      icon={CreditCard}
      action={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={selectedPendingIds.length === 0}
            onClick={() => setBatchAction('审核通过')}
            className="h-9 rounded-md bg-emerald-700 px-3 text-xs font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            批量通过
          </button>
          <button
            type="button"
            disabled={selectedPendingIds.length === 0}
            onClick={() => setBatchAction('审核拒绝')}
            className="h-9 rounded-md border border-rose-200 bg-white px-3 text-xs font-black text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            批量拒绝
          </button>
          <button onClick={handleExport} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50">
            <Download className="size-4" /> 导出
          </button>
        </div>
      }
    >
      <div className="mb-4 grid gap-3 rounded-md bg-slate-50 p-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <Field label="用户ID">
          <TextInput value={draftUserId} onChange={setDraftUserId} placeholder="查询用户ID" />
        </Field>
        <Field label="订单ID">
          <TextInput value={draftOrderId} onChange={setDraftOrderId} placeholder="查询订单ID" />
        </Field>
        <Field label="提现状态">
          <SelectInput value={q.status} onChange={q.setStatus} options={statusOptions} />
        </Field>
        <Field label="申请日期(起)">
          <TextInput type="date" value={q.dateRange.start ?? ''} onChange={(v) => q.setDateRange({ ...q.dateRange, start: v })} />
        </Field>
        <div className="flex items-end gap-2">
          <button type="button" onClick={runSearch} className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800">
            查询
          </button>
          <button type="button" onClick={resetFilters} className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
            重置
          </button>
        </div>
      </div>

      <DataTable
        columns={['选择', '申请时间', 'ID', '订单ID', '用户名', '账号状态', '提现渠道', '提现钻石(美金)', '结余钻石(美金)', '手续费', '实到美金', '提现信息', '提现状态']}
        rows={q.pageItems.map((row) => [
          <input
            type="checkbox"
            checked={selectedIds.includes(row.id)}
            disabled={row.status !== '待审核'}
            onClick={(event) => event.stopPropagation()}
            onChange={() => toggleSelected(row)}
            className="size-4 accent-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          />,
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
        ])}
        onRowClick={(rowIndex) => setActionRow(q.pageItems[rowIndex])}
        minWidth={1200}
        emptyText="暂无符合条件的提现申请"
        pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage, onPageSizeChange: q.setPageSize }}
      />
      {pendingPageIds.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
          <button type="button" onClick={togglePageSelected} className="rounded border border-slate-200 bg-white px-3 py-1.5 font-black text-slate-700 hover:bg-slate-50">
            {pendingPageIds.every((id) => selectedIds.includes(id)) ? '取消选择本页待审核' : '选择本页待审核'}
          </button>
          已选 {selectedPendingIds.length} 笔待审核提现
        </div>
      )}

      {actionRow && (
        <WithdrawalActionModal
          row={actionRow}
          onClose={() => setActionRow(null)}
          onConfirm={(decision) => handleReview([actionRow.id], decision)}
        />
      )}
      {batchAction && (
        <BatchWithdrawalActionModal
          count={selectedPendingIds.length}
          action={batchAction}
          onClose={() => setBatchAction(null)}
          onConfirm={() => handleReview(selectedPendingIds, batchAction)}
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
  onConfirm: (decision: '审核通过' | '审核拒绝') => void;
}) {
  const [action, setAction] = useState<'审核通过' | '审核拒绝'>('审核通过');
  const canReview = row.status === '待审核';

  return (
    <ModalShell
      title="提现审核操作"
      subtitle={`${row.userId} / ${row.userName} · 订单ID：${row.orderId} · 当前状态：${row.status}`}
      onClose={onClose}
      onConfirm={canReview ? () => onConfirm(action) : undefined}
      confirmText="确认处理"
      footerTone={action === '审核拒绝' ? 'danger' : 'success'}
      maxWidth="max-w-3xl"
    >
      <div className="grid gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-4">
        <Metric label="提现钻石" value={formatDiamondsWithUsd(row.diamonds)} />
        <Metric label="手续费" value={formatUsd(row.fee)} />
        <Metric label="实到美金" value={formatUsd(row.netUsd)} />
        <Metric label="提现渠道" value={row.channel} />
      </div>

      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-black text-slate-500">提现信息</p>
          <p className="mt-1 text-sm font-black text-slate-900">{row.info}</p>
        </div>
        <div>
          <p className="text-xs font-black text-slate-500">结余钻石</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {formatNumber(row.remainingDiamonds)} / {formatUsd(diamondsToUsd(row.remainingDiamonds))}
          </p>
        </div>
      </div>

      {canReview ? (
      <fieldset>
        <legend className="mb-2 text-sm font-black text-slate-700">审核结果</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(['审核通过', '审核拒绝'] as const).map((item) => (
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
      ) : (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500">
          该提现申请已完成审核，仅支持查看信息。
        </div>
      )}

      {canReview && <label className="block space-y-1">
        <span className="text-sm font-black text-slate-700">审核备注</span>
        <textarea
          className="min-h-24 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          placeholder="填写通过原因或拒绝原因"
        />
      </label>}
    </ModalShell>
  );
}

function BatchWithdrawalActionModal({
  count,
  action,
  onClose,
  onConfirm,
}: {
  count: number;
  action: '审核通过' | '审核拒绝';
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell
      title="批量处理提现"
      subtitle={`将对 ${count} 笔待审核提现执行「${action}」`}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmText="确认批量处理"
      confirmDisabled={count === 0}
      footerTone={action === '审核拒绝' ? 'danger' : 'success'}
    >
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600">
        批量处理只会影响当前已选中的「待审核」提现申请，已通过或已拒绝的记录不会被再次处理。
      </div>
    </ModalShell>
  );
}
