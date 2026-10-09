import { useEffect, useRef, useState } from 'react';
import { apiUrl, readJsonResponse } from '@shared/apiClient';

type Row = { id: string; userId: string; userName?: string; content?: string; status?: string; moderationReason?: string; reason?: string; postId?: string; start?: number; end?: number; reviewedBy?: string; reviewedAt?: number; deduction?: number; appliedAmount?: number; discardedAmount?: number; reviewNote?: string; history?: Array<{ action: string; actor: string; at: number; reason: string }> };
export function SocialModerationPanel({ token }: { token: string }) {
  const [kind, setKind] = useState('posts'), [status, setStatus] = useState('PENDING'), [rows, setRows] = useState<Row[]>([]), [reasons, setReasons] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0);
  const generation = useRef(0), lock = useRef(false);
  const fetchPage = (before?: string) => fetch(apiUrl(`/api/admin/social?kind=${kind}&status=${status}${before ? `&before=${encodeURIComponent(before)}` : ''}`), { headers: { Authorization: `Bearer ${token}` } }).then(readJsonResponse<{ items: Row[]; nextBefore: string | null }>);
  useEffect(() => {
    const id = ++generation.current; setRows([]); setCursor(null); setError(''); setReasons({});
    void fetchPage().then(data => { if (id === generation.current) { setRows(data.items); setCursor(data.nextBefore); } }).catch(e => { if (id === generation.current) setError(e.message); });
    return () => { generation.current++; };
  }, [token, kind, status, revision]);
  const decide = async (row: Row, action: string) => {
    if (lock.current) return; const reason = (reasons[row.id] || '').trim();
    if (action !== 'APPROVE' && !reason) { setError('请填写处理原因或复核说明'); return; }
    lock.current = true; setBusy(true); const id = generation.current;
    try {
      await readJsonResponse(await fetch(apiUrl(`/api/admin/social/${kind}/${encodeURIComponent(row.id)}`), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, reason }) }));
      if (id === generation.current) setRevision(v => v + 1);
    } catch (e) { if (id === generation.current) setError((e as Error).message); }
    finally { lock.current = false; setBusy(false); }
  };
  const more = async () => {
    if (!cursor || lock.current) return; const id = generation.current; lock.current = true; setBusy(true);
    try { const data = await fetchPage(cursor); if (id === generation.current) { setRows(old => [...old, ...data.items]); setCursor(data.nextBefore); } }
    catch (e) { if (id === generation.current) setError((e as Error).message); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
    <h3 className="text-lg font-bold">动态与评论审核</h3>
    <p className="text-xs text-gray-400">先审核后公开；动态积分按首次通过日期计算。复核确认的扣分在后续周结算抵扣，最低为 0，超出可扣积分的部分放弃，不改原历史结算。</p>
    <div className="flex gap-3 flex-wrap">
      <select aria-label="内容类型" className="bg-gray-900 border border-white/20 rounded p-2" value={kind} onChange={e => setKind(e.target.value)}><option value="posts">动态</option><option value="comments">评论</option><option value="level-reviews">已结算积分复核</option></select>
      {kind !== 'level-reviews' && <select aria-label="审核状态" className="bg-gray-900 border border-white/20 rounded p-2" value={status} onChange={e => setStatus(e.target.value)}>{['PENDING', 'APPROVED', 'REJECTED', 'REMOVED', 'ALL'].map(s => <option key={s}>{s}</option>)}</select>}
      <button onClick={() => setRevision(v => v + 1)} className="text-purple-300">刷新</button>
    </div>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {!rows.length && !error && <p className="text-gray-400 text-sm">当前无记录</p>}
    {rows.map(row => <article key={row.id} className="p-4 rounded-xl border border-white/10 space-y-3">
      <p className="text-xs text-gray-400">{row.userName || row.userId} · {row.status || 'PENDING'} · {row.id}</p>
      <p className="whitespace-pre-wrap break-words">{row.content || row.reason}</p>
      {row.moderationReason && <p className="text-sm text-amber-300">原因：{row.moderationReason}</p>}
      {kind === 'level-reviews' ? <div className="space-y-2"><p className="text-sm text-amber-300">动态 {row.postId}；原结算周期 {new Date(row.start!).toLocaleString()} 至 {new Date(row.end!).toLocaleString()}。建议抵扣 {row.deduction ?? '待核对'} 分。</p>
        {row.status === 'PENDING' && <><input aria-label={`复核说明 ${row.id}`} maxLength={1000} placeholder="复核说明（必填）" className="w-full bg-black/20 border border-white/10 rounded-lg p-2" value={reasons[row.id] || ''} onChange={e => setReasons(old => ({ ...old, [row.id]: e.target.value }))} /><div className="flex gap-4"><button disabled={busy || row.deduction === undefined} onClick={() => void decide(row, 'CONFIRM')} className="text-amber-300">确认下次周结算抵扣</button><button disabled={busy} onClick={() => void decide(row, 'DISMISS')} className="text-gray-300">无需抵扣</button></div></>}
        {row.reviewNote && <p className="text-xs text-gray-400">{row.reviewedBy}：{row.reviewNote}</p>}
        {row.status === 'APPLIED' && <p className="text-xs text-gray-400">已扣 {row.appliedAmount} 分；放弃 {row.discardedAmount} 分；不再追扣。</p>}
      </div> : <>
        {(row.status === 'PENDING' || !row.status || row.status === 'APPROVED') && <><input aria-label={`审核原因 ${row.id}`} maxLength={1000} placeholder="驳回/下架原因（必填）" className="w-full bg-black/20 border border-white/10 rounded-lg p-2" value={reasons[row.id] || ''} onChange={e => setReasons(old => ({ ...old, [row.id]: e.target.value }))} />
          <div className="flex gap-4">{row.status === 'APPROVED' ? <button disabled={busy} onClick={() => void decide(row, 'REMOVE')} className="text-red-300">违规下架</button> : <><button disabled={busy} onClick={() => void decide(row, 'APPROVE')} className="text-green-300">通过</button><button disabled={busy} onClick={() => void decide(row, 'REJECT')} className="text-red-300">驳回</button></>}</div></>}
        {row.history?.length ? <details className="text-xs text-gray-400"><summary>审核历史</summary>{row.history.map((h, i) => <p key={i}>{new Date(h.at).toLocaleString()} · {h.actor} · {h.action} · {h.reason}</p>)}</details> : null}
      </>}
    </article>)}
    {cursor && <button disabled={busy} onClick={() => void more()} className="text-purple-300">加载更多</button>}
  </section>;
}
