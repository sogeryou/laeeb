import { useState } from 'react';
import { ModalShell } from '../../../components';
import type { AdminUser, BanDimension, BanModule } from '../../../types';

const dimensions: BanDimension[] = ['账号', '设备'];
const banModules: BanModule[] = ['账号', '下单', '接单', '充值', '提现', '私聊', '动态'];

/** 封禁配置（docx §2.B：封禁维度 × 封禁模块）。 */
export function BanConfigModal({
  user,
  onClose,
  onConfirm,
}: {
  user: AdminUser;
  onClose: () => void;
  onConfirm: (payload: { dimensions: BanDimension[]; modules: BanModule[]; reason: string }) => void;
}) {
  const [selectedDimensions, setSelectedDimensions] = useState<BanDimension[]>(['账号']);
  const [selectedModules, setSelectedModules] = useState<BanModule[]>(['账号']);
  const [reason, setReason] = useState('');

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
      title="封禁配置"
      subtitle={`${user.id} / ${user.name} · DID：${user.did}`}
      onClose={onClose}
      onConfirm={() => onConfirm({ dimensions: selectedDimensions, modules: selectedModules, reason })}
      confirmText="确认封禁"
      footerTone="danger"
      maxWidth="max-w-xl"
    >
      <fieldset>
        <legend className="mb-2 text-sm font-black text-slate-700">封禁维度</legend>
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

      <label className="block space-y-1">
        <span className="text-sm font-black text-slate-700">封禁原因</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-20 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          placeholder="填写封禁原因（选填）"
        />
      </label>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
        将按「{selectedDimensions.join('、')}」维度封禁「{selectedModules.join('、')}」模块。
      </div>
    </ModalShell>
  );
}
