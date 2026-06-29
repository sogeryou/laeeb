import { useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { DataTable, Field, MiniActionButton, ModalShell, Panel, RiskBadge, SelectInput, TextInput } from '../../components';
import { useToast } from '../../components/Toast';
import { useTableQuery } from '../../hooks/useTableQuery';
import { useAdminStore } from '../../store/useAdminStore';
import type { RiskHit } from '../../types';

const categoryOptions = ['全部', '退款', '高频充值', '设备关联', '私下交易'];
const levelOptions = ['全部', '高', '中', '低'];

/** 风控监控（docx §4：充值风控 退款/高频充值）。 */
export function RiskSection() {
  const { state, dispatch } = useAdminStore();
  const { toast } = useToast();
  const [handleRow, setHandleRow] = useState<RiskHit | null>(null);

  const q = useTableQuery<RiskHit>(state.riskHits, {
    searchKeys: ['userId', 'userName', 'reason'],
    typeKey: 'category',
    dateKey: 'time',
  });
  // 复用 status 槽位承载"等级"筛选。
  const levelFiltered = q.pageItems.filter((r) => q.status === '全部' || r.level === q.status);

  return (
    <section className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
      <Panel title="风控规则" icon={ShieldAlert}>
        <div className="space-y-3">
          <RiskRule title="退款风险" desc="历史退款、同设备退款账号、充值后取消订单。" level="高" />
          <RiskRule title="高频充值" desc="短时间多笔充值、充值金额异常递增、渠道失败重试。" level="高" />
          <RiskRule title="设备关联" desc="同 DID 关联多账号，同 IP 批量注册或批量下单。" level="中" />
          <RiskRule title="私下交易" desc="私聊、动态、服务介绍中出现外部联系方式。" level="中" />
        </div>
      </Panel>

      <Panel title="充值风控命中" icon={AlertTriangle}>
        <div className="mb-4 grid gap-3 rounded-md bg-slate-50 p-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
          <Field label="搜索（ID/昵称/原因）">
            <TextInput value={q.keyword} onChange={q.setKeyword} placeholder="输入关键字" />
          </Field>
          <Field label="风控类型">
            <SelectInput value={q.type} onChange={q.setType} options={categoryOptions} />
          </Field>
          <Field label="风险等级">
            <SelectInput value={q.status} onChange={q.setStatus} options={levelOptions} />
          </Field>
          <div className="flex items-end">
            <button type="button" onClick={q.reset} className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
              重置
            </button>
          </div>
        </div>

        <DataTable
          columns={['时间', '用户ID&昵称', '充值金额', '累充金额', '触发原因', '等级', '状态', '操作']}
          rows={levelFiltered.map((row) => [
            row.time,
            `${row.userId} / ${row.userName}`,
            row.amount,
            row.total,
            row.reason,
            <RiskBadge level={row.level} />,
            row.handled ? <span className="text-xs font-black text-emerald-700">已处置</span> : <span className="text-xs font-black text-amber-700">待处置</span>,
            row.handled
              ? <span className="text-xs font-bold text-slate-400">—</span>
              : <MiniActionButton label="处置" tone="danger" onClick={() => setHandleRow(row)} />,
          ])}
          minWidth={1000}
          emptyText="暂无风控命中"
          pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage }}
        />
      </Panel>

      {handleRow && (
        <RiskHandleModal
          row={handleRow}
          onClose={() => setHandleRow(null)}
          onConfirm={(ban) => {
            dispatch({ type: 'RISK_HANDLE', payload: { id: handleRow.id, ban } });
            toast(ban ? `已处置并封禁 ${handleRow.userName}` : `已标记处置 ${handleRow.userName}`, ban ? 'error' : 'success');
            setHandleRow(null);
          }}
        />
      )}
    </section>
  );
}

function RiskHandleModal({
  row,
  onClose,
  onConfirm,
}: {
  row: RiskHit;
  onClose: () => void;
  onConfirm: (ban: boolean) => void;
}) {
  const [ban, setBan] = useState(row.level === '高');

  return (
    <ModalShell
      title="风控处置"
      subtitle={`${row.userId} / ${row.userName} · ${row.category} · ${row.level}风险`}
      onClose={onClose}
      onConfirm={() => onConfirm(ban)}
      confirmText="确认处置"
      footerTone={ban ? 'danger' : 'success'}
      maxWidth="max-w-lg"
    >
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-700">
        触发原因：{row.reason}
      </div>
      <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3">
        <input type="checkbox" checked={ban} onChange={(e) => setBan(e.target.checked)} className="size-4 accent-rose-600" />
        <span className="text-sm font-black text-slate-800">同时冻结该账号（封禁充值）</span>
      </label>
    </ModalShell>
  );
}

function RiskRule({ title, desc, level }: { title: string; desc: string; level: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-black text-slate-950">{title}</p>
        <RiskBadge level={level} />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
    </div>
  );
}
