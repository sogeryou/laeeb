import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../app/AppContext';
import { OrderList } from '../components/orders/OrderList';
import { orderCopy, orderDirection } from '../components/orders/orderCopy';

export function MyOrdersView() {
  const { locale, handleBack, orderTab, setOrderTab } = useApp();
  const copy = orderCopy(locale);
  const tabs = [{ id: 'ALL', label: copy.all }, { id: 'PENDING', label: copy.pending }, { id: 'ONGOING', label: copy.ongoing }, { id: 'COMPLETED', label: copy.completed }] as const;
  return <motion.div key="my_orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
    dir={orderDirection(locale)} className="min-h-screen pb-32 bg-[#0f071a] p-6 space-y-6">
    <div className="flex items-center justify-between gap-4">
      <button type="button" aria-label={copy.back} onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10"><ArrowLeft className="w-5 h-5 rtl:rotate-180" /></button>
      <h1 className="text-xl font-bold text-center">{copy.myOrders}</h1><div className="w-10 shrink-0" />
    </div>
    <div role="tablist" aria-label={copy.myOrders} className="grid grid-cols-[0.55fr_1fr_1fr_1.3fr] gap-1 p-1 bg-white/5 rounded-2xl border border-white/10">
      {tabs.map(tab => <button type="button" role="tab" aria-selected={orderTab === tab.id} key={tab.id} onClick={() => setOrderTab(tab.id)}
        className={`flex-1 min-w-0 py-3 px-1 rounded-xl text-[10px] font-black uppercase break-words transition-all ${orderTab === tab.id ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{tab.label}</button>)}
    </div>
    <OrderList tab={orderTab} />
  </motion.div>;
}
