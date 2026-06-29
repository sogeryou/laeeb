import { useMemo, useState } from 'react';
import { useToast } from '../../components/Toast';
import { useAdminStore } from '../../store/useAdminStore';
import type { AdminUser } from '../../types';
import { AccountRecords } from './AccountRecords';
import { UserBasicInfo } from './UserBasicInfo';
import { emptyUserSearch, UserSearchBar, type UserSearchValues } from './UserSearchBar';

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

/** 账号管理（docx §1）：查询 + 基础信息 + 行为记录。 */
export function AccountsSection({
  selectedUserId,
  onSelectUser,
}: {
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
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
          <UserBasicInfo user={selectedUser} onSelectUser={onSelectUser} />
          <AccountRecords user={selectedUser} />
        </>
      )}
    </section>
  );
}
