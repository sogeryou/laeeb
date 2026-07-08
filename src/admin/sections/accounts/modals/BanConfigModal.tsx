import { useState } from 'react';
import { ModalShell } from '../../../components';
import type { AdminUser, BanDimension, BanModule } from '../../../types';

const dimensions: BanDimension[] = ['账号', '设备'];
const banModules: BanModule[] = ['账号', '下单', '接单', '充值', '提现', '私聊', '动态'];

/** 封禁配置（docx §2.B：封禁维度 × 封禁模块）。 */
export function BanConfigModal({
  user,
  mode = 'ban',
  onClose,
  onConfirm,
}: {
  user: AdminUser;
  mode?: 'ban' | 'unban';
  onClose: () => void;
  onConfirm: (payload: { dimensions: BanDimension[]; modules: BanModule[]; reason: string }) => void;
}) {
  const [selectedDimensions, setSelectedDimensions] = useState<BanDimension[]>(['账号']);
  const [selectedModules, setSelectedModules] = useState<BanModule[]>(['账号']);
  const [reason, setReason] = useState('');
  const isBanMode = mode === 'ban';
  const actionText = isBanMode ? '封禁' : '解封';
  const includesAccountDimension = selectedDimensions.includes('账号');
  const includesDeviceDimension = selectedDimensions.includes('设备');

  const toggle = <T,>(list: T[], item: T, setter: (next: T[]) => void) => {
    if (list.includes(item)) {
      if (list.length === 1) return;
      setter(list.filter((value) => value !== item));
    } else {
      setter([...list, item]);
    }
  };

  return (
    <ModalShell
      title={`${actionText}配置`}
      subtitle={`${user.id} / ${user.name} · DID：${user.did}`}
      onClose={onClose}
      onConfirm={() => onConfirm({ dimensions: selectedDimensions, modules: includesAccountDimension ? selectedModules : ['账号'], reason })}
      confirmText={`确认${actionText}`}
      footerTone={isBanMode ? 'danger' : 'success'}
      maxWidth="max-w-xl"
    >
      <fieldset>
        <legend className="mb-2 text-sm font-black text-slate-700">{actionText}维度</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {dimensions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggle(selectedDimensions, item, setSelectedDimensions)}
              className={`h-11 rounded-md border px-3 text-sm font-black ${
                selectedDimensions.includes(item)
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </fieldset>

      {isBanMode && includesAccountDimension && (
        <fieldset>
          <legend className="mb-2 text-sm font-black text-slate-700">封禁模块</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {banModules.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggle(selectedModules, item, setSelectedModules)}
                className={`h-11 rounded-md border px-3 text-sm font-black ${
                  selectedModules.includes(item)
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {isBanMode && includesDeviceDimension && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-700">
          设备维度默认封禁登录：该设备上无法登录任何账号，无需选择封禁模块。
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-black text-slate-700">{actionText}原因</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-20 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          placeholder={`填写${actionText}原因（选填）`}
        />
      </label>

      <div className={`rounded-md border px-3 py-2 text-xs font-bold leading-5 ${
        isBanMode ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      }`}>
        {isBanMode
          ? `账号封禁后该账号在任何设备都无法登录；设备封禁后该设备上的任何账号都无法登录；同时选择则两者叠加生效。当前将按「${selectedDimensions.join('、')}」维度封禁${includesAccountDimension ? `「${selectedModules.join('、')}」模块` : '登录'}。`
          : `账号解封只解除当前账号限制；设备解封会解除该设备上的登录限制；同时选择则两者一起解除。当前将按「${selectedDimensions.join('、')}」维度解除封禁。`}
      </div>
    </ModalShell>
  );
}
