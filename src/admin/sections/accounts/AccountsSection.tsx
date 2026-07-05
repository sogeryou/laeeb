import { useEffect, useMemo, useState } from 'react';
import { Search, Smartphone } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { DataTable, Field, MiniActionButton, Panel, TextInput } from '../../components';
import { useAdminStore } from '../../store/useAdminStore';
import type { AdminUser } from '../../types';
import { AccountRecords } from './AccountRecords';
import { UserBasicInfo } from './UserBasicInfo';
import { emptyUserSearch, UserSearchBar, type UserSearchValues } from './UserSearchBar';

export type AccountTab = '用户信息' | '设备信息';
export const accountTabs: AccountTab[] = ['用户信息', '设备信息'];

const matchUser = (user: AdminUser, q: UserSearchValues): boolean => {
  const test = (field: string, value: string) =>
    !value.trim() || field.toLowerCase().includes(value.trim().toLowerCase());
  return (
    test(user.mid, q.mid) &&
    test(user.name, q.name) &&
    test(user.phone, q.phone) &&
    test(user.email, q.email)
  );
};

const hasQuery = (q: UserSearchValues) => Object.values(q).some((v) => v.trim());

function uniqueUsers(users: AdminUser[]) {
  const seen = new Set<string>();
  return users.filter((user) => {
    if (seen.has(user.id)) return false;
    seen.add(user.id);
    return true;
  });
}

function deviceUsers(allUsers: AdminUser[], linkedAccountIds: Record<string, string[]>, deviceId: string): AdminUser[] {
  const normalizedDeviceId = deviceId.trim().toLowerCase();
  if (!normalizedDeviceId) return [];
  const directUsers = allUsers.filter((user) => user.did.toLowerCase() === normalizedDeviceId);
  const linkedIds = directUsers.flatMap((user) => linkedAccountIds[user.id] ?? []);
  const linkedUsers = linkedIds
    .map((id) => allUsers.find((user) => user.id === id))
    .filter((user): user is AdminUser => Boolean(user));
  return uniqueUsers([...directUsers, ...linkedUsers]);
}

function deviceStatus(users: AdminUser[]) {
  if (users.some((user) => user.bans?.some((ban) => ban.dimensions.includes('设备')))) return '设备封禁';
  if (users.some((user) => user.status === '冻结')) return '存在冻结账号';
  if (users.some((user) => user.status === '风控中')) return '风控中';
  return users.length > 0 ? '正常' : '未查询到设备';
}

/** 账号管理（docx §1）：查询 + 基础信息 + 行为记录。 */
export function AccountsSection({
  activeTab,
  selectedUserId,
  selectedDeviceId,
  onSelectUser,
  onSelectDevice,
}: {
  activeTab: AccountTab;
  selectedUserId: string;
  selectedDeviceId: string;
  onSelectUser: (userId: string) => void;
  onSelectDevice: (deviceId: string) => void;
}) {
  if (activeTab === '设备信息') {
    return <DeviceInfoSection selectedDeviceId={selectedDeviceId} onSelectUser={onSelectUser} />;
  }
  return <UserInfoSection selectedUserId={selectedUserId} onSelectUser={onSelectUser} onSelectDevice={onSelectDevice} />;
}

