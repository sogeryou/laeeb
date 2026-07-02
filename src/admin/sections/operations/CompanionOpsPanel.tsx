import { useMemo, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Badge, DataTable, Field, Metric, MiniActionButton, ModalShell, Panel, SelectInput, TextInput } from '../../components';
import { useToast } from '../../components/Toast';
import { useTableQuery } from '../../hooks/useTableQuery';
import { useAdminStore } from '../../store/useAdminStore';
import type { CompanionReviewPayload } from '../../store/actions';
import type { CompanionService } from '../../types';

type CompanionSubTab = '陪玩管理' | '陪玩审核';
export const companionTabs: CompanionSubTab[] = ['陪玩管理', '陪玩审核'];
interface CompanionAuditRow {
  key: string;
  companion: CompanionService;
  serviceCategory: string;
}

export function CompanionSection({ activeTab }: { activeTab: CompanionSubTab }) {
  return (
    <section className="space-y-5">
      {activeTab === '陪玩管理' && <CompanionManagementPanel />}
      {activeTab === '陪玩审核' && <CompanionAuditPanel />}
    </section>
  );
}

const auditOptions = ['全部', '待审核', '已认证', '已拒绝', '已移除'];
const allServiceTypes = (rows: CompanionService[]) => ['全部', ...Array.from(new Set(rows.flatMap((row) => row.serviceItems.map((item) => item.category))))];
const allLevels = (rows: CompanionService[]) => ['全部', ...Array.from(new Set(rows.map((row) => row.level)))];

function serviceTypeCount(row: CompanionService) {
  return new Set(row.serviceItems.map((item) => item.category)).size;
}

function matchesService(row: CompanionService, serviceType: string) {
  return serviceType === '全部' || row.serviceItems.some((item) => item.category === serviceType);
}

/** 一级菜单：陪玩管理。 */
export function CompanionManagementPanel() {
  const { state, dispatch } = useAdminStore();
  const { toast } = useToast();
  const [detail, setDetail] = useState<CompanionService | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CompanionService | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draftId, setDraftId] = useState('');
  const [draftServiceType, setDraftServiceType] = useState('全部');
  const [draftLevel, setDraftLevel] = useState('全部');
  const [idFilter, setIdFilter] = useState('');
  const [serviceType, setServiceType] = useState('全部');
  const [levelFilter, setLevelFilter] = useState('全部');

  const source = useMemo(() => state.companionServices.filter((row) => row.audit === '已认证'), [state.companionServices]);
  const q = useTableQuery<CompanionService>(source, {
    extra: (row) => {
      const idNeedle = idFilter.trim().toLowerCase();
      if (idNeedle && !row.id.toLowerCase().includes(idNeedle)) return false;
      if (levelFilter !== '全部' && row.level !== levelFilter) return false;
      return matchesService(row, serviceType);
    },
  });
  const serviceOptions = useMemo(() => allServiceTypes(state.companionServices), [state.companionServices]);
  const levelOptions = useMemo(() => allLevels(source), [source]);

  const runSearch = () => {
    setIdFilter(draftId);
    setServiceType(draftServiceType);
    setLevelFilter(draftLevel);
    q.setPage(1);
  };

  const reset = () => {
    setDraftId('');
    setDraftServiceType('全部');
    setDraftLevel('全部');
    setIdFilter('');
    setServiceType('全部');
    setLevelFilter('全部');
    q.reset();
  };

  return (
    <Panel
      title="陪玩管理"
      icon={Sparkles}
      action={
        <button onClick={() => setShowAdd(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-700 px-3 text-xs font-black text-white hover:bg-emerald-800">
          <Plus className="size-4" /> 添加陪玩
        </button>
      }
    >
      <div className="mb-4 grid gap-3 rounded-md bg-slate-50 p-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <Field label="陪玩ID">
          <TextInput value={draftId} onChange={setDraftId} placeholder="查询陪玩ID" />
        </Field>
        <Field label="服务类型">
          <SelectInput value={draftServiceType} onChange={setDraftServiceType} options={serviceOptions} />
        </Field>
        <Field label="陪玩等级">
          <SelectInput value={draftLevel} onChange={setDraftLevel} options={levelOptions} />
        </Field>
        <div className="flex items-end gap-2">
          <button type="button" onClick={runSearch} className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800">
            查询
          </button>
          <button type="button" onClick={reset} className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
            重置
          </button>
        </div>
      </div>

      <DataTable
        columns={['陪玩ID', '陪玩昵称', '服务类型数量', '陪玩等级', '操作']}
        rows={q.pageItems.map((row) => [
          <button type="button" onClick={() => setDetail(row)} className="font-black text-emerald-700 hover:underline">{row.id}</button>,
          row.name,
          serviceTypeCount(row),
          row.level,
          <MiniActionButton label="移除陪玩" tone="danger" onClick={() => setRemoveTarget(row)} />,
        ])}
        emptyText="暂无陪玩"
        pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage, onPageSizeChange: q.setPageSize }}
      />

      {detail && (
        <CompanionDetailModal
          row={detail}
          mode="manage"
          onClose={() => setDetail(null)}
        />
      )}
      {removeTarget && (
        <ConfirmCompanionRemoveModal
          row={removeTarget}
          onClose={() => setRemoveTarget(null)}
          onConfirm={() => {
            dispatch({ type: 'COMPANION_REVIEW', payload: { id: removeTarget.id, action: '移除陪玩' } });
            toast(`已移除陪玩 ${removeTarget.name}`, 'error');
            setRemoveTarget(null);
          }}
        />
      )}
      {showAdd && <AddCompanionModal onClose={() => setShowAdd(false)} />}
    </Panel>
  );
}

