import { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { Badge, DataTable, Field, Panel, SelectInput, TextInput } from '../../components';
import { useToast } from '../../components/Toast';
import { useAdminStore } from '../../store/useAdminStore';
import type { AssetKind } from '../../types';
import { parseIdList } from '../../utils/filter';

type AssetTab = AssetKind | '代金券';
const assetTabs: AssetTab[] = ['金币', '钻石', '代金券'];

type Validation = { status: 'idle' | 'success' | 'error'; validIds: string[]; invalidIds: string[] };
const idleValidation: Validation = { status: 'idle', validIds: [], invalidIds: [] };

/** 资产管理（docx §2.A：手动增减金币/钻石、下发代金券）。 */
export function AssetManagementPanel() {
  const { state, dispatch } = useAdminStore();
  const { toast } = useToast();
  const [assetTab, setAssetTab] = useState<AssetTab>('金币');
  const [userIdInput, setUserIdInput] = useState('');
  const [validation, setValidation] = useState<Validation>(idleValidation);
  const [direction, setDirection] = useState<'增加' | '减少'>('增加');
  const [amount, setAmount] = useState('');
  const [voucherCount, setVoucherCount] = useState('');
  const [voucherValue, setVoucherValue] = useState('');
  const [reason, setReason] = useState('');

  const ops = useMemo(() => state.assetOps.filter((row) => row.asset === assetTab), [state.assetOps, assetTab]);
  const canSubmit = validation.status === 'success' && reason.trim().length > 0;

  const resetForm = () => {
    setAmount('');
    setVoucherCount('');
    setVoucherValue('');
    setReason('');
  };

  const validateIds = () => {
    const ids = parseIdList(userIdInput);
    const validIds = ids.filter((id) => state.users.some((u) => u.id.toLowerCase() === id.toLowerCase()));
    const invalidIds = ids.filter((id) => !validIds.some((v) => v.toLowerCase() === id.toLowerCase()));
    setValidation({ status: ids.length > 0 && invalidIds.length === 0 ? 'success' : 'error', validIds, invalidIds });
  };

  const submit = () => {
    const normalizedReason = reason.trim();
    if (validation.status !== 'success') return;
    if (!normalizedReason) {
      toast('请填写操作原因', 'error');
      return;
    }
    // 用规范化后的真实 ID（保持大小写一致）。
    const userIds = validation.validIds.map(
      (id) => state.users.find((u) => u.id.toLowerCase() === id.toLowerCase())?.id ?? id,
    );

    if (assetTab === '代金券') {
      const count = Number(voucherCount);
      const value = Number(voucherValue);
      if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(value) || value <= 0) {
        toast('请输入有效的张数与面值', 'error');
        return;
      }
      dispatch({ type: 'VOUCHER_GRANT', payload: { userIds, count, value, operator: state.operator, reason: normalizedReason } });
      toast(`已向 ${userIds.length} 个用户下发代金券`, 'success');
    } else {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) {
        toast('请输入有效的数量', 'error');
        return;
      }
      const delta = direction === '增加' ? value : -value;
      dispatch({ type: 'ASSET_ADJUST', payload: { userIds, asset: assetTab, delta, operator: state.operator, reason: normalizedReason } });
      toast(`已为 ${userIds.length} 个用户${direction} ${value} ${assetTab}`, 'success');
    }
    resetForm();
  };

  return (
    <Panel title="资产管理" icon={Wallet}>
      <div className="space-y-4">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
          {assetTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setAssetTab(tab); resetForm(); }}
              className={`h-10 shrink-0 border-b-2 px-4 text-sm font-black ${
                assetTab === tab ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-3 rounded-md bg-slate-50 p-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.25fr)_auto]">
            <label className="space-y-1">
              <span className="text-xs font-black text-slate-500">用户ID（单个或批量）</span>
              <textarea
                value={userIdInput}
                onChange={(e) => { setUserIdInput(e.target.value); setValidation(idleValidation); }}
                className="min-h-20 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="多个ID用逗号或换行分隔"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={validateIds}
                className="h-10 rounded-md border border-emerald-200 bg-white px-4 text-sm font-black text-emerald-700 hover:bg-emerald-50"
              >
                验证ID
              </button>
            </div>
          </div>

          {validation.status !== 'idle' && (
            <div className={`rounded-md border px-3 py-2 text-sm font-bold ${
              validation.status === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}>
              {validation.status === 'success'
                ? `验证成功：已匹配 ${validation.validIds.length} 个用户ID，可继续发放或扣减资产。`
                : `验证失败：${validation.invalidIds.length > 0 ? `未找到 ${validation.invalidIds.join('、')}` : '请先输入用户ID'}。`}
            </div>
          )}

          <div className={`grid gap-3 ${assetTab === '代金券' ? 'lg:grid-cols-[0.85fr_0.85fr_0.9fr_auto]' : 'lg:grid-cols-[1fr_1fr_auto]'}`}>
            {assetTab === '代金券' ? (
              <>
                <Field label="操作">
                  <SelectInput value="下发代金券" onChange={() => {}} options={['下发代金券']} />
                </Field>
                <Field label="张数">
                  <TextInput type="number" value={voucherCount} onChange={setVoucherCount} placeholder="张数" />
                </Field>
                <Field label="代金券面值（金币）">
                  <TextInput type="number" value={voucherValue} onChange={setVoucherValue} placeholder="每张价值" />
                </Field>
              </>
            ) : (
              <>
                <Field label="操作">
                  <SelectInput value={`${direction}${assetTab}`} onChange={(v) => setDirection(v.startsWith('增加') ? '增加' : '减少')} options={[`增加${assetTab}`, `减少${assetTab}`]} />
                </Field>
                <Field label="数量">
                  <TextInput type="number" value={amount} onChange={setAmount} placeholder="数量" />
                </Field>
              </>
            )}
            <div className="flex items-end">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={submit}
                className={`h-10 rounded-md px-4 text-sm font-black ${
                  canSubmit ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'cursor-not-allowed bg-slate-200 text-slate-500'
                }`}
              >
                提交操作
              </button>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-black text-slate-500">操作原因（必填）</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-20 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="请填写本次加减资产或下发代金券的原因"
            />
          </label>
        </div>

        <DataTable
          columns={['操作时间', '用户ID', '数量', '操作人', '原因', '操作状态']}
          rows={ops.map((row) => [row.time, row.userId, row.amount, row.operator, row.reason, <Badge label={row.status} />])}
          emptyText={`暂无${assetTab}操作记录`}
        />
      </div>
    </Panel>
  );
}
