import { Download } from 'lucide-react';
import { useMemo } from 'react';
import { Badge, DataTable, Field, SelectInput, TextInput } from '../../components';
import { useTableQuery } from '../../hooks/useTableQuery';
import { useAdminStore } from '../../store/useAdminStore';
import type { CompanionStat, OrderRow, RechargeRecord, WithdrawalRow } from '../../types';
import { exportCsv } from '../../utils/csv';
import { diamondsToUsd, formatNumber, formatUsd, getServiceCategory } from '../../utils/format';

/** 数据系统筛选条（ID/时间/类型，docx §3）。 */
function DataFilterBar({
  keyword,
  onKeyword,
  typeLabel,
  typeOptions,
  type,
  onType,
  dateStart,
  onDateStart,
  onReset,
  onExport,
}: {
  keyword: string;
  onKeyword: (v: string) => void;
  typeLabel?: string;
  typeOptions?: string[];
  type?: string;
  onType?: (v: string) => void;
  dateStart: string;
  onDateStart: (v: string) => void;
  onReset: () => void;
  onExport: () => void;
}) {
  return (
    <div className="mb-4 grid gap-3 rounded-md bg-slate-50 p-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
      <Field label="搜索（ID/昵称/单号）">
        <TextInput value={keyword} onChange={onKeyword} placeholder="输入关键字" />
      </Field>
      {typeOptions && onType ? (
        <Field label={typeLabel ?? '类型'}>
          <SelectInput value={type ?? '全部'} onChange={onType} options={typeOptions} />
        </Field>
      ) : (
        <div />
      )}
      <Field label="日期(起)">
        <TextInput type="date" value={dateStart} onChange={onDateStart} />
      </Field>
      <div className="flex items-end gap-2">
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
  const platformOptions = useMemo(() => ['全部', ...new Set(state.rechargeRecords.map((r) => r.platform))], [state.rechargeRecords]);
  const q = useTableQuery<RechargeRecord>(state.rechargeRecords, {
    searchKeys: ['userId', 'userName', 'innerOrderNo', 'outerOrderNo'],
    typeKey: 'platform',
    dateKey: 'time',
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
        keyword={q.keyword} onKeyword={q.setKeyword}
        typeLabel="充值平台" typeOptions={platformOptions} type={q.type} onType={q.setType}
        dateStart={q.dateRange.start ?? ''} onDateStart={(v) => q.setDateRange({ ...q.dateRange, start: v })}
        onReset={q.reset} onExport={handleExport}
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
  const statusOptions = useMemo(() => ['全部', ...new Set(state.orders.map((o) => o.status))], [state.orders]);
  const q = useTableQuery<OrderRow>(state.orders, {
    searchKeys: ['userId', 'userName', 'epalId', 'epalName', 'service'],
    statusKey: 'status',
    dateKey: 'time',
  });

  const handleExport = () =>
    exportCsv(
      '订单数据',
      ['时间', '用户ID', '用户昵称', '陪玩ID', '陪玩昵称', '服务大类', '单价', '数量', '总额', '订单状态'],
      q.filtered.map((o) => [o.time, o.userId, o.userName, o.epalId, o.epalName, getServiceCategory(o.service), o.unitPrice, o.quantity, o.total, o.status]),
    );

  return (
    <>
      <DataFilterBar
        keyword={q.keyword} onKeyword={q.setKeyword}
        typeLabel="订单状态" typeOptions={statusOptions} type={q.status} onType={q.setStatus}
        dateStart={q.dateRange.start ?? ''} onDateStart={(v) => q.setDateRange({ ...q.dateRange, start: v })}
        onReset={q.reset} onExport={handleExport}
      />
      <DataTable
        columns={['时间', '用户ID', '用户昵称', '陪玩ID', '陪玩昵称', '服务大类', '单价', '数量', '总额', '订单状态']}
        rows={q.pageItems.map((o) => [o.time, o.userId, o.userName, o.epalId, o.epalName, getServiceCategory(o.service), `${o.unitPrice} 金币`, o.quantity, `${o.total} 金币`, <Badge label={o.status} />])}
        minWidth={1000}
        emptyText="暂无订单数据"
        pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage }}
      />
    </>
  );
}

/** 提现数据（docx §3 提现数据：提现钻石数/手续费/实发美金）。 */
export function WithdrawDataTable() {
  const { state } = useAdminStore();
  const q = useTableQuery<WithdrawalRow>(state.withdrawals, {
    searchKeys: ['userId', 'userName', 'orderId'],
    statusKey: 'status',
    dateKey: 'requestedAt',
  });

  const handleExport = () =>
    exportCsv(
      '提现数据',
      ['申请时间', '用户ID', '昵称', '提现钻石数', '手续费', '实发美金', '提现状态'],
      q.filtered.map((w) => [w.requestedAt, w.userId, w.userName, w.diamonds, formatUsd(w.fee), formatUsd(w.netUsd), w.status]),
    );

  return (
    <>
      <DataFilterBar
        keyword={q.keyword} onKeyword={q.setKeyword}
        typeLabel="提现状态" typeOptions={['全部', '待审核', '复核中', '已通过', '已拒绝']} type={q.status} onType={q.setStatus}
        dateStart={q.dateRange.start ?? ''} onDateStart={(v) => q.setDateRange({ ...q.dateRange, start: v })}
        onReset={q.reset} onExport={handleExport}
      />
      <DataTable
        columns={['申请时间', '用户ID', '昵称', '提现钻石数(美金)', '手续费', '实发美金', '提现状态']}
        rows={q.pageItems.map((w) => [w.requestedAt, w.userId, w.userName, `${formatNumber(w.diamonds)} (${formatUsd(diamondsToUsd(w.diamonds))})`, formatUsd(w.fee), formatUsd(w.netUsd), <Badge label={w.status} />])}
        minWidth={900}
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
        keyword={q.keyword} onKeyword={q.setKeyword}
        dateStart="" onDateStart={() => {}}
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