/** 一级菜单：陪玩审核。 */
export function CompanionAuditPanel() {
  const { state, dispatch } = useAdminStore();
  const { toast } = useToast();
  const [detail, setDetail] = useState<CompanionAuditRow | null>(null);
  const [confirm, setConfirm] = useState<{ ids: string[]; action: '审核通过' | '审核驳回' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draftId, setDraftId] = useState('');
  const [serviceType, setServiceType] = useState('全部');
  const [auditStatus, setAuditStatus] = useState('全部');

  const auditRows = useMemo<CompanionAuditRow[]>(
    () => state.companionServices.flatMap((companion) =>
      Array.from(new Set(companion.serviceItems.map((item) => item.category))).map((serviceCategory) => ({
        key: `${companion.id}::${serviceCategory}`,
        companion,
        serviceCategory,
      })),
    ),
    [state.companionServices],
  );
  const q = useTableQuery<CompanionAuditRow>(auditRows, {
    extra: (row) => {
      const idNeedle = draftId.trim().toLowerCase();
      if (idNeedle && !row.companion.id.toLowerCase().includes(idNeedle)) return false;
      if (serviceType !== '全部' && row.serviceCategory !== serviceType) return false;
      return auditStatus === '全部' || row.companion.audit === auditStatus;
    },
  });
  const serviceOptions = useMemo(() => allServiceTypes(state.companionServices), [state.companionServices]);
  const selectedVisibleIds = selectedIds.filter((id) => q.filtered.some((row) => row.key === id));

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const applyReview = (keys: string[], action: '审核通过' | '审核驳回') => {
    const companionIds = Array.from(new Set(keys.map((key) => key.split('::')[0])));
    companionIds.forEach((id) => dispatch({ type: 'COMPANION_REVIEW', payload: { id, action } }));
    toast(`已${action} ${keys.length} 个服务申请`, action === '审核驳回' ? 'error' : 'success');
    setSelectedIds((prev) => prev.filter((id) => !keys.includes(id)));
    setDetail(null);
    setConfirm(null);
  };

  return (
    <Panel title="陪玩审核" icon={Sparkles}>
      <div className="mb-4 grid gap-3 rounded-md bg-slate-50 p-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
        <Field label="陪玩ID">
          <TextInput value={draftId} onChange={setDraftId} placeholder="查询陪玩ID" />
        </Field>
        <Field label="服务类型">
          <SelectInput value={serviceType} onChange={(v) => { setServiceType(v); q.setPage(1); }} options={serviceOptions} />
        </Field>
        <Field label="审核状态">
          <SelectInput value={auditStatus} onChange={(v) => { setAuditStatus(v); q.setPage(1); }} options={auditOptions} />
        </Field>
        <div className="flex items-end gap-2">
          <button type="button" disabled={selectedVisibleIds.length === 0} onClick={() => setConfirm({ ids: selectedVisibleIds, action: '审核通过' })} className="h-10 rounded-md bg-emerald-700 px-3 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
            批量通过
          </button>
          <button type="button" disabled={selectedVisibleIds.length === 0} onClick={() => setConfirm({ ids: selectedVisibleIds, action: '审核驳回' })} className="h-10 rounded-md border border-rose-200 bg-white px-3 text-sm font-black text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400">
            批量拒绝
          </button>
        </div>
      </div>

      <DataTable
        columns={['选择', '陪玩ID', '陪玩昵称', '服务项目', '审核状态']}
        rows={q.pageItems.map((row) => [
          <input type="checkbox" checked={selectedIds.includes(row.key)} onChange={() => toggleSelected(row.key)} className="size-4 accent-emerald-700" />,
          <button type="button" onClick={() => setDetail(row)} className="font-black text-emerald-700 hover:underline">{row.companion.id}</button>,
          row.companion.name,
          row.serviceCategory,
          <Badge label={row.companion.audit} />,
        ])}
        emptyText="暂无审核数据"
        pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage, onPageSizeChange: q.setPageSize }}
      />

      {detail && (
        <CompanionDetailModal
          row={detail.companion}
          serviceCategory={detail.serviceCategory}
          mode="audit"
          onClose={() => setDetail(null)}
          onApprove={() => setConfirm({ ids: [detail.key], action: '审核通过' })}
          onReject={() => setConfirm({ ids: [detail.key], action: '审核驳回' })}
        />
      )}
      {confirm && (
        <ConfirmReviewModal
          ids={confirm.ids}
          action={confirm.action}
          onClose={() => setConfirm(null)}
          onConfirm={() => applyReview(confirm.ids, confirm.action)}
        />
      )}
    </Panel>
  );
}

