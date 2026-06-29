import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge, DataTable, Field, MiniActionButton, ModalShell, Panel, SelectInput, TextInput } from '../../components';
import { useToast } from '../../components/Toast';
import { useAdminStore } from '../../store/useAdminStore';
import type { CompanionReviewPayload } from '../../store/actions';
import type { CompanionService } from '../../types';

const serviceOptions = ['Valorant', 'PUBG Mobile', 'League', '语音聊天'];

/** 陪玩管理（docx §2.C：审核&移除、服务种类&价格增减/修改）。 */
export function CompanionOpsPanel() {
  const { state, dispatch } = useAdminStore();
  const { toast } = useToast();
  const [actionRow, setActionRow] = useState<CompanionService | null>(null);

  return (
    <Panel title="陪玩管理" icon={Sparkles}>
      <DataTable
        columns={['陪玩ID', '陪玩昵称', '审核状态', '服务类型数量', '当前服务', '当前价格', '操作']}
        rows={state.companionServices.map((row) => [
          row.id,
          row.name,
          <Badge label={row.audit} />,
          state.companionStats.find((item) => item.id === row.id)?.services ?? '-',
          row.service,
          row.price,
          <div className="flex flex-wrap gap-1">
            <MiniActionButton label={row.audit === '待审核' ? '审核' : '复审'} onClick={() => setActionRow(row)} />
            <MiniActionButton label="移除" tone="danger" onClick={() => setActionRow(row)} />
            <MiniActionButton label="服务/价格" tone="success" onClick={() => setActionRow(row)} />
          </div>,
        ])}
        emptyText="暂无陪玩"
      />

      {actionRow && (
        <CompanionActionModal
          row={actionRow}
          onClose={() => setActionRow(null)}
          onConfirm={(payload) => {
            dispatch({ type: 'COMPANION_REVIEW', payload });
            toast(`已对 ${actionRow.name} 执行「${payload.action}」`, payload.action === '审核驳回' || payload.action === '移除陪玩' ? 'error' : 'success');
            setActionRow(null);
          }}
        />
      )}
    </Panel>
  );
}

function CompanionActionModal({
  row,
  onClose,
  onConfirm,
}: {
  row: CompanionService;
  onClose: () => void;
  onConfirm: (payload: CompanionReviewPayload) => void;
}) {
  const [action, setAction] = useState<CompanionReviewPayload['action']>(
    row.audit === '待审核' ? '审核通过' : '调整服务价格',
  );
  const [service, setService] = useState(row.service);
  const [price, setPrice] = useState(row.price);

  return (
    <ModalShell
      title="陪玩管理操作"
      subtitle={`${row.id} / ${row.name} · 当前状态：${row.audit}`}
      onClose={onClose}
      onConfirm={() => onConfirm({ id: row.id, action, service, price })}
      confirmText="保存操作"
      footerTone={action === '审核驳回' || action === '移除陪玩' ? 'danger' : 'success'}
    >
      <fieldset>
        <legend className="mb-2 text-sm font-black text-slate-700">操作类型</legend>
        <div className="grid gap-2 sm:grid-cols-4">
          {(['审核通过', '审核驳回', '移除陪玩', '调整服务价格'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setAction(item)}
              className={`min-h-10 rounded-md border px-3 text-sm font-black ${
                action === item ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="服务大类">
          <SelectInput value={service} onChange={setService} options={serviceOptions.includes(service) ? serviceOptions : [service, ...serviceOptions]} />
        </Field>
        <Field label="服务价格">
          <TextInput value={price} onChange={setPrice} />
        </Field>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-black text-slate-700">操作说明</span>
        <textarea
          className="min-h-24 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          placeholder="填写审核意见、移除原因或价格调整说明"
        />
      </label>
    </ModalShell>
  );
}
