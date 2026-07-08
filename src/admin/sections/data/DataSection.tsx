import { useMemo, useState } from 'react';
import {
  BarChart3,
  ClipboardCheck,
  CreditCard,
  Download,
  Gem,
  Gift,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import { DataTable, Field, Panel, SelectInput, TextInput } from '../../components';
import { useAdminStore } from '../../store/useAdminStore';
import { exportXlsx } from '../../utils/exportXlsx';
import { formatNumber } from '../../utils/format';
import { OrderDataTable, RechargeDataTable, WithdrawDataTable } from './DataTables';
import { buildDashboardRows, buildDashboardTotal, quickDashboardRange, type DashboardMetricRow, type DataViewMode, type QuickRange } from './dataDashboard';

export const dataTabs = ['大盘数据', '明细数据'] as const;
export type DataTab = (typeof dataTabs)[number];

const detailTabs = ['充值数据', '订单数据', '提现数据'] as const;
type DetailTab = (typeof detailTabs)[number];

const dashboardHeaders = ['日期', '充值金币', '提现钻石', '注册人数', '新增陪玩', '下单人数', '订单数量', '订单消费金币', '送礼消费金币'];

const rowToExport = (row: DashboardMetricRow) => [
  row.day,
  row.rechargeCoins,
  row.withdrawDiamonds,
  row.registrations,
  row.newCompanions,
  row.orderUsers,
  row.orderCount,
  row.orderSpendCoins,
  row.giftSpendCoins,
];

const metricCards = [
  { key: 'rechargeCoins', label: '充值金币', icon: CreditCard },
  { key: 'withdrawDiamonds', label: '提现钻石', icon: Gem },
  { key: 'registrations', label: '注册人数', icon: Users },
  { key: 'newCompanions', label: '新增陪玩', icon: Sparkles },
  { key: 'orderUsers', label: '下单人数', icon: UserCheck },
  { key: 'orderCount', label: '订单数量', icon: ClipboardCheck },
  { key: 'orderSpendCoins', label: '订单消费金币', icon: BarChart3 },
  { key: 'giftSpendCoins', label: '送礼消费金币', icon: Gift },
] as const;

/** 数据系统。左侧一级菜单拆分为大盘数据 / 明细数据。 */
export function DataSection({ activeTab }: { activeTab: DataTab }) {
  return (
    <section className="space-y-5">
      {activeTab === '大盘数据' && <DashboardDataPanel />}
      {activeTab === '明细数据' && <DetailDataPanel />}
    </section>
  );
}

function DashboardDataPanel() {
  const { state } = useAdminStore();
  const defaultRange = useMemo(() => quickDashboardRange(state, '当天'), [state]);
  const [viewMode, setViewMode] = useState<DataViewMode>('合计');
  const [quickRange, setQuickRange] = useState('当天');
  const [start, setStart] = useState(defaultRange.start);
  const [end, setEnd] = useState(defaultRange.end);

  const dailyRows = useMemo(() => buildDashboardRows(state, start, end), [state, start, end]);
  const total = useMemo(() => buildDashboardTotal(state, start, end), [state, start, end]);
  const exportRows = viewMode === '合计' ? [total] : dailyRows;
  const applyQuickRange = (range: QuickRange) => {
    const next = quickDashboardRange(state, range);
    setQuickRange(range);
    setStart(next.start);
    setEnd(next.end);
  };

  const handleExport = () => {
    exportXlsx(
      viewMode === '合计' ? '大盘数据-合计.xlsx' : '大盘数据-按天.xlsx',
      dashboardHeaders,
      exportRows.map(rowToExport),
    );
  };

  return (
    <Panel title="大盘数据" icon={BarChart3}>
      <div className="mb-4 grid gap-3 rounded-md bg-slate-50 p-3 xl:grid-cols-[160px_160px_1fr_1fr_auto]">
        <Field label="展示维度">
          <SelectInput value={viewMode} onChange={(value) => setViewMode(value as DataViewMode)} options={['合计', '按天']} />
        </Field>
        <Field label="快捷时间">
          <SelectInput
            value={quickRange}
            onChange={(value) => {
              if (value === '自定义') {
                setQuickRange(value);
                return;
              }
              applyQuickRange(value as QuickRange);
            }}
            options={['自定义', '当天', '本周', '本月']}
          />
        </Field>
        <Field label="开始日期">
          <TextInput type="date" value={start} onChange={(value) => { setQuickRange('自定义'); setStart(value); }} />
        </Field>
        <Field label="结束日期">
          <TextInput type="date" value={end} onChange={(value) => { setQuickRange('自定义'); setEnd(value); }} />
        </Field>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => {
              setQuickRange('自定义');
              setStart('');
              setEnd('');
            }}
            className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            重置
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800"
          >
            <Download className="size-4" /> 导出
          </button>
        </div>
      </div>

      {viewMode === '合计' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((item) => (
            <div key={item.key} className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">{item.label}</p>
                <item.icon className="size-4 text-emerald-700" />
              </div>
              <p className="mt-2 text-xl font-black text-slate-950">{formatNumber(total[item.key])}</p>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={dashboardHeaders}
          rows={dailyRows.map((row) => [
            row.day,
            formatNumber(row.rechargeCoins),
            formatNumber(row.withdrawDiamonds),
            formatNumber(row.registrations),
            formatNumber(row.newCompanions),
            formatNumber(row.orderUsers),
            formatNumber(row.orderCount),
            formatNumber(row.orderSpendCoins),
            formatNumber(row.giftSpendCoins),
          ])}
          minWidth={1120}
          emptyText="暂无大盘数据"
        />
      )}
    </Panel>
  );
}

function DetailDataPanel() {
  const [tab, setTab] = useState<DetailTab>('充值数据');

  return (
    <Panel title="明细数据" icon={BarChart3}>
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {detailTabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`h-10 shrink-0 border-b-2 px-4 text-sm font-black ${
              tab === item ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === '充值数据' && <RechargeDataTable />}
      {tab === '订单数据' && <OrderDataTable />}
      {tab === '提现数据' && <WithdrawDataTable />}
    </Panel>
  );
}