function UserInfoSection({
  selectedUserId,
  onSelectUser,
  onSelectDevice,
}: {
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
  onSelectDevice: (deviceId: string) => void;
}) {
  const { state } = useAdminStore();
  const { toast } = useToast();
  const [search, setSearch] = useState<UserSearchValues>(emptyUserSearch);
  const [committed, setCommitted] = useState<UserSearchValues>(emptyUserSearch);

  const selectedUser = state.users.find((u) => u.id === selectedUserId) ?? state.users[0];
  const matches = useMemo(
    () => (hasQuery(committed) ? state.users.filter((u) => matchUser(u, committed)) : []),
    [state.users, committed],
  );

  const runSearch = () => {
    setCommitted(search);
    const found = state.users.filter((u) => matchUser(u, search));
    if (!hasQuery(search)) {
      toast('请输入查询条件', 'info');
    } else if (found.length === 0) {
      toast('未找到匹配用户', 'error');
    } else if (found.length === 1) {
      onSelectUser(found[0].id);
      setCommitted(emptyUserSearch);
      toast(`已定位用户 ${found[0].name}`, 'success');
    } else {
      toast(`匹配到 ${found.length} 个用户，请选择`, 'info');
    }
  };

  const reset = () => {
    setSearch(emptyUserSearch);
    setCommitted(emptyUserSearch);
  };

  return (
    <section className="space-y-5">
      <UserSearchBar values={search} onChange={setSearch} onSearch={runSearch} onReset={reset} />

      {matches.length > 1 && (
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-black text-slate-700">匹配结果（{matches.length}）</p>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  onSelectUser(user.id);
                  setCommitted(emptyUserSearch);
                }}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2.5 text-left hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-950">{user.id} / {user.name}</span>
                  <span className="text-xs font-bold text-slate-500">{user.role} · {user.country} · {user.status}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedUser && (
        <>
          <UserBasicInfo user={selectedUser} onSelectDevice={onSelectDevice} />
          <AccountRecords user={selectedUser} />
        </>
      )}
    </section>
  );
}

function DeviceInfoSection({
  selectedDeviceId,
  onSelectUser,
}: {
  selectedDeviceId: string;
  onSelectUser: (userId: string) => void;
}) {
  const { state } = useAdminStore();
  const { toast } = useToast();
  const [draftDeviceId, setDraftDeviceId] = useState(selectedDeviceId);
  const [committedDeviceId, setCommittedDeviceId] = useState(selectedDeviceId);

  useEffect(() => {
    setDraftDeviceId(selectedDeviceId);
    setCommittedDeviceId(selectedDeviceId);
  }, [selectedDeviceId]);

  const users = useMemo(
    () => deviceUsers(state.users, state.linkedAccountIds, committedDeviceId),
    [state.users, state.linkedAccountIds, committedDeviceId],
  );
  const status = deviceStatus(users);
  const deviceModel = users[0]?.device.split(' / ')[0] ?? '—';

  const runSearch = () => {
    const value = draftDeviceId.trim();
    if (!value) {
      toast('请输入设备号', 'info');
      return;
    }
    setCommittedDeviceId(value);
    const found = deviceUsers(state.users, state.linkedAccountIds, value);
    toast(found.length ? `查询到 ${found.length} 个登录账号` : '未查询到该设备登录账号', found.length ? 'success' : 'error');
  };

  const reset = () => {
    setDraftDeviceId('');
    setCommittedDeviceId('');
  };

  return (
    <section className="space-y-5">
      <Panel title="设备信息" icon={Smartphone}>
        <div className="mb-4 grid gap-3 rounded-md bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Field label="设备号">
            <TextInput value={draftDeviceId} onChange={setDraftDeviceId} placeholder="输入 DID / 设备号查询" />
          </Field>
          <div className="flex items-end gap-2">
            <button type="button" onClick={runSearch} className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800">
              <Search className="size-4" /> 查询
            </button>
            <button type="button" onClick={reset} className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
              重置
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-400">设备号</p>
            <p className="mt-1 text-sm font-black text-slate-950">{committedDeviceId || '—'}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-400">设备状态</p>
            <p className={`mt-1 text-sm font-black ${status === '正常' ? 'text-emerald-700' : 'text-rose-700'}`}>{status}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-400">设备型号</p>
            <p className="mt-1 text-sm font-black text-slate-950">{deviceModel}</p>
          </div>
        </div>

        <DataTable
          columns={['用户ID', '用户名', '当前身份', '账号状态', '最近登录', 'IP', '操作']}
          rows={users.map((user) => [
            <button type="button" onClick={() => onSelectUser(user.id)} className="font-black text-emerald-700 hover:underline">{user.id}</button>,
            user.name,
            user.role,
            user.status,
            `${user.lastLoginAt}(UTC+3)`,
            user.ip,
            <MiniActionButton label="查看账号信息" onClick={() => onSelectUser(user.id)} />,
          ])}
          emptyText="请输入设备号查询该设备登录过的账号"
        />
      </Panel>
    </section>
  );
}
