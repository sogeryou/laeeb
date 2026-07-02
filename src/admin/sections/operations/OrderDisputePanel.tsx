import { useState } from 'react';
import { Download, MessageSquareWarning } from 'lucide-react';
import { Badge, DataTable, Field, Metric, MiniActionButton, ModalShell, Panel, TextInput } from '../../components';
import { useToast } from '../../components/Toast';
import { useTableQuery } from '../../hooks/useTableQuery';
import { useAdminStore } from '../../store/useAdminStore';
import type { DisputeResolvePayload } from '../../store/actions';
import type { DisputeOrder } from '../../types';
import { exportXlsx } from '../../utils/exportXlsx';

/** 纠纷管理（docx §2.D：举报审核、订单纠纷审核）。 */
export function OrderDisputePanel() {
  const { state, dispatch } = useAdminStore();
  const { toast } = useToast();
  const [reviewOrder, setReviewOrder] = useState<DisputeOrder | null>(null);
  const [draftUserId, setDraftUserId] = useState('');
  const [draftEpalId, setDraftEpalId] = useState('');
  const [draftOrderId, setDraftOrderId] = useState('');
  const [userId, setUserId] = useState('');
  const [epalId, setEpalId] = useState('');
  const [orderId, setOrderId] = useState('');

  const q = useTableQuery<DisputeOrder>(state.disputes, {
    extra: (row) => {
      const userNeedle = userId.trim().toLowerCase();
      const epalNeedle = epalId.trim().toLowerCase();
      const orderNeedle = orderId.trim().toLowerCase();
      if (userNeedle && !row.userId.toLowerCase().includes(userNeedle)) return false;
      if (epalNeedle && !row.epalId.toLowerCase().includes(epalNeedle)) return false;
      if (orderNeedle && !row.orderId.toLowerCase().includes(orderNeedle)) return false;
      return true;
    },
  });

  const runSearch = () => {
    setUserId(draftUserId);
    setEpalId(draftEpalId);
    setOrderId(draftOrderId);
    q.setPage(1);
  };

  const resetFilters = () => {
    setDraftUserId('');
    setDraftEpalId('');
    setDraftOrderId('');
    setUserId('');
    setEpalId('');
    setOrderId('');
    q.reset();
  };

  const handleExport = () => {
    exportXlsx('订单纠纷管理.xlsx', ['时间', '订单ID', '陪玩ID', '陪玩昵称', '用户ID', '用户昵称', '服务类型', '订单单价', '数量', '订单总价', '状态'], q.filtered.map((row) => [
      row.time,
      row.orderId,
      row.epalId,
      row.epalName,
      row.userId,
      row.userName,
      row.serviceType,
      row.unitPrice,
      row.quantity,
      row.total,
      row.status,
    ]));
  };

  return (
    <Panel
      title="订单纠纷管理"
      icon={MessageSquareWarning}
      action={
        <button onClick={handleExport} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50">
          <Download className="size-4" /> 导出
        </button>
      }
    >
      <div className="mb-4 grid gap-3 rounded-md bg-slate-50 p-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <Field label="用户ID">
          <TextInput value={draftUserId} onChange={setDraftUserId} placeholder="查询用户ID" />
        </Field>
        <Field label="陪玩ID">
          <TextInput value={draftEpalId} onChange={setDraftEpalId} placeholder="查询陪玩ID" />
        </Field>
        <Field label="订单ID">
          <TextInput value={draftOrderId} onChange={setDraftOrderId} placeholder="查询订单ID" />
        </Field>
        <div className="flex items-end gap-2">
          <button type="button" onClick={runSearch} className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800">
            查询
          </button>
          <button type="button" onClick={resetFilters} className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
            重置
          </button>
        </div>
      </div>

      <DataTable
        columns={['时间', '订单ID', '陪玩ID', '陪玩昵称', '用户ID', '用户昵称', '服务类型', '订单单价', '数量', '订单总价', '状态', '操作']}
        rows={q.pageItems.map((row) => [
          row.time,
          row.orderId,
          row.epalId,
          row.epalName,
          row.userId,
          row.userName,
          row.serviceType,
          `${row.unitPrice} 金币`,
          row.quantity,
          `${row.total} 金币`,
          <Badge label={row.status} />,
          row.status === '已处理'
            ? <span className="text-xs font-bold text-slate-400">已结案</span>
            : <MiniActionButton label="审核" tone="success" onClick={() => setReviewOrder(row)} />,
        ])}
        minWidth={1100}
        emptyText="暂无纠纷订单"
        pagination={{ page: q.page, pageSize: q.pageSize, total: q.total, onPageChange: q.setPage, onPageSizeChange: q.setPageSize }}
      />

      {reviewOrder && (
        <DisputeReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onConfirm={(payload) => {
            dispatch({ type: 'DISPUTE_RESOLVE', payload });
            toast(`纠纷 ${reviewOrder.orderId} 已处理`, 'success');
            setReviewOrder(null);
          }}
        />
      )}
    </Panel>
  );
}