function CompanionDetailModal({
  row,
  serviceCategory,
  mode,
  onClose,
  onApprove,
  onReject,
}: {
  row: CompanionService;
  serviceCategory?: string;
  mode: 'manage' | 'audit';
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const [expanded, setExpanded] = useState(row.serviceItems[0]?.category ?? '');
  const categories = Array.from(new Set(row.serviceItems.map((item) => item.category)));

  return (
    <ModalShell title={mode === 'manage' ? '陪玩资料' : '陪玩审核资料'} subtitle={`${row.id} / ${row.name}`} onClose={onClose} maxWidth="max-w-3xl">
      <div className="grid gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-3">
        <Metric label="段位" value={row.rank} />
        <Metric label="平台" value={row.platform} />
        <Metric label="陪玩等级" value={row.level} />
        <Metric label="擅长位置" value={row.positions} />
        <Metric label="风格" value={row.style} />
        <Metric label="上传语音" value={row.voice} />
      </div>

      <section>
        <h4 className="mb-2 text-sm font-black text-slate-700">截图材料</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {row.screenshots.map((item) => (
            <div key={item} className="grid aspect-video place-items-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm font-black text-slate-500">
              {item}
            </div>
          ))}
        </div>
      </section>

      {mode === 'audit' ? (
        <Metric label="服务项目" value={serviceCategory ?? row.service} />
      ) : (
        <section>
          <h4 className="mb-2 text-sm font-black text-slate-700">已通过审核的服务项目</h4>
          <div className="grid gap-2">
            {categories.map((category) => (
              <div key={category} className="rounded-md border border-slate-200">
                <button type="button" onClick={() => setExpanded(expanded === category ? '' : category)} className="flex h-11 w-full items-center justify-between px-3 text-left text-sm font-black text-slate-800 hover:bg-slate-50">
                  {category}
                  <span className="text-xs text-slate-400">{expanded === category ? '收起' : '展开'}</span>
                </button>
                {expanded === category && (
                  <div className="border-t border-slate-200 px-3 py-2">
                    {row.serviceItems.filter((item) => item.category === category).map((item) => (
                      <div key={`${item.category}-${item.name}`} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-b-0">
                        <span className="font-bold text-slate-700">{item.name}</span>
                        <span className="font-black text-slate-950">{item.price}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {mode === 'audit' && (
        <div className="flex flex-wrap gap-2">
          <MiniActionButton label="通过" tone="success" onClick={onApprove ?? (() => {})} />
          <MiniActionButton label="拒绝" tone="danger" onClick={onReject ?? (() => {})} />
        </div>
      )}
    </ModalShell>
  );
}

function AddCompanionModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useAdminStore();
  const { toast } = useToast();
  const [userId, setUserId] = useState('');
  const [validatedId, setValidatedId] = useState('');
  const user = state.users.find((item) => item.id.toLowerCase() === userId.trim().toLowerCase());
  const exists = state.companionServices.some((item) => item.id.toLowerCase() === userId.trim().toLowerCase());
  const canAdd = Boolean(validatedId && user && !exists);

  return (
    <ModalShell
      title="添加陪玩"
      subtitle="先验证用户ID，验证成功后才能添加"
      onClose={onClose}
      onConfirm={() => {
        if (!canAdd) return;
        dispatch({ type: 'COMPANION_ADD', payload: { userId: user.id } });
        toast(`已添加陪玩 ${user.name}`, 'success');
        onClose();
      }}
      confirmText="确认添加"
      confirmDisabled={!canAdd}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="用户ID">
          <TextInput value={userId} onChange={(v) => { setUserId(v); setValidatedId(''); }} placeholder="输入用户ID" />
        </Field>
        <div className="flex items-end">
          <button type="button" onClick={() => setValidatedId(userId.trim())} className="h-10 rounded-md border border-emerald-200 bg-white px-4 text-sm font-black text-emerald-700 hover:bg-emerald-50">
            验证ID
          </button>
        </div>
      </div>
      {validatedId && (
        <div className={`rounded-md border px-3 py-2 text-sm font-bold ${canAdd ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {user ? (exists ? '该用户已是陪玩，不能重复添加。' : `验证成功：${user.id} / ${user.name}`) : '验证失败：未找到该用户ID。'}
        </div>
      )}
    </ModalShell>
  );
}

function ConfirmCompanionRemoveModal({
  row,
  onClose,
  onConfirm,
}: {
  row: CompanionService;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell
      title="确认移除陪玩"
      subtitle={`${row.id} / ${row.name}`}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmText="确认移除"
      footerTone="danger"
    >
      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
        移除后该陪玩不会继续展示在陪玩管理列表中，审核状态会更新为已移除。
      </div>
    </ModalShell>
  );
}

function ConfirmReviewModal({
  ids,
  action,
  onClose,
  onConfirm,
}: {
  ids: string[];
  action: '审核通过' | '审核驳回';
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell
      title="确认审核操作"
      subtitle={`将对 ${ids.length} 个陪玩执行「${action}」`}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmText={`确认${action === '审核通过' ? '通过' : '拒绝'}`}
      footerTone={action === '审核驳回' ? 'danger' : 'success'}
    >
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
        二次确认后会立即更新审核状态。涉及陪玩ID：{ids.join('、')}
      </div>
    </ModalShell>
  );
}
