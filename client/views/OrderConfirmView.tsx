import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, LoaderCircle, Minus, Plus, RefreshCw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../app/AppContext';
import { GlassCard } from '../components/ui/GlassCard';
import { CoinIcon } from '../components/ui/CoinIcon';
import { orderCopy, orderDirection } from '../components/orders/orderCopy';
import { checkoutRequest, clearPendingCheckout, matchesCheckout, readPendingCheckout, savePendingCheckout, useCheckoutQuote } from '../components/orders/useCheckoutQuote';
import { definitiveCheckoutRejection, orderError } from '../components/orders/orderError';

export function OrderConfirmView() {
  const {
    locale, authUser, authToken, selectedEPal, activeServiceId, setActiveServiceId, setSelectedVariant,
    orderQuantity, setOrderQuantity, selectedCoupon, setSelectedCoupon, showCouponModal, setShowCouponModal,
    showServiceTypeModal, setShowServiceTypeModal, orders, handleBack, navigateTo, setImTab,
  } = useApp();
  const copy = orderCopy(locale);
  const owner = authUser?.id ?? '';
  const session = JSON.stringify([owner, authToken]);
  const service = selectedEPal?.services?.find(item => item.id === activeServiceId);
  const quantity = Math.min(100, Math.max(1, Math.trunc(orderQuantity) || 1));
  const input = { companionId: selectedEPal?.id ?? '', ...(activeServiceId ? { serviceId: activeServiceId } : {}), quantity, ...(selectedCoupon ? { couponGrantId: selectedCoupon.id } : {}) };
  const pricing = useCheckoutQuote(input, session, orders.quote, copy.quoteFailed);
  const quote = pricing.quote;
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const lock = useRef(false);
  const request = useRef<ReturnType<typeof checkoutRequest> | null>(null);
  const account = useRef({ owner, generation: 0 });
  if (account.current.owner !== owner) account.current = { owner, generation: account.current.generation + 1 };
  const generation = account.current.generation;
  const [pendingRecord, setPendingRecord] = useState(() => readPendingCheckout(owner));
  const pending = pendingRecord?.owner === owner ? pendingRecord : null;
  const recovered = useRef<string | null>(null);
  const alive = useRef(true);
  const busy = submitting || !!orders.pendingId;
  const hasService = !!selectedEPal && (!activeServiceId || !!service);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { lock.current = false; request.current = readPendingCheckout(owner); setPendingRecord(request.current); setSubmitting(false); setPaymentError(''); recovered.current = null; }, [owner]);
  useEffect(() => { setPaymentError(''); }, [pricing.key]);
  useEffect(() => {
    if (!pending || lock.current || recovered.current === pending.input.requestId) return;
    const saved = orders.items.find(order => order.role === 'BUYER' && order.userId === owner && order.requestId === pending.input.requestId && order.companionId === pending.input.companionId);
    if (!saved) return;
    recovered.current = pending.input.requestId;
    clearPendingCheckout(pending);
    request.current = null; setPendingRecord(null);
    navigateTo('IM'); setImTab('ORDER');
  }, [pending, orders.items, owner, navigateTo, setImTab, submitting]);
  const submit = async (retryRequest: ReturnType<typeof checkoutRequest>) => {
    if (busy || lock.current) return;
    lock.current = true;
    setSubmitting(true);
    setPaymentError('');
    const startedGeneration = generation;
    request.current = retryRequest; setPendingRecord(retryRequest); savePendingCheckout(retryRequest);
    try {
      const result = await orders.create(retryRequest.input);
      if (!alive.current || account.current.generation !== startedGeneration) return;
      if (!result) {
        const rejection = orders.getError?.() || orders.error;
        setPaymentError(rejection || copy.failed);
        if (definitiveCheckoutRejection(rejection)) {
          clearPendingCheckout(retryRequest); request.current = null; setPendingRecord(null);
          if (rejection === 'ORDER_PRICE_CHANGED') pricing.retry();
        }
        return;
      }
      clearPendingCheckout(retryRequest);
      request.current = null; setPendingRecord(null);
      navigateTo('IM');
      setImTab('ORDER');
    } catch (error) {
      if (alive.current && account.current.generation === startedGeneration) setPaymentError(error instanceof Error ? error.message : copy.failed);
    } finally {
      if (alive.current && account.current.generation === startedGeneration) { lock.current = false; setSubmitting(false); }
    }
  };
  const paymentMatches = !pending || (!!quote && matchesCheckout(pending, input, quote.totalPrice));
  const pay = () => {
    if (!quote || pricing.loading || !hasService || !paymentMatches || busy || lock.current) return;
    return submit(pending || request.current || checkoutRequest(input, quote.totalPrice, owner));
  };
  const price = (value: number | undefined) => value ?? '-';
  const error = paymentError;
  return <motion.div key="order" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
    dir={orderDirection(locale)} className="min-h-screen pb-40 pt-6 px-6 space-y-6">
    <div className="flex items-center gap-4">
      <button type="button" aria-label={copy.back} disabled={busy} onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10 disabled:opacity-40"><ArrowLeft className="w-5 h-5 rtl:rotate-180" /></button>
      <h1 className="text-xl font-bold">{copy.confirmTitle}</h1>
    </div>
    {selectedEPal && <GlassCard className="p-4 flex gap-4">
      <div className="w-20 h-28 rounded-xl overflow-hidden shrink-0 border border-white/10">
        <img src={service?.posterUrl || selectedEPal.avatarUrl} alt={selectedEPal.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
      <div className="min-w-0 flex flex-col justify-center space-y-1">
        <h2 className="text-lg font-bold break-words">{quote?.serviceName || service?.name || selectedEPal.game}</h2>
        <p className="text-sm font-bold break-words">{selectedEPal.name}</p>
        <p className="text-xs text-gray-400 break-all" dir="ltr">{selectedEPal.id.slice(0, 8)}</p>
      </div>
    </GlassCard>}
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-gray-500 uppercase px-1">{copy.serviceType}</h3>
      <button type="button" aria-label={copy.selectServiceLabel} disabled={busy || !selectedEPal?.services?.length} onClick={() => setShowServiceTypeModal(true)}
        className="w-full flex justify-between items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 text-start disabled:opacity-40">
        <div className="min-w-0 space-y-1">
          <span className="text-sm font-bold block break-words">{quote?.serviceName || service?.name || copy.selectService}</span>
          <span className="text-xs text-purple-400 font-bold flex items-center gap-1"><bdi>{price(quote?.unitPrice)}</bdi><CoinIcon /> / {quote?.unit || '-'}</span>
        </div><ChevronRight className="w-4 h-4 text-gray-500 shrink-0 rtl:rotate-180" />
      </button>
    </div>
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-3 px-1">
        <h3 className="text-xs font-bold text-gray-500 uppercase">{copy.quantity}</h3>
        <span className="text-purple-400 font-bold text-sm"><bdi>{quantity}</bdi> {quote?.unit || ''}</span>
      </div>
      <div className="flex flex-wrap gap-3 items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
        <span className="text-sm font-bold text-gray-300">{copy.selectUnits}</span>
        <div className="flex items-center gap-4" dir="ltr">
          <button type="button" aria-label={copy.decrease} disabled={busy || quantity <= 1} onClick={() => setOrderQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center disabled:opacity-40"><Minus className="w-4 h-4" /></button>
          <span className="text-lg font-bold w-10 text-center">{quantity}</span>
          <button type="button" aria-label={copy.increase} disabled={busy || quantity >= 100} onClick={() => setOrderQuantity(Math.min(100, quantity + 1))} className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center disabled:opacity-40"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-gray-500 uppercase px-1">{copy.priceSummary}</h3>
      <GlassCard className="p-5 space-y-4">
        {pricing.loading && <p role="status" className="text-sm text-gray-400 flex items-center gap-2"><LoaderCircle className="w-4 h-4 animate-spin" />{copy.quoteLoading}</p>}
        {(pricing.error || !hasService) && <div role="alert" className="space-y-2 text-sm text-red-400"><p className="break-words">{!hasService ? copy.missingService : orderError(pricing.error, locale)}</p><button type="button" onClick={pricing.retry} disabled={busy} className="inline-flex gap-2 items-center text-purple-400"><RefreshCw className="w-4 h-4" />{copy.retry}</button></div>}
        <div className="flex justify-between gap-3 text-sm"><span className="text-gray-400">{copy.subtotal}</span><span className="font-bold flex items-center gap-1"><bdi>{price(quote?.subtotal)}</bdi><CoinIcon /></span></div>
        <button type="button" disabled={busy || (!orders.coupons.length && !selectedCoupon)} onClick={() => setShowCouponModal(true)} className="w-full flex justify-between items-center gap-3 text-sm disabled:opacity-60">
          <span className="text-gray-400">{copy.coupon}</span><span className="flex items-center gap-1 text-purple-400 min-w-0"><span className="break-words">{selectedCoupon?.name || (orders.coupons.length ? copy.selectCoupon : copy.noCoupons)}</span><ChevronRight className="w-3.5 h-3.5 shrink-0 rtl:rotate-180" /></span>
        </button>
        <div className="flex justify-between text-sm"><span className="text-gray-400">{copy.discount}</span><span className="font-bold text-green-400 flex items-center gap-1"><bdi>{quote ? `-${quote.discount}` : '-'}</bdi><CoinIcon /></span></div>
        <div className="h-px bg-white/10" />
        <div className="flex justify-between items-center gap-3"><span className="font-bold">{copy.finalPrice}</span><span className="text-2xl font-bold text-purple-400 flex items-center gap-1.5"><bdi aria-label={copy.quotedTotal}>{price(quote?.totalPrice)}</bdi><CoinIcon className="w-5 h-5" /></span></div>
      </GlassCard>
      {error && <p role="alert" className="text-sm text-red-400 break-words">{orderError(error, locale)}</p>}
      {pending && !submitting && <div role="status" className="space-y-3 text-sm text-amber-300">
        <p>{copy.pendingPayment}</p><p>{copy.previousTotal}: <bdi>{pending.input.expectedTotal}</bdi></p>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={() => submit(pending)} className="inline-flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-40"><RefreshCw className="w-4 h-4" />{copy.retryPayment}</button>
          <button type="button" disabled={busy || orders.loading} onClick={async () => { try { await orders.refresh(); } catch (failure) { setPaymentError(failure instanceof Error ? failure.message : copy.failed); } }} className="inline-flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-40"><RefreshCw className="w-4 h-4" />{copy.refresh}</button>
        </div>
      </div>}
    </div>
    <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 bg-gradient-to-t from-[#0f071a] to-[#0f071a]/95">
      <div className="max-w-md mx-auto">
        <button type="button" aria-label={copy.pay} disabled={busy || pricing.loading || !quote || !hasService || !paymentMatches} onClick={pay}
          className="w-full py-4 rounded-2xl bg-purple-600 font-bold text-lg shadow-[0_0_30px_rgba(168,85,247,0.4)] text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {busy && <LoaderCircle className="w-5 h-5 animate-spin" />}{busy ? copy.paying : copy.pay}
        </button>
      </div>
    </div>
    <AnimatePresence>
      {showCouponModal && <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (!busy) setShowCouponModal(false); }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
        <motion.div role="dialog" aria-modal="true" aria-label={copy.selectCoupon} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          className="fixed bottom-0 left-0 right-0 bg-[#1a0b2e] rounded-t-[32px] border-t border-white/10 z-[101] max-w-md mx-auto p-6 pb-12 max-h-[85dvh] overflow-y-auto space-y-6">
          <div className="flex justify-between gap-3 items-center"><h2 className="text-xl font-bold">{copy.selectCoupon}</h2><button type="button" aria-label={copy.close} disabled={busy} onClick={() => setShowCouponModal(false)} className="p-2"><X className="w-5 h-5" /></button></div>
          <div className="space-y-3">
            <button type="button" disabled={busy} onClick={() => { setSelectedCoupon(null); setShowCouponModal(false); }} className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 text-start">{copy.noCoupon}</button>
            {orders.coupons.map(coupon => <button type="button" key={coupon.id} disabled={busy} onClick={() => { setSelectedCoupon(coupon); setShowCouponModal(false); }}
              className={`w-full p-4 rounded-2xl border flex items-center justify-between gap-3 text-start ${selectedCoupon?.id === coupon.id ? 'bg-purple-600/20 border-purple-500/50' : 'bg-white/5 border-white/10'}`}>
              <div className="min-w-0 space-y-1"><p className="font-bold break-words">{coupon.name}</p><p className="text-xs text-gray-400"><bdi>{coupon.discount}{coupon.type === 'PERCENTAGE' ? '%' : ''}</bdi>{coupon.minSpend != null && <span> · {copy.minSpend} <bdi>{coupon.minSpend}</bdi></span>}</p></div>
              {selectedCoupon?.id === coupon.id && <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />}
            </button>)}
          </div>
        </motion.div>
      </>}
      {showServiceTypeModal && <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (!busy) setShowServiceTypeModal(false); }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
        <motion.div role="dialog" aria-modal="true" aria-label={copy.selectService} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          className="fixed bottom-0 left-0 right-0 bg-[#1a0b2e] rounded-t-[32px] border-t border-white/10 z-[101] max-w-md mx-auto p-6 pb-12 max-h-[85dvh] overflow-y-auto space-y-6">
          <div className="flex justify-between items-center gap-3"><h2 className="text-xl font-bold">{copy.selectService}</h2><button type="button" aria-label={copy.close} disabled={busy} onClick={() => setShowServiceTypeModal(false)} className="p-2"><X className="w-5 h-5" /></button></div>
          <div className="space-y-3">
            {selectedEPal?.services?.map(item => <button type="button" key={item.id} aria-pressed={activeServiceId === item.id} disabled={busy}
              onClick={() => { setActiveServiceId(item.id); setSelectedVariant(item.variants[0] ?? null); setShowServiceTypeModal(false); }}
              className={`w-full p-4 rounded-2xl border flex items-center justify-between gap-3 text-start ${activeServiceId === item.id ? 'bg-purple-600/20 border-purple-500/50' : 'bg-white/5 border-white/10'}`}>
              <p className="font-bold min-w-0 break-words">{item.name}</p>{activeServiceId === item.id && <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />}
            </button>)}
          </div>
        </motion.div>
      </>}
    </AnimatePresence>
  </motion.div>;
}
