import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, DataTable, Field, SelectInput, TextInput } from '../../components';
import { useTableQuery } from '../../hooks/useTableQuery';
import { useAdminStore } from '../../store/useAdminStore';
import type { CompanionStat, OrderRow, RechargeRecord, WithdrawalRow } from '../../types';
import { exportCsv } from '../../utils/csv';
import { diamondsToUsd, formatNumber, formatUsd, getServiceCategory } from '../../utils/format';

function includesValue(value: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return value.toLowerCase().includes(needle);
}

interface FilterInput {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

/** 数据系统筛选条（按明确查询键筛选，docx §3）。 */
function DataFilterBar({
  filters,
  typeLabel,
  typeOptions,
  type,
  onType,
  dateStart,
  onDateStart,
  onQuery,
  onReset,
  onExport,
}: {
  filters: FilterInput[];
  typeLabel?: string;
  typeOptions?: string[];
  type?: string;
  onType?: (v: string) => void;
  dateStart: string;
  onDateStart: (v: string) => void;
  onQuery: () => void;
  onReset: () => void;
  onExport: () => void;
}) {
  const columnCount = filters.length + (typeOptions && onType ? 1 : 0) + (dateStart || onDateStart ? 1 : 0);
  const gridClass = columnCount >= 5 ? 'xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]' : 'lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]';

  return (
    <div className={`mb-4 grid gap-3 rounded-md bg-slate-50 p-3 ${gridClass}`}>
      {filters.map((filter) => (
        <div key={filter.label}>
          <Field label={filter.label}>
            <TextInput value={filter.value} onChange={filter.onChange} placeholder={filter.placeholder} />
          </Field>
        </div>
      ))}
      {typeOptions && onType ? (
        <Field label={typeLabel ?? '类型'}>
          <SelectInput value={type ?? '全部'} onChange={onType} options={typeOptions} />
        </Field>
      ) : (
        <div />
      )}
      {onDateStart && (
        <Field label="日期(起)">
          <TextInput type="date" value={dateStart} onChange={onDateStart} />
        </Field>
      )}
      <div className="flex items-end gap-2">
        <button type="button" onClick={onQuery} className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800">
          查询
        </button>
        <button type="button" onClick={onReset} className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
          重置
        </button>
        <button type="button" onClick={onExport} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800">
          <Download className="size-4" /> 导出
        </button>
      </div>
    </div>
  );
}

/** 充值数据（docx §3 充值数据字段）。 */
export function RechargeDataTable() {
  const { state } = useAdminStore();
  const [draftUserId, setDraftUserId] = useState('');
  const [draftInnerOrderNo, setDraftInnerOrderNo] = useState('');
  const [userId, setUserId] = useState('');
  const [innerOrderNo, setInnerOrderNo] = useState('');
  const platformOptions = useMemo(() => ['全部', ...new Set(state.rechargeRecords.map((r) => r.platform))], [state.rechargeRecords]);
  const q = useTableQuery<RechargeRecord>(state.rechargeRecords, {
    typeKey: 'platform',
    dateKey: 'time',
    extra: (row) =>
      includesValue(row.userId, userId) &&
      includesValue(row.innerOrderNo, innerOrderNo),
  });

  const handleExport = () =>
    exportCsv(
      '充值数据',
      ['时间', '账号ID', '昵称', '内部订单号', '外部订单号', '充值美金总额', '渠道费', '充值金币总额', '充值平台'],
      q.filtered.map((r) => [r.time, r.userId, r.userName, r.innerOrderNo, r.outerOrderNo, r.usdTotal, r.channelFee, r.coinsTotal, r.platform]),
    );

  return (
    <>
      <DataFilterBar
        filters={[
          { label: '用户ID', value: draftUserId, onChange: setDraftUserId, placeholder: '查询用户ID' },
          { label: '内部订单号', value: draftInnerOrderNo, onChange: setDraftInnerOrderNo, placeholder: '查询内部订单号' },
        ]}
        typeLabel="充值平台" typeOptions={platformOptions} type={q.type} onType={q.setType}
        dateStart={q.dateRange.start ?? ''} onDateStart={(v) => q.setDateRange({ ...q.dateRange, start: v })}
        onQuery={() => {
          setUserId(draftUserId);
          setInnerOrderNo(draftInnerOrderNo);
          q.setPage(1);
        }}
        onReset={() => {
          setDraftUserId('');
          setDraftInnerOrderNo('');
          setUserId('');
          setInnerOrderNo('');
          q.reset();
        }} onExport={handleExport}
      />
      <DataTable
        columns={['时间', '账号ID', '昵称', '内部订单号', '外部订单号', '充值美金', '渠道费', '充值金币', '充值平台']}
        rows={q.pageItems.map((r) => [r.time, r.userId, r.userName, r.innerOrderNo, r.outerOrderNo, formatUsd(r.usdTotal), formatUsd(r.channelFee), formatNumber(r.coinsTotal), r.platform])}
        minWidth={1000}
        emptyText="暂无充值数据"
        pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage }}
      />
    </>
  );
}

