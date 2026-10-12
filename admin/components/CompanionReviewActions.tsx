import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import type { CompanionApplicationDetails } from '@shared/companionApplications';

export type CompanionReviewInput = { action: 'APPROVE' | 'REJECT'; reason?: string; expectedUpdatedAt: number };
type Record = { id: string; status: string; updatedAt: number; gameName: string; intro: string; hourlyRate: number; application?: { details?: CompanionApplicationDetails } };
type Props = { record: Record; scopeKey: string; onReview: (input: CompanionReviewInput) => Promise<void> };

export function CompanionReviewActions({ record, scopeKey, onReview }: Props) {
  const identity = `${scopeKey}:${record.id}:${record.updatedAt}:${record.status}`;
  const current = useRef(identity); current.current = identity;
  const mounted = useRef(true);
  const lock = useRef<object | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useState<{ identity: string; action: 'APPROVE' | 'REJECT' } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const visible = dialog?.identity === identity && record.status === 'PENDING';

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { lock.current = null; setBusy(false); setError(''); setReason(''); setDialog(null); }, [identity]);
  useEffect(() => {
    if (!visible || typeof document === 'undefined') return;
    dialogRef.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !lock.current) setDialog(null);
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled)') || []);
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [visible]);

  const open = (action: 'APPROVE' | 'REJECT') => { setReason(''); setError(''); setDialog({ identity, action }); };
  const invalidReason = dialog?.action === 'REJECT' && (!reason.trim() || reason.trim().length > 1000);
  const confirm = async () => {
    if (!visible || !dialog || invalidReason || lock.current) return;
    const operation = {}; lock.current = operation;
    const started = identity;
    setBusy(true); setError('');
    try {
      await onReview({ action: dialog.action, expectedUpdatedAt: record.updatedAt, ...(dialog.action === 'REJECT' ? { reason: reason.trim() } : {}) });
      if (mounted.current && current.current === started) setDialog(null);
    } catch (failure) {
      if (mounted.current && current.current === started) setError(failure instanceof Error ? failure.message : 'COMPANION_REVIEW_FAILED');
    } finally {
      if (lock.current === operation) { lock.current = null; if (mounted.current && current.current === started) setBusy(false); }
    }
  };
  if (record.status !== 'PENDING') return null;
  const details = record.application?.details;
  const modal = visible ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 whitespace-normal">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Companion application review" tabIndex={-1} className="max-h-[85vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-lg border border-white/10 bg-[#171023] p-5 text-sm text-white outline-none">
        <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold">{ '\u966a\u73a9\u7533\u8bf7\u5ba1\u6838' }</h2><button type="button" aria-label="Close review" title={'\u5173\u95ed'} disabled={busy} onClick={() => setDialog(null)} className="p-2 disabled:opacity-40"><X className="h-4 w-4" /></button></div>
        <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-start">
          <dt className="text-gray-400">{ '\u6e38\u620f' }</dt><dd className="break-words">{record.gameName}</dd>
          <dt className="text-gray-400">{ '\u670d\u52a1' }</dt><dd className="break-words">{details?.serviceName || record.gameName}</dd>
          <dt className="text-gray-400">{ '\u4ef7\u683c' }</dt><dd>{record.hourlyRate} Coins / {details?.unit || 'hr'}</dd>
          {details?.rank && <><dt className="text-gray-400">{ '\u6bb5\u4f4d' }</dt><dd className="break-words">{details.rank}</dd></>}
          {details?.server && <><dt className="text-gray-400">{ '\u670d\u52a1\u5668' }</dt><dd className="break-words">{details.server}</dd></>}
          {details?.style && <><dt className="text-gray-400">{ '\u98ce\u683c' }</dt><dd className="break-words">{details.style}</dd></>}
          <dt className="text-gray-400">{ '\u4ecb\u7ecd' }</dt><dd className="whitespace-pre-wrap break-words">{record.intro}</dd>
        </dl>
        {dialog?.action === 'REJECT' && <label className="block space-y-2 text-start"><span>{ '\u62d2\u7edd\u539f\u56e0' }</span><textarea aria-label="Rejection reason" autoFocus value={reason} maxLength={1000} disabled={busy} onChange={event => setReason(event.target.value)} className="h-28 w-full resize-none rounded-lg border border-white/15 bg-white/5 p-3 outline-none focus:border-purple-400 disabled:opacity-50" /></label>}
        {error && <p role="alert" className="break-words text-sm text-red-300">{error}</p>}
        <div className="flex justify-end gap-3"><button type="button" aria-label="Cancel review" disabled={busy} onClick={() => setDialog(null)} className="rounded-lg border border-white/15 px-4 py-2 disabled:opacity-40">{ '\u53d6\u6d88' }</button><button type="button" aria-label="Confirm review" disabled={busy || Boolean(invalidReason)} onClick={confirm} className="rounded-lg bg-purple-600 px-4 py-2 font-bold disabled:opacity-40">{busy ? '\u4fdd\u5b58\u4e2d...' : dialog?.action === 'REJECT' ? '\u786e\u8ba4\u9a73\u56de' : '\u786e\u8ba4\u901a\u8fc7'}</button></div>
      </div>
    </div> : null;
  return <>
    <button type="button" aria-label="Approve application" title={'\u901a\u8fc7'} onClick={() => open('APPROVE')} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs text-green-300 hover:bg-white/20"><CheckCircle2 className="h-3.5 w-3.5" />{ '\u901a\u8fc7' }</button>
    <button type="button" aria-label="Reject application" title={'\u9a73\u56de'} onClick={() => open('REJECT')} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs text-red-300 hover:bg-white/20"><XCircle className="h-3.5 w-3.5" />{ '\u9a73\u56de' }</button>
    {modal && (typeof document !== 'undefined' ? createPortal(modal, document.body) : modal)}
  </>;
}
