import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Flag, LoaderCircle, MessageCircle, Play, Send, Star, X, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import type { BusinessOrder, OrderAction } from '@shared/orders';
import { useApp } from '../../app/AppContext';
import { CoinIcon } from '../ui/CoinIcon';
import { canReview, evidenceEntries, orderDate, reviewMessage, validEvidence } from './orderModel';
import { orderCopy, orderDirection } from './orderCopy';
import { orderError } from './orderError';

const primary = 'w-full py-4 px-4 rounded-2xl bg-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed';
const secondary = 'w-full py-4 px-4 rounded-2xl bg-white/5 border border-white/10 text-gray-300 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed';
const field = 'w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-purple-500 outline-none resize-y min-h-28';

function OrderSheet({ title, busy, close, children, footer }: { title: string; busy: boolean; close: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  const { locale } = useApp();
  const copy = orderCopy(locale);
  const ref = useRef<HTMLDivElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus?.(); };
  }, []);
  const closeSafely = () => { if (!busyRef.current) closeRef.current(); };
  return <>
    <div onClick={closeSafely} className="fixed inset-0 bg-black/80 z-[400]" aria-hidden="true" />
    <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} dir={orderDirection(locale)}
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === 'Escape') { event.preventDefault(); closeSafely(); }
        if (event.key !== 'Tab') return;
        const controls = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),textarea:not(:disabled),input:not(:disabled),a[href]');
        if (!controls?.length) { event.preventDefault(); return; }
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
      }}
      className="fixed inset-0 h-[100dvh] bg-[#0f071a] z-[401] flex flex-col min-h-0 outline-none">
      <header className="w-full max-w-lg mx-auto px-6 pt-5 pb-4 shrink-0">
        <div className="flex justify-between items-center gap-4"><h2 className="text-2xl font-black break-words">{title}</h2><button type="button" disabled={busy} aria-label={copy.close} onClick={closeSafely} className="p-2 bg-white/5 rounded-xl disabled:opacity-40 shrink-0"><X className="w-5 h-5" /></button></div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6"><div className="w-full max-w-lg mx-auto space-y-6 pb-6">{children}</div></div>
      <footer className="w-full max-w-lg mx-auto px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0 border-t border-white/10 bg-[#0f071a] max-h-[45dvh] overflow-y-auto space-y-3">{footer}</footer>
    </motion.div>
  </>;
}

