import { useMemo, useState } from 'react';
import { Badge, DataTable, Field, SelectInput, TextInput } from '../../components';
import { useTableQuery } from '../../hooks/useTableQuery';
import { useAdminStore } from '../../store/useAdminStore';
import type { AdminUser, LedgerAsset, LedgerRow, OrderRow } from '../../types';
import { formatNumber, formatSigned, getServiceCategory } from '../../utils/format';
import { secondaryBtnClass } from '../../utils/ui';

const tabs = ['金币流水', '钻石流水', '订单记录'] as const;
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
        {tab === '订单记录' && <OrderRecords user={user} />}
      </div>
    </section>
  );
}

function LedgerRecords({ user, asset }: { user: AdminUser; asset: LedgerAsset }) {
  const { state } = useAdminStore();
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [draftType, setDraftType] = useState('全部');
  const source = useMemo(
    () => state.ledgers.filter((row) => row.userId.startsWith(user.id) && row.asset === asset),
    [state.ledgers, user.id, asset],
  );
  const typeOptions = useMemo(() => ['全部', ...new Set(source.map((r) => r.type))], [source]);
  const q = useTableQuery<LedgerRow>(source, { typeKey: 'type', dateKey: 'time', searchKeys: ['type', 'reference'] });
  const unit = asset === '钻石' ? '钻石' : '金币';
  const runQuery = () => {
    q.setType(draftType);
    q.setDateRange({ start: draftStart, end: draftEnd });
  };
  const reset = () => {
    setDraftStart('');
    setDraftEnd('');
    setDraftType('全部');
    q.reset();
  };

  return (
    <div className="space-y-4">
      <LedgerFilterBar
        typeOptions={typeOptions}
        type={draftType}
        onType={setDraftType}
        dateStart={draftStart}
        dateEnd={draftEnd}
        onDateStart={setDraftStart}
        onDateEnd={setDraftEnd}
        onQuery={runQuery}
        onReset={reset}
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

function OrderRecords({ user }: { user: AdminUser }) {
  const { state } = useAdminStore();
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [draftStatus, setDraftStatus] = useState('全部');
  const source = useMemo(
    () => state.orders.filter((o) => o.userId === user.id || o.epalId === user.id),
    [state.orders, user.id],
  );
  const q = useTableQuery<OrderRow>(source, {
    dateKey: 'time',
    statusKey: 'status',
    searchKeys: ['id', 'userId', 'userName', 'epalId', 'epalName', 'service'],
  });
  const statusOptions = useMemo(() => ['全部', ...new Set(source.map((o) => o.status))], [source]);
  const runQuery = () => {
    q.setStatus(draftStatus);
    q.setDateRange({ start: draftStart, end: draftEnd });
  };
  const reset = () => {
    setDraftStart('');
    setDraftEnd('');
    setDraftStatus('全部');
    q.reset();
  };

  return (
    <div className="space-y-4">
      <OrderFilterBar
        statusOptions={statusOptions}
        status={draftStatus}
        onStatus={setDraftStatus}
        dateStart={draftStart}
        dateEnd={draftEnd}
        onDateStart={setDraftStart}
        onDateEnd={setDraftEnd}
        onQuery={runQuery}
        onReset={reset}
      />
      <DataTable
        columns={['时间', '订单ID', '用户ID', '用户昵称', '陪玩ID', '陪玩昵称', '服务大类', '单价', '数量', '总额', '订单状态']}
        rows={q.pageItems.map((o) => [
          o.time,
          o.id,
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
        emptyText="暂无订单记录"
        pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage }}
      />
    </div>
  );
}

function LedgerFilterBar({
  typeOptions,
  type,
  onType,
  dateStart,
  dateEnd,
  onDateStart,
  onDateEnd,
  onQuery,
  onReset,
}: {
  typeOptions: string[];
  type: string;
  onType: (v: string) => void;
  dateStart: string;
  dateEnd: string;
  onDateStart: (v: string) => void;
  onDateEnd: (v: string) => void;
  onQuery: () => void;
  onReset: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-md bg-slate-50 p-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
      <Field label="开始时间">
        <TextInput type="datetime-local" step="1" value={dateStart} onChange={onDateStart} />
      </Field>
      <Field label="结束时间">
        <TextInput type="datetime-local" step="1" value={dateEnd} onChange={onDateEnd} />
      </Field>
      <Field label="类型">
        <SelectInput value={type} onChange={onType} options={typeOptions} />
      </Field>
      <div className="flex items-end gap-2">
        <button type="button" onClick={onQuery} className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800">
          查询
        </button>
        <button type="button" onClick={onReset} className={`${secondaryBtnClass} h-10`}>
          重置
        </button>
      </div>
    </div>
  );
}

function OrderFilterBar({
  statusOptions,
  status,
  onStatus,
  dateStart,
  dateEnd,
  onDateStart,
  onDateEnd,
  onQuery,
  onReset,
}: {
  statusOptions: string[];
  status: string;
  onStatus: (v: string) => void;
  dateStart: string;
  dateEnd: string;
  onDateStart: (v: string) => void;
  onDateEnd: (v: string) => void;
  onQuery: () => void;
  onReset: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-md bg-slate-50 p-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
      <Field label="开始时间">
        <TextInput type="datetime-local" step="1" value={dateStart} onChange={onDateStart} />
      </Field>
      <Field label="结束时间">
        <TextInput type="datetime-local" step="1" value={dateEnd} onChange={onDateEnd} />
      </Field>
      <Field label="订单状态">
        <SelectInput value={status} onChange={onStatus} options={statusOptions} />
      </Field>
      <div className="flex items-end gap-2">
        <button type="button" onClick={onQuery} className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800">
          查询
        </button>
        <button type="button" onClick={onReset} className={`${secondaryBtnClass} h-10`}>
          重置
        </button>
      </div>
    </div>
  );
}
