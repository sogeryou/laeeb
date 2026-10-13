import type { AppNotification, NotificationKind } from '@shared/notifications';

const en = {
  title: 'Notifications', back: 'Back', refresh: 'Refresh notifications', markRead: 'Mark as read', markAllRead: 'Mark all as read',
  open: 'Open notification', unread: 'Unread', read: 'Read', empty: 'No notifications yet', loading: 'Loading notifications', more: 'Load more',
  order: 'Order', application: 'Application', service: 'Service', failed: 'Could not complete this action. Please retry.',
  unavailable: 'This item is no longer available. Refresh notifications and try again.',
  unverified: 'Could not verify the notification. Please refresh.', saveFailed: 'Could not save the read status. Please retry.',
  approvedBody: 'Your companion application was approved. Open it to view the result.',
  rejectedBody: 'Your application was not approved. Open it to read the review details.',
};
const ar: Record<keyof typeof en, string> = {
  title: 'الإشعارات', back: 'رجوع', refresh: 'تحديث الإشعارات', markRead: 'تحديد كمقروء', markAllRead: 'تحديد الكل كمقروء',
  open: 'فتح الإشعار', unread: 'غير مقروء', read: 'مقروء', empty: 'لا توجد إشعارات بعد', loading: 'جار تحميل الإشعارات', more: 'تحميل المزيد',
  order: 'طلب', application: 'طلب الانضمام', service: 'الخدمة', failed: 'تعذر إكمال العملية. يرجى إعادة المحاولة.',
  unavailable: 'لم يعد هذا العنصر متاحاً. حدّث الإشعارات وحاول مجدداً.',
  unverified: 'تعذر التحقق من الإشعار. يرجى التحديث.', saveFailed: 'تعذر حفظ حالة القراءة. يرجى إعادة المحاولة.',
  approvedBody: 'تمت الموافقة على طلب انضمامك كلاعب مرافق. افتحه للاطلاع على النتيجة.',
  rejectedBody: 'لم تتم الموافقة على طلبك. افتحه لقراءة تفاصيل المراجعة.',
};
const titles: Record<NotificationKind, [string, string]> = {
  COMPANION_APPROVED: ['Application approved', 'تمت الموافقة على الطلب'],
  COMPANION_REJECTED: ['Application rejected', 'تم رفض الطلب'],
  ORDER_CREATED: ['Order placed', 'تم إنشاء الطلب'],
  ORDER_ACCEPTED: ['Order accepted', 'تم قبول الطلب'],
  ORDER_AWAITING_CONFIRMATION: ['Order awaiting confirmation', 'الطلب بانتظار التأكيد'],
  ORDER_COMPLETED: ['Order completed', 'اكتمل الطلب'],
  ORDER_CANCELLED: ['Order cancelled', 'تم إلغاء الطلب'],
  ORDER_DISPUTED: ['Order dispute opened', 'تم فتح نزاع على الطلب'],
  ORDER_REFUNDED: ['Order refunded', 'تم استرداد الطلب'],
};
export const notificationCopy = (locale: string) => locale.toLowerCase().startsWith('ar') ? ar : en;
export function notificationContent(notification: AppNotification, locale: string) {
  const copy = notificationCopy(locale);
  return {
    title: titles[notification.kind][locale.toLowerCase().startsWith('ar') ? 1 : 0],
    body: notification.kind === 'COMPANION_APPROVED' ? copy.approvedBody
      : notification.kind === 'COMPANION_REJECTED' ? copy.rejectedBody
      : `${copy.service}: ${notification.serviceName || notification.target.id}`,
  };
}
export function notificationErrorText(code: string, locale: string) {
  const copy = notificationCopy(locale);
  return code === 'NOTIFICATION_TARGET_UNAVAILABLE' ? copy.unavailable
    : code === 'NOTIFICATION_RESPONSE_INVALID' ? copy.unverified
    : code === 'NOTIFICATION_SAVE_FAILED' ? copy.saveFailed : copy.failed;
}
