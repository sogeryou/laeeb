import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Gamepad2,
  LayoutDashboard,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { ToastProvider } from './components/Toast';
import { AdminStoreProvider } from './store/AdminStoreContext';
import { useAdminStore } from './store/useAdminStore';
import { AccountsSection, accountTabs, type AccountTab } from './sections/accounts/AccountsSection';
import { OperationsSection, type OperationTab, operationTabs } from './sections/operations/OperationsSection';
import { CompanionSection, companionTabs } from './sections/operations/CompanionOpsPanel';
import { DataSection, dataTabs, type DataTab } from './sections/data/DataSection';
import { RiskSection } from './sections/risk/RiskSection';

type AdminSection = 'accounts' | 'operations' | 'companions' | 'data' | 'risk';
type AccountTabState = AccountTab;
type CompanionTab = (typeof companionTabs)[number];

const navItems = [
  { id: 'accounts' as const, label: '账号管理', icon: Users },
  { id: 'operations' as const, label: '后台操作', icon: ShieldCheck },
  { id: 'companions' as const, label: '陪玩管理', icon: Sparkles },
  { id: 'data' as const, label: '数据系统', icon: BarChart3 },
  { id: 'risk' as const, label: '风控监控', icon: ShieldAlert },
];

function AdminShell() {
  const { state } = useAdminStore();
  const [section, setSection] = useState<AdminSection>('accounts');
  const [accountTab, setAccountTab] = useState<AccountTabState>('用户信息');
  const [operationTab, setOperationTab] = useState<OperationTab>('资产管理');
  const [companionTab, setCompanionTab] = useState<CompanionTab>('陪玩管理');
  const [dataTab, setDataTab] = useState<DataTab>('大盘数据');
  const [selectedUserId, setSelectedUserId] = useState(state.users[0]?.id ?? '');
  const [selectedDeviceId, setSelectedDeviceId] = useState(state.users[0]?.did ?? '');

  const pendingWithdrawals = state.withdrawals.filter((w) => w.status === '待审核').length;
  const pendingDisputes = state.disputes.filter((d) => d.status !== '已处理').length;
  const pendingRisks = state.riskHits.filter((r) => !r.handled).length;

  return (
    <main className="min-h-dvh bg-[#f6f7f4] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="grid size-11 place-items-center rounded-lg bg-emerald-600 text-white">
            <Gamepad2 className="size-5" />
          </div>
          <div>
            <p className="text-lg font-black leading-tight">LAEEB OPS</p>
            <p className="text-xs font-medium text-slate-500">陪玩运营后台</p>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => setSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold transition ${
                  section === item.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
              {item.id === 'operations' && section === 'operations' && (
                <div className="mt-1 space-y-1 pl-7">
                  {operationTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setSection('operations');
                        setOperationTab(tab);
                      }}
                      className={`flex h-9 w-full items-center rounded-md px-3 text-left text-xs font-black transition ${
                        operationTab === tab ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}
              {item.id === 'accounts' && section === 'accounts' && (
                <div className="mt-1 space-y-1 pl-7">
                  {accountTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setSection('accounts');
                        setAccountTab(tab);
                      }}
                      className={`flex h-9 w-full items-center rounded-md px-3 text-left text-xs font-black transition ${
                        accountTab === tab ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}
              {item.id === 'companions' && section === 'companions' && (
                <div className="mt-1 space-y-1 pl-7">
                  {companionTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setSection('companions');
                        setCompanionTab(tab);
                      }}
                      className={`flex h-9 w-full items-center rounded-md px-3 text-left text-xs font-black transition ${
                        companionTab === tab ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}
              {item.id === 'data' && section === 'data' && (
                <div className="mt-1 space-y-1 pl-7">
                  {dataTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setSection('data');
                        setDataTab(tab);
                      }}
                      className={`flex h-9 w-full items-center rounded-md px-3 text-left text-xs font-black transition ${
                        dataTab === tab ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="absolute bottom-5 left-4 right-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-sm font-black text-amber-800">
            <AlertTriangle className="size-4" />
            今日待处理
          </div>
          <p className="mt-2 text-xs leading-5 text-amber-700">
            提现 {pendingWithdrawals} 笔、纠纷 {pendingDisputes} 起、充值风控 {pendingRisks} 条需要运营复核。
          </p>
        </div>
      </aside>

      <section className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur xl:px-8">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <LayoutDashboard className="size-4" />
                运营后台 / {navItems.find((item) => item.id === section)?.label}
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">陪玩平台运营控制台</h1>
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-bold ${
                  section === item.id ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-700'
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="space-y-5 px-4 py-5 xl:px-8">
          {section === 'accounts' && (
            <AccountsSection
              activeTab={accountTab}
              selectedUserId={selectedUserId}
              selectedDeviceId={selectedDeviceId}
              onSelectUser={(userId) => {
                setSelectedUserId(userId);
                setAccountTab('用户信息');
                setSection('accounts');
              }}
              onSelectDevice={(deviceId) => {
                setSelectedDeviceId(deviceId);
                setAccountTab('设备信息');
                setSection('accounts');
              }}
            />
          )}
          {section === 'operations' && <OperationsSection activeTab={operationTab} />}
          {section === 'companions' && <CompanionSection activeTab={companionTab} />}
          {section === 'data' && <DataSection activeTab={dataTab} />}
          {section === 'risk' && <RiskSection />}
        </div>
      </section>
    </main>
  );
}

export default function AdminApp() {
  return (
    <ToastProvider>
      <AdminStoreProvider>
        <AdminShell />
      </AdminStoreProvider>
    </ToastProvider>
  );
}
