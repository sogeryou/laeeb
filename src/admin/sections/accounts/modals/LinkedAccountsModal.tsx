import { ModalShell } from '../../../components';
import type { AdminUser } from '../../../types';

/** 查看该设备登录过的账号并跳转（docx §1.A 设备关联账号）。 */
export function LinkedAccountsModal({
  currentUser,
  linkedUsers,
  onClose,
  onSelect,
}: {
  currentUser: AdminUser;
  linkedUsers: AdminUser[];
  onClose: () => void;
  onSelect: (userId: string) => void;
}) {
  return (
    <ModalShell
      title="设备登录账号"
      subtitle={`该设备登录过的账号。当前账号：${currentUser.id} / ${currentUser.name}，DID：${currentUser.did}`}
      onClose={onClose}
    >
      <div className="grid gap-3">
        {linkedUsers.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => onSelect(user.id)}
            className="flex min-h-16 items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-950">
                {user.id} / {user.name}
              </span>
              <span className="mt-1 block text-xs font-bold text-slate-500">
                {user.role} · {user.status} · {user.country} · 该设备登录过 {user.linkedAccounts} 个账号
              </span>
            </span>
            <span className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
              进入账号管理
            </span>
          </button>
        ))}

        {linkedUsers.length === 0 && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
            暂无可查看的设备登录账号
          </div>
        )}
      </div>
    </ModalShell>
  );
}