function DetailDialog({ order }: { order: BusinessOrder }) {
  const { orders, locale, navigateTo, setShowOrderDetailModal, setShowReviewModal } = useApp();
  const copy = orderCopy(locale);
  const [completion, setCompletion] = useState('');
  const [reason, setReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const mounted = useRef(true);
  const busy = submitting || !!orders.pendingId;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setCompletion(''); setReason(''); setDisputeEvidence(''); setError(''); }, [order.status]);
  const evidence = evidenceEntries(completion);
  const disputeProof = evidenceEntries(disputeEvidence);
  const act = async (action: OrderAction, body?: { evidence?: string[]; reason?: string }) => {
    if (busy || lock.current || order.workflowVersion !== 2) return;
    lock.current = true; setSubmitting(true); setError('');
    try {
      const result = await orders.act(order.id, action, body);
      if (!mounted.current) return;
      if (!result) { setError(orders.getError?.() || orders.error || copy.failed); return; }
      setCompletion(''); setReason(''); setDisputeEvidence('');
      await orders.refresh();
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : copy.failed); }
    finally { if (mounted.current) { lock.current = false; setSubmitting(false); } }
  };
  const mutable = order.workflowVersion === 2;
  const buyer = order.role === 'BUYER';
  const row = (label: string, value: React.ReactNode) => <div className="flex justify-between gap-5 py-4 border-b border-white/5"><dt className="text-gray-500 font-bold text-xs shrink-0 max-w-[45%] break-words">{label}</dt><dd className="font-bold text-sm text-end min-w-0 break-words">{value}</dd></div>;
  return <OrderSheet title={copy.detailTitle} busy={busy} close={() => setShowOrderDetailModal(false)} footer={<>
    {busy && <p role="status" className="flex justify-center"><LoaderCircle className="w-5 h-5 animate-spin text-purple-400" /></p>}
    {order.participant && <button type="button" disabled={busy} className={primary} onClick={() => { setShowOrderDetailModal(false); navigateTo('IM_DETAIL', order.participant); }}><MessageCircle className="w-4 h-4" />{copy.chat}</button>}
    {mutable && buyer && order.status === 'CREATED' && <button type="button" disabled={busy} className={secondary} onClick={() => act('cancel')}><XCircle className="w-4 h-4" />{copy.cancel}</button>}
    {mutable && !buyer && order.status === 'CREATED' && <button type="button" disabled={busy} className={primary} onClick={() => act('accept')}><Play className="w-4 h-4" />{copy.accept}</button>}
    {mutable && !buyer && order.status === 'IN_SERVICE' && <button type="button" disabled={busy || !validEvidence(evidence, true)} className={primary} onClick={() => act('complete', { evidence })}><Send className="w-4 h-4" />{copy.complete}</button>}
    {mutable && buyer && order.status === 'AWAITING_CONFIRMATION' && <>
      <button type="button" disabled={busy} className={primary} onClick={() => act('confirm')}><CheckCircle2 className="w-4 h-4" />{copy.confirm}</button>
      <button type="button" disabled={busy || !reason.trim() || reason.trim().length > 1000 || !validEvidence(disputeProof, true)} className={secondary} onClick={() => act('dispute', { reason: reason.trim(), evidence: disputeProof })}><Flag className="w-4 h-4" />{copy.dispute}</button>
    </>}
    {canReview(order) && <button type="button" disabled={busy} className={secondary} onClick={() => { setShowOrderDetailModal(false); setShowReviewModal(true); }}><Star className="w-4 h-4" />{copy.rate}</button>}
  </>}>
    <p className="text-gray-500 text-xs break-all">{copy.transactionId}: <bdi>{order.id}</bdi></p>
    <dl>
      {row(copy.role, buyer ? copy.buyer : copy.companion)}
      {row(buyer ? copy.companion : copy.buyer, order.participant?.name)}
      {row(copy.service, order.serviceName)}{row(copy.unit, order.unit ?? '-')}
      {row(copy.unitPrice, <span className="inline-flex items-center gap-1"><CoinIcon /><bdi>{order.unitPrice}</bdi></span>)}
      {row(copy.quantity, <bdi>{order.quantity}</bdi>)}{row(copy.createdAt, orderDate(order.createdAt, locale))}
      {row(copy.status, <span className="text-purple-400">{copy[order.status]}</span>)}
      {mutable && order.status === 'CREATED' && order.paidAt && row(copy.acceptanceDue, orderDate(order.paidAt + 900000, locale))}
      {order.confirmationDueAt && row(copy.confirmationDue, orderDate(order.confirmationDueAt, locale))}
      {order.completedAt && row(copy.completedAt, orderDate(order.completedAt, locale))}
    </dl>
    <div className="bg-gradient-to-br from-purple-600/10 to-transparent rounded-[32px] p-6 border border-white/5 flex flex-col items-center gap-3"><span className="text-gray-400 font-bold text-xs">{copy.total}</span><div className="flex gap-3 items-center"><CoinIcon className="w-7 h-7" /><bdi className="text-4xl font-black">{order.totalPrice}</bdi></div></div>
    {!mutable && <p className="text-amber-400 text-sm">{copy.legacy}</p>}
    {order.reviewed && <p role="status" className="text-sm text-gray-400">{order.review ? reviewMessage(order.review.status, copy) : copy.reviewed}</p>}
    {!!order.completionEvidence?.length && <section className="space-y-2"><h3 className="text-sm font-bold text-gray-400">{copy.evidence}</h3>{order.completionEvidence.map((entry, index) => <p className="text-sm break-words whitespace-pre-wrap" key={index}>{entry}</p>)}</section>}
    {order.disputeReason && <section className="space-y-2"><h3 className="text-sm font-bold text-gray-400">{copy.reason}</h3><p className="text-sm break-words whitespace-pre-wrap">{order.disputeReason}</p>{order.disputeEvidence?.map((entry, index) => <p className="text-sm break-words" key={index}>{entry}</p>)}</section>}
    {mutable && !buyer && order.status === 'IN_SERVICE' && <label className="block space-y-2"><span className="text-sm text-gray-400">{copy.evidence}</span><textarea aria-label={copy.evidence} aria-invalid={!!completion && !validEvidence(evidence, true)} value={completion} disabled={busy} onChange={event => { setCompletion(event.target.value); setError(''); }} maxLength={18440} placeholder={copy.evidenceHint} className={field} /><p className="text-xs text-gray-500">{copy.evidenceHint}</p>{!!completion && !validEvidence(evidence, true) && <p role="alert" className="text-sm text-red-400">{copy.evidenceInvalid}</p>}</label>}
    {mutable && buyer && order.status === 'AWAITING_CONFIRMATION' && <>
      <label className="block space-y-2"><span className="text-sm text-gray-400">{copy.reason}</span><textarea aria-label={copy.reason} value={reason} disabled={busy} maxLength={1000} onChange={event => { setReason(event.target.value); setError(''); }} placeholder={copy.reasonHint} className={field} /></label>
      <label className="block space-y-2"><span className="text-sm text-gray-400">{copy.disputeEvidence}</span><textarea aria-label={copy.disputeEvidence} aria-invalid={!!disputeEvidence && !validEvidence(disputeProof, true)} value={disputeEvidence} disabled={busy} maxLength={18440} onChange={event => { setDisputeEvidence(event.target.value); setError(''); }} className={field} />{!!disputeEvidence && !validEvidence(disputeProof, true) && <p role="alert" className="text-sm text-red-400">{copy.evidenceInvalid}</p>}</label>
    </>}
    {error && <p role="alert" className="text-sm text-red-400 break-words">{orderError(error, locale)}</p>}
  </OrderSheet>;
}