/** 订单数据（docx §3 订单数据字段）。 */
export function OrderDataTable() {
  const { state } = useAdminStore();
  const [draftUserId, setDraftUserId] = useState('');
  const [draftEpalId, setDraftEpalId] = useState('');
  const [draftOrderId, setDraftOrderId] = useState('');
  const [userId, setUserId] = useState('');
  const [epalId, setEpalId] = useState('');
  const [orderId, setOrderId] = useState('');
  const statusOptions = useMemo(() => ['全部', ...new Set(state.orders.map((o) => o.status))], [state.orders]);
  const q = useTableQuery<OrderRow>(state.orders, {
    statusKey: 'status',
    dateKey: 'time',
    extra: (row) =>
      includesValue(row.userId, userId) &&
      includesValue(row.epalId, epalId) &&
      includesValue(row.id, orderId),
  });

  const handleExport = () =>
    exportCsv(
      '订单数据',
      ['时间', '订单ID', '用户ID', '用户昵称', '陪玩ID', '陪玩昵称', '服务大类', '单价', '数量', '总额', '订单状态'],
      q.filtered.map((o) => [o.time, o.id, o.userId, o.userName, o.epalId, o.epalName, getServiceCategory(o.service), o.unitPrice, o.quantity, o.total, o.status]),
    );

  return (
    <>
      <DataFilterBar
        filters={[
          { label: '用户ID', value: draftUserId, onChange: setDraftUserId, placeholder: '查询用户ID' },
          { label: '陪玩ID', value: draftEpalId, onChange: setDraftEpalId, placeholder: '查询陪玩ID' },
          { label: '订单ID', value: draftOrderId, onChange: setDraftOrderId, placeholder: '查询订单ID' },
        ]}
        typeLabel="订单状态" typeOptions={statusOptions} type={q.status} onType={q.setStatus}
        dateStart={q.dateRange.start ?? ''} onDateStart={(v) => q.setDateRange({ ...q.dateRange, start: v })}
        onQuery={() => {
          setUserId(draftUserId);
          setEpalId(draftEpalId);
          setOrderId(draftOrderId);
          q.setPage(1);
        }}
        onReset={() => {
          setDraftUserId('');
          setDraftEpalId('');
          setDraftOrderId('');
          setUserId('');
          setEpalId('');
          setOrderId('');
          q.reset();
        }} onExport={handleExport}
      />
      <DataTable
        columns={['时间', '订单ID', '用户ID', '用户昵称', '陪玩ID', '陪玩昵称', '服务大类', '单价', '数量', '总额', '订单状态']}
        rows={q.pageItems.map((o) => [o.time, o.id, o.userId, o.userName, o.epalId, o.epalName, getServiceCategory(o.service), `${o.unitPrice} 金币`, o.quantity, `${o.total} 金币`, <Badge label={o.status} />])}
        minWidth={1100}
        emptyText="暂无订单数据"
        pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage }}
      />
    </>
  );
}

