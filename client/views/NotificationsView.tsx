import React from 'react';
import { ArrowLeft, Check, CheckCheck, FileText, LoaderCircle, RefreshCw, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../app/AppContext';
import { notificationContent, notificationCopy, notificationErrorText } from '../components/notifications/copy';

export function NotificationsView() {
  const { locale, handleBack, notifications, openNotification, notificationOpeningId } = useApp();
  const copy = notificationCopy(locale);
  const rtl = locale.toLowerCase().startsWith('ar');
  const busy = Boolean(notifications.pendingId || notificationOpeningId);
  return <motion.div key="notifications" dir={rtl ? 'rtl' : 'ltr'}
    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
    className="min-h-screen pb-32 bg-[#0f071a] p-6 space-y-6">
    <div className="flex items-center gap-2">
      <button type="button" aria-label={copy.back} title={copy.back} onClick={handleBack} className="h-10 w-10 shrink-0 flex items-center justify-center bg-white/5 rounded-lg border border-white/10"><ArrowLeft className="w-5 h-5" /></button>
      <div className="min-w-0 flex-1"><h1 className="text-xl font-bold">{copy.title}</h1>
        <p aria-live="polite" className="text-xs text-gray-400">{new Intl.NumberFormat(rtl ? 'ar' : 'en').format(notifications.unreadCount)} {copy.unread}</p>
      </div>
      <button type="button" aria-label={copy.refresh} title={copy.refresh} disabled={busy} onClick={() => void notifications.refresh()} className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-40"><RefreshCw className={'w-5 h-5 ' + (notifications.loading ? 'animate-spin' : '')} /></button>
      <button type="button" aria-label={copy.markAllRead} title={copy.markAllRead} disabled={busy || notifications.unreadCount === 0} onClick={() => void notifications.markAllRead()} className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-40"><CheckCheck className="w-5 h-5" /></button>
    </div>
    {notifications.error && <p role="alert" className="break-words text-sm text-red-300">{notificationErrorText(notifications.error, locale)}</p>}
    {notifications.loading && notifications.items.length === 0 && <p role="status" className="py-12 text-center text-sm text-gray-400">{copy.loading}</p>}
    {!notifications.loading && !notifications.error && notifications.items.length === 0 && <p className="py-12 text-center text-sm text-gray-400">{copy.empty}</p>}
    <div className="space-y-4">
      {notifications.items.map(item => {
        const content = notificationContent(item, locale);
        const unread = item.readAt === undefined;
        const saving = notifications.pendingId === item.id || notificationOpeningId === item.id;
        const Icon = item.target.type === 'ORDER' ? ShoppingCart : FileText;
        return <article key={item.id} className={'p-5 space-y-2 border-b border-white/5 last:border-0 ' + (unread ? 'bg-purple-500/5' : '')}>
          <div className="flex items-start justify-between gap-3 text-xs text-gray-400">
            <div className="flex min-w-0 flex-wrap items-center gap-2"><Icon className="h-4 w-4 shrink-0" /><span>{item.target.type === 'ORDER' ? copy.order : copy.application}</span>
              <span className={unread ? 'text-amber-300' : 'text-gray-500'}>{unread ? copy.unread : copy.read}</span>
            </div>
            <time dateTime={new Date(item.createdAt).toISOString()} className="shrink-0 max-w-[45%] text-end text-[10px]">{new Date(item.createdAt).toLocaleString(rtl ? 'ar' : 'en')}</time>
          </div>
          <div className="flex items-start gap-3">
            <button type="button" aria-label={copy.open + ': ' + content.title} title={copy.open} disabled={busy}
              onClick={() => void openNotification(item)} className="min-w-0 flex-1 text-start space-y-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400 disabled:opacity-60">
              <h3 className="font-bold text-white [overflow-wrap:anywhere]">{content.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed [overflow-wrap:anywhere]">{content.body}</p>
            </button>
            {unread ? <button type="button" aria-label={copy.markRead} title={copy.markRead} disabled={busy}
              onClick={() => void notifications.markRead(item.id)} className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-40">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button> : <span title={copy.read} aria-label={copy.read} className="h-9 w-9 shrink-0 flex items-center justify-center text-green-400"><CheckCheck className="h-4 w-4" /></span>}
          </div>
        </article>;
      })}
    </div>
    {notifications.nextCursor && <button type="button" disabled={busy || notifications.loadingMore} onClick={() => void notifications.loadMore()}
      className="w-full py-3 text-sm rounded-lg border border-white/10 text-gray-300 disabled:opacity-40">{notifications.loadingMore ? copy.loading : copy.more}</button>}
  </motion.div>;
}
