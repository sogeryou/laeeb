import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  Database,
  Gem,
  Gift,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { Panel } from '../../components';
import { useAdminStore } from '../../store/useAdminStore';
import { selectFinanceMetric } from '../../store/reducer';
import { formatNumber } from '../../utils/format';
import { CompanionDataTable, OrderDataTable, RechargeDataTable, WithdrawDataTable } from './DataTables';

const dataTabs = ['充值数据', '订单数据', '提现数据', '陪玩数据'] as const;
type DataTab = (typeof dataTabs)[number];

/** 数据系统（docx §3）。 */
export function DataSection() {
  const { state } = useAdminStore();
  const [tab, setTab] = useState<DataTab>('充值数据');
  const finance = useMemo(() => selectFinanceMetric(state), [state]);

  const orderTrend = useMemo(() => {
    const count = (predicate: (s: string) => boolean) => state.orders.filter((o) => predicate(o.status)).length;
    return [
      { type: '完成', count: count((s) => s === '已完成') },
      { type: '进行中', count: count((s) => s === '进行中' || s === '待确认') },
      { type: '取消', count: count((s) => s === '已取消') },
      { type: '纠纷', count: count((s) => s === '纠纷中') },
    ];
  }, [state.orders]);

  const financeCards = [
    { label: '总充值金币', value: formatNumber(finance.totalRechargeCoins), icon: CreditCard },
    { label: '充值人数', value: formatNumber(finance.rechargeUsers), icon: Users },
    { label: '下单人数', value: formatNumber(finance.orderUsers), icon: UserCheck },
    { label: '完成订单数', value: formatNumber(finance.completedOrders), icon: ClipboardCheck },
    { label: '完成订单金币', value: formatNumber(finance.completedOrderCoins), icon: CircleDollarSign },
    { label: '送礼金币数', value: formatNumber(finance.giftCoins), icon: Gift },
    { label: '钻石收入', value: formatNumber(finance.diamondIncome), icon: Gem },
    { label: '平台资产余额', value: `${formatNumber(finance.platformCoinBalance)} 金币 / ${formatNumber(finance.platformDiamondBalance)} 钻石`, icon: Wallet },
  ];

  return (
    <section className="space-y-5">
      <SummaryStrip />

      <Panel title="财务大盘" icon={Database}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {financeCards.map((item) => (
            <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">{item.label}</p>
                <item.icon className="size-4 text-emerald-700" />
              </div>
              <p className="mt-2 text-xl font-black text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel title="充值数据" icon={TrendingUp}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={state.rechargeTrend} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="rechargeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip />
                <Area type="monotone" dataKey="amount" name="充值美金" stroke="#059669" strokeWidth={3} fill="url(#rechargeGradient)" />
                <Area type="monotone" dataKey="users" name="充值人数" stroke="#0f172a" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="订单状态分布" icon={ClipboardCheck}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderTrend} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="type" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {orderTrend.map((entry) => (
                    <Cell key={entry.type} fill={entry.type === '纠纷' ? '#e11d48' : entry.type === '取消' ? '#94a3b8' : '#059669'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="数据明细" icon={BarChart3}>
        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
          {dataTabs.map((item) => (
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
        {tab === '陪玩数据' && <CompanionDataTable />}
      </Panel>
    </section>
  );
}

function SummaryStrip() {
  const { state } = useAdminStore();
  const certifiedCompanions = state.companionServices.filter((c) => c.audit === '已认证').length;
  const unhandledRisk = state.riskHits.filter((r) => !r.handled).length;
  const todayRecharge = state.rechargeTrend.at(-1)?.amount ?? 0;

  const summaries = [
    { label: '注册用户', value: '148,920', change: '+2.8%', icon: Users },
    { label: '认证陪玩', value: `${certifiedCompanions + 8741}`, change: '+1.4%', icon: Sparkles },
    { label: '今日充值', value: `$${formatNumber(todayRecharge)}`, change: '+16.1%', icon: TrendingUp },
    { label: '风险命中', value: `${unhandledRisk}`, change: '待处理', icon: ShieldAlert },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {summaries.map((item) => (
        <div key={item.label} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-500">{item.label}</p>
            <div className="grid size-9 place-items-center rounded-md bg-emerald-50 text-emerald-700">
              <item.icon className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-2xl font-black text-slate-950">{item.value}</p>
            <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">{item.change}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