/** 提现数据（docx §3 提现数据：提现钻石数/手续费/实发美金）。 */
export function WithdrawDataTable() {
  const { state } = useAdminStore();
  const [draftUserId, setDraftUserId] = useState('');
  const [draftOrderId, setDraftOrderId] = useState('');
  const [userId, setUserId] = useState('');
  const [orderId, setOrderId] = useState('');
  const q = useTableQuery<WithdrawalRow>(state.withdrawals, {
    statusKey: 'status',
    dateKey: 'requestedAt',
    extra: (row) => includesValue(row.userId, userId) && includesValue(row.orderId, orderId),
  });

  const handleExport = () =>
    exportCsv(
      '提现数据',
      ['申请时间', '提现订单ID', '用户ID', '昵称', '提现钻石数', '手续费', '实发美金', '提现状态'],
      q.filtered.map((w) => [w.requestedAt, w.orderId, w.userId, w.userName, w.diamonds, formatUsd(w.fee), formatUsd(w.netUsd), w.status]),
    );

  return (
    <>
      <DataFilterBar
        filters={[
          { label: '用户ID', value: draftUserId, onChange: setDraftUserId, placeholder: '查询用户ID' },
          { label: '订单ID', value: draftOrderId, onChange: setDraftOrderId, placeholder: '查询订单ID' },
        ]}
        typeLabel="提现状态" typeOptions={['全部', '待审核', '已通过', '已拒绝']} type={q.status} onType={q.setStatus}
        dateStart={q.dateRange.start ?? ''} onDateStart={(v) => q.setDateRange({ ...q.dateRange, start: v })}
        onQuery={() => {
          setUserId(draftUserId);
          setOrderId(draftOrderId);
          q.setPage(1);
        }}
        onReset={() => {
          setDraftUserId('');
          setDraftOrderId('');
          setUserId('');
          setOrderId('');
          q.reset();
        }} onExport={handleExport}
      />
      <DataTable
        columns={['申请时间', '提现订单ID', '用户ID', '昵称', '提现钻石数(美金)', '手续费', '实发美金', '提现状态']}
        rows={q.pageItems.map((w) => [w.requestedAt, w.orderId, w.userId, w.userName, `${formatNumber(w.diamonds)} (${formatUsd(diamondsToUsd(w.diamonds))})`, formatUsd(w.fee), formatUsd(w.netUsd), <Badge label={w.status} />])}
        minWidth={1000}
        emptyText="暂无提现数据"
        pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage }}
      />
    </>
  );
}

/** 陪玩数据（docx §3 陪玩数据字段）。 */
export function CompanionDataTable() {
  const { state } = useAdminStore();
  const q = useTableQuery<CompanionStat>(state.companionStats, { searchKeys: ['id', 'name'] });

  const handleExport = () =>
    exportCsv(
      '陪玩数据',
      ['陪玩ID', '昵称', '服务类型数量', '争议订单数', '访客数'],
      q.filtered.map((c) => [c.id, c.name, c.services, c.disputes, c.visitors]),
    );

  return (
    <>
      <DataFilterBar
        filters={[
          { label: '陪玩ID/昵称', value: q.keyword, onChange: q.setKeyword, placeholder: '查询陪玩ID或昵称' },
        ]}
        dateStart="" onDateStart={() => {}}
        onQuery={() => q.setPage(1)}
        onReset={q.reset} onExport={handleExport}
      />
      <DataTable
        columns={['陪玩ID', '昵称', '服务类型数量', '争议订单数', '访客数']}
        rows={q.pageItems.map((c) => [c.id, c.name, c.services, c.disputes, formatNumber(c.visitors)])}
        minWidth={720}
        emptyText="暂无陪玩数据"
        pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage }}
      />
    </>
  );
}