function DisputeReviewModal({
  order,
  onClose,
  onConfirm,
}: {
  order: DisputeOrder;
  onClose: () => void;
  onConfirm: (payload: DisputeResolvePayload) => void;
}) {
  const [result, setResult] = useState<DisputeResolvePayload['result']>('用户申诉通过');
  const [selectedEvidence, setSelectedEvidence] = useState(order.evidence[0] ?? '');
  const [refundCoins, setRefundCoins] = useState(String(order.total));
  const [deductDiamonds, setDeductDiamonds] = useState(String(order.total));
  const isVideoEvidence = selectedEvidence.includes('视频');

  const applyResult = (next: DisputeResolvePayload['result']) => {
    setResult(next);
    if (next === '用户申诉驳回') {
      setRefundCoins('0');
      setDeductDiamonds('0');
    } else if (next === '用户申诉通过') {
      setRefundCoins(String(order.total));
      setDeductDiamonds(String(order.total));
    } else {
      setRefundCoins(String(Math.round(order.total / 2)));
      setDeductDiamonds(String(Math.round(order.total / 2)));
    }
  };

  return (
    <ModalShell
      title="纠纷订单审核"
      subtitle={`${order.orderId} · ${order.userId}/${order.userName} 对 ${order.epalId}/${order.epalName}`}
      onClose={onClose}
      onConfirm={() =>
        onConfirm({ id: order.id, result, refundCoins: Number(refundCoins) || 0, deductDiamonds: Number(deductDiamonds) || 0 })
      }
      confirmText="确认处理"
      footerTone={result === '用户申诉驳回' ? 'danger' : 'success'}
    >
      <div className="grid gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-3">
        <Metric label="服务类型" value={order.serviceType} />
        <Metric label="订单总价" value={`${order.total} 金币`} />
        <Metric label="证据材料" value={order.evidence.join('、')} />
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-black text-slate-900">证据材料</h4>
          <span className="text-xs font-bold text-slate-500">点击证据查看截图或视频</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {order.evidence.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => setSelectedEvidence(item)}
              className={`rounded-md border px-3 py-2 text-left text-sm font-black ${
                selectedEvidence === item ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
              }`}
            >
              证据 {index + 1}：{item}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
          <div className="grid aspect-video place-items-center rounded bg-white text-sm font-black text-slate-500">
            {isVideoEvidence ? (
              <div className="flex flex-col items-center gap-2">
                <span className="grid size-12 place-items-center rounded-full bg-slate-900 text-white">▶</span>
                <span>视频预览：{selectedEvidence}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="grid size-12 place-items-center rounded bg-emerald-50 text-emerald-700">IMG</span>
                <span>截图预览：{selectedEvidence}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <fieldset>
        <legend className="mb-2 text-sm font-black text-slate-700">审核结果</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(['用户申诉通过', '用户申诉驳回', '部分赔付'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => applyResult(item)}
              className={`h-10 rounded-md border px-3 text-sm font-black ${
                result === item ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="用户退回金币">
          <TextInput type="number" value={refundCoins} onChange={setRefundCoins} />
        </Field>
        <Field label="陪玩扣除钻石">
          <TextInput type="number" value={deductDiamonds} onChange={setDeductDiamonds} />
        </Field>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-black text-slate-700">审核说明</span>
        <textarea
          className="min-h-24 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          placeholder="填写纠纷判责、证据采信与资产处理说明"
        />
      </label>
    </ModalShell>
  );
}