function ReviewDialog({ order }: { order: BusinessOrder }) {
  const { orders, locale, setShowReviewModal, notify } = useApp();
  const copy = orderCopy(locale);
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const lock = useRef(false);
  const busy = submitting || !!orders.pendingId;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const submit = async () => {
    if (busy || lock.current || !canReview(order) || feedback.length > 2000) return;
    lock.current = true; setSubmitting(true); setError('');
    try {
      const result = await orders.review(order.id, rating, feedback, tags);
      if (!mounted.current) return;
      if (!result) { setError(orders.getError?.() || orders.error || copy.failed); return; }
      notify(reviewMessage(result.status, copy));
      setShowReviewModal(false);
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : copy.failed); }
    finally { if (mounted.current) { lock.current = false; setSubmitting(false); } }
  };
  return <OrderSheet title={copy.reviewTitle} busy={busy} close={() => setShowReviewModal(false)} footer={canReview(order) ? <button type="button" disabled={busy || feedback.length > 2000} className={primary} onClick={submit}>{busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{copy.submitReview}</button> : null}>
    <p className="text-gray-400 text-sm text-center break-words">{order.participant?.name}</p>
    {!canReview(order) ? <p role="status" className="text-gray-400 text-center text-sm">{order.workflowVersion !== 2 ? copy.legacy : order.review ? reviewMessage(order.review.status, copy) : copy.reviewed}</p> : <>
      <div className="flex justify-center gap-2" role="group" aria-label={copy.reviewTitle}>
        {[1, 2, 3, 4, 5].map(value => <button type="button" key={value} disabled={busy} aria-label={`${value} ${locale.startsWith('ar') ? 'نجوم' : 'stars'}`} aria-pressed={rating === value} onClick={() => setRating(value)} className="w-11 h-11 flex items-center justify-center"><Star className={`w-9 h-9 ${value <= rating ? 'text-yellow-500 fill-current' : 'text-gray-700'}`} /></button>)}
      </div>
      <fieldset disabled={busy} className="space-y-4"><legend className="text-xs text-gray-500 font-bold text-center w-full mb-4">{copy.tags}</legend><div className="flex flex-wrap justify-center gap-2">
        {(['Professional', 'Friendly', 'Skilled', 'Good Comms', 'Patient', 'Fun'] as const).map(tag => <label key={tag} className={`px-4 py-2 rounded-full text-xs font-bold border cursor-pointer ${tags.includes(tag) ? 'bg-purple-600 border-purple-400' : 'bg-white/5 border-white/10 text-gray-400'}`}><input type="checkbox" aria-label={copy[tag]} checked={tags.includes(tag)} onChange={() => setTags(old => old.includes(tag) ? old.filter(value => value !== tag) : [...old, tag])} className="sr-only peer" /><span className="peer-focus-visible:outline peer-focus-visible:outline-purple-400">{copy[tag]}</span></label>)}
      </div></fieldset>
      <label className="block space-y-3"><span className="text-xs text-gray-500 font-bold">{copy.feedback}</span><textarea aria-label={copy.reviewFeedbackLabel} value={feedback} disabled={busy} maxLength={2000} onChange={event => { setFeedback(event.target.value); setError(''); }} className={field} /></label>
    </>}
    {error && <p role="alert" className="text-sm text-red-400 break-words">{orderError(error, locale)}</p>}
  </OrderSheet>;
}

export function OrderDialogs() {
  const { orders, selectedOrder, authUser, showOrderDetailModal, showReviewModal } = useApp();
  const order = orders.items.find(item => item.id === selectedOrder?.id);
  if (!order) return null;
  const identity = JSON.stringify([authUser?.id, order.id]);
  if (showReviewModal) return <ReviewDialog key={`review:${identity}`} order={order} />;
  return showOrderDetailModal ? <DetailDialog key={`details:${identity}`} order={order} /> : null;
}
