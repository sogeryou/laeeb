import React, { useEffect, useRef, useState } from 'react';
import { FileText, LoaderCircle, MessageCircle, RefreshCw, Star } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { CoinIcon } from '../ui/CoinIcon';
import { canReview, orderDate } from './orderModel';
import { orderCopy, orderDirection } from './orderCopy';
import { orderError } from './orderError';

export function OrderList({ variant = 'cards', tab = 'ALL', search = '' }: { variant?: 'cards' | 'rows'; tab?: string; search?: string }) {
  const { orders, imOrders, locale, navigateTo, setSelectedOrder, setShowOrderDetailModal, setShowReviewModal, authUser } = useApp();
  const copy = orderCopy(locale);
  const [refreshError, setRefreshError] = useState('');
  const account = useRef({ owner: authUser?.id, generation: 0 });
  if (account.current.owner !== authUser?.id) account.current = { owner: authUser?.id, generation: account.current.generation + 1 };
  useEffect(() => { setRefreshError(''); }, [authUser?.id]);
  const rows = imOrders.filter(order => (tab === 'ALL' || order.status === tab) &&
    (!search || `${order.participant?.name ?? ''} ${order.serviceName}`.toLowerCase().includes(search.toLowerCase())));
  const refresh = async () => { const generation = account.current.generation; setRefreshError(''); try { await orders.refresh(); } catch (error) { if (account.current.generation === generation) setRefreshError(error instanceof Error ? error.message : copy.failed); } };
  const error = refreshError || orders.error;
  return <div dir={orderDirection(locale)} className="space-y-4" aria-busy={orders.loading}>
    <div className="flex justify-end">
      <button type="button" aria-label={copy.refresh} title={copy.refresh} disabled={orders.loading || !!orders.pendingId} onClick={refresh} className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-40">
        {orders.loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
      </button>
    </div>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm text-red-400">
      <p className="min-w-0 break-words">{orderError(error, locale)}</p><button type="button" onClick={refresh} disabled={orders.loading || !!orders.pendingId} className="inline-flex items-center gap-2 text-purple-400 disabled:opacity-40"><RefreshCw className="w-4 h-4" />{copy.retry}</button>
    </div>}
    {orders.loading && !rows.length && <p role="status" className="flex justify-center items-center gap-2 py-16 text-gray-400"><LoaderCircle className="w-5 h-5 animate-spin" />{copy.loading}</p>}
    {!orders.loading && !error && !rows.length && <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500"><FileText className="w-16 h-16" /><p className="font-bold">{copy.empty}</p></div>}
    <div className={variant === 'cards' ? 'space-y-6' : 'space-y-3'}>
      {rows.map(order => {
        const source = orders.items.find(item => item.id === order.id);
        if (!source) return null;
        const participant = source.participant;
        const status = copy[source.status];
        const statusClass = source.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : ['CANCELLED', 'REFUNDED', 'DISPUTED'].includes(source.status) ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400';
        return <article key={order.id} className={variant === 'cards' ? 'p-5 bg-white/5 rounded-[24px] border border-white/10 space-y-4' : 'py-4 border-b border-white/5 space-y-3'}>
          <div className="flex items-start gap-3">
            {participant?.avatarUrl && <img src={participant.avatarUrl} alt={participant.name} className="w-14 h-14 rounded-full object-cover border border-white/10 shrink-0" referrerPolicy="no-referrer" />}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-bold text-white break-words">{participant?.name}</p>
              <h2 className="text-sm font-bold text-gray-300 break-words">{source.serviceName}</h2>
              <p className="text-[10px] text-gray-500">{orderDate(source.createdAt, locale)} <span className="text-purple-400">{source.role === 'BUYER' ? copy.buyer : copy.companion}</span></p>
            </div>
            <span className={`max-w-[40%] break-words text-[10px] font-bold px-2 py-1 rounded-md ${statusClass}`}>{status}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2"><CoinIcon className="w-4 h-4" /><span dir="ltr" className="font-black text-white text-xl">{source.totalPrice}</span></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-label={`Order ${source.id}`} onClick={() => { setSelectedOrder(order); setShowOrderDetailModal(true); }} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:bg-white/10">{copy.details}</button>
              {canReview(source) && <button type="button" disabled={!!orders.pendingId} onClick={() => { setSelectedOrder(order); setShowReviewModal(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-xl text-xs font-bold disabled:opacity-40"><Star className="w-3.5 h-3.5" />{copy.rate}</button>}
              {participant && <button type="button" onClick={() => navigateTo('IM_DETAIL', participant)} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-xl text-xs font-bold"><MessageCircle className="w-3.5 h-3.5" />{copy.chat}</button>}
            </div>
          </div>
        </article>;
      })}
    </div>
  </div>;
}
