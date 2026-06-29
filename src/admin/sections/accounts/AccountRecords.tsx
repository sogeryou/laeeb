import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Badge, DataTable, Field, SelectInput, TextInput } from '../../components';
import { useTableQuery } from '../../hooks/useTableQuery';
import { useAdminStore } from '../../store/useAdminStore';
import type { AdminUser, LedgerAsset, LedgerRow, OrderRow } from '../../types';
import { exportCsv } from '../../utils/csv';
import { formatNumber, formatSigned, getServiceCategory } from '../../utils/format';
import { secondaryBtnClass } from '../../utils/ui';

const tabs = ['金币流水', '钻石流水', '下单记录', '接单记录'] as const;
type RecordTab = (typeof tabs)[number];

/** 行为信息：流水与订单记录（docx §1.B）。 */
export function AccountRecords({ user }: { user: AdminUser }) {
  const [tab, setTab] = useState<RecordTab>('金币流水');

  return (
    <section>
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`h-12 shrink-0 border border-b-0 px-5 text-sm font-black ${
              tab === item
                ? 'border-slate-200 bg-white text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="rounded-b-md rounded-tr-md border border-slate-200 bg-white p-4">
        {tab === '金币流水' && <LedgerRecords user={user} asset="金币" />}
        {tab === '钻石流水' && <LedgerRecords user={user} asset="钻石" />}
        {tab === '下单记录' && <OrderRecords user={user} mode="placed" />}
        {tab === '接单记录' && <OrderRecords user={user} mode="received" />}
      </div>
    </section>
  );
}

function LedgerRecords({ user, asset }: { user: AdminUser; asset: LedgerAsset }) {
  const { state } = useAdminStore();
  const source = useMemo(
    () => state.ledgers.filter((row) => row.userId.startsWith(user.id) && row.asset === asset),
    [state.ledgers, user.id, asset],
  );
  const typeOptions = useMemo(() => ['全部', ...new Set(source.map((r) => r.type))], [source]);
  const q = useTableQuery<LedgerRow>(source, { typeKey: 'type', dateKey: 'time', searchKeys: ['type', 'reference'] });
  const unit = asset === '钻石' ? '钻石' : '金币';

  const handleExport = () =>
    exportCsv(
      `${user.id}_${asset}流水`,
      ['日期', '类型', `${unit}数量`, `变动后${unit}数量`],
      q.filtered.map((r) => [r.time, r.type, r.amount, r.balanceAfter]),
    );

  return (
    <div className="space-y-4">
      <FilterBar
        typeOptions={typeOptions}
        type={q.type}
        onType={q.setType}
        dateStart={q.dateRange.start ?? ''}
        dateEnd={q.dateRange.end ?? ''}
        onDateStart={(v) => q.setDateRange({ ...q.dateRange, start: v })}
        onDateEnd={(v) => q.setDateRange({ ...q.dateRange, end: v })}
        onReset={q.reset}
        onExport={handleExport}
      />
      <DataTable
        columns={['日期', '类型', `${unit}数量`, `变动后${unit}数量`]}
        rows={q.pageItems.map((row) => [
          row.time,
          row.type,
          <span className="font-black text-slate-900">{formatSigned(row.amount)}</span>,
          formatNumber(row.balanceAfter),
        ])}
        emptyText={`暂无${asset}流水`}
        pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage }}
      />
    </div>
  );
}

function OrderRecords({ user, mode }: { user: AdminUser; mode: 'placed' | 'received' }) {
  const { state } = useAdminStore();
  const source = useMemo(
    () => state.orders.filter((o) => (mode === 'placed' ? o.userId === user.id : o.epalId === user.id)),
    [state.orders, user.id, mode],
  );
  const q = useTableQuery<OrderRow>(source, {
    dateKey: 'time',
    statusKey: 'status',
    searchKeys: ['userId', 'userName', 'epalId', 'epalName', 'service'],
  });
  const statusOptions = useMemo(() => ['全部', ...new Set(source.map((o) => o.status))], [source]);

  const handleExport = () =>
    exportCsv(
      `${user.id}_${mode === 'placed' ? '下单' : '接单'}记录`,
      ['时间', '用户ID', '用户昵称', '陪玩ID', '陪玩昵称', '服务大类', '单价', '数量', '总额', '订单状态'],
      q.filtered.map((o) => [
        o.time, o.userId, o.userName, o.epalId, o.epalName, getServiceCategory(o.service), o.unitPrice, o.quantity, o.total, o.status,
      ]),
    );

  return (
    <div className="space-y-4">
      <FilterBar
        typeOptions={statusOptions}
        typeLabel="订单状态"
        type={q.status}
        onType={q.setStatus}
        dateStart={q.dateRange.start ?? ''}
        dateEnd={q.dateRange.end ?? ''}
        onDateStart={(v) => q.setDateRange({ ...q.dateRange, start: v })}
        onDateEnd={(v) => q.setDateRange({ ...q.dateRange, end: v })}
        onReset={q.reset}
        onExport={handleExport}
      />
      <DataTable
        columns={['时间', '用户ID', '用户昵称', '陪玩ID', '陪玩昵称', '服务大类', '单价', '数量', '总额', '订单状态']}
        rows={q.pageItems.map((o) => [
          o.time,
          o.userId,
          o.userName,
          o.epalId,
          o.epalName,
          getServiceCategory(o.service),
          `${o.unitPrice} 金币`,
          o.quantity,
          `${o.total} 金币`,
          <Badge label={o.status} />,
        ])}
        emptyText={`暂无${mode === 'placed' ? '下单' : '接单'}记录`}
        pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage }}
      />
    </div>
  );
}

function FilterBar({
  typeOptions,
  typeLabel = '类型',
  type,
  onType,
  dateStart,
  dateEnd,
  onDateStart,
  onDateEnd,
  onReset,
  onExport,
}: {
  typeOptions: string[];
  typeLabel?: string;
  type: string;
  onType: (v: string) => void;
  dateStart: string;
  dateEnd: string;
  onDateStart: (v: string) => void;
  onDateEnd: (v: string) => void;
  onReset: () => void;
  onExport: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-md bg-slate-50 p-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
      <Field label="开始日期">
        <TextInput type="date" value={dateStart} onChange={onDateStart} />
      </Field>
      <Field label="结束日期">
        <TextInput type="date" value={dateEnd} onChange={onDateEnd} />
      </Field>
      <Field label={typeLabel}>
        <SelectInput value={type} onChange={onType} options={typeOptions} />
      </Field>
      <div className="flex items-end gap-2">
        <button type="button" onClick={onReset} className={`${secondaryBtnClass} h-10`}>
          重置
        </button>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800"
        >
          <Download className="size-4" />
          导出
        </button>
      </div>
    </div>
  );
}
