const messages = {
  balance: ['Your coin balance is too low for this order.', 'رصيد العملات غير كافٍ لهذا الطلب.'],
  coupon: ['This coupon is no longer available. Choose another coupon or remove it.', 'لم تعد هذه القسيمة متاحة. اختر قسيمة أخرى أو أزلها.'],
  couponMinimum: ['This order does not meet the coupon minimum spend.', 'لا يحقق هذا الطلب الحد الأدنى للإنفاق للقسيمة.'],
  price: ['The price has changed. Refresh the quote before paying.', 'تغير السعر. حدّث السعر المعروض قبل الدفع.'],
  companion: ['This companion is not available to accept orders.', 'هذا اللاعب المرافق غير متاح لقبول الطلبات.'],
  active: ['You already have an active order with this companion. Open your orders to continue.', 'لديك طلب جارٍ مع هذا اللاعب المرافق. افتح طلباتك للمتابعة.'],
  service: ['This service is unavailable. Select another service.', 'هذه الخدمة غير متاحة. اختر خدمة أخرى.'],
  evidence: ['Add 1 to 9 valid proof links or text entries.', 'أضف من ١ إلى ٩ روابط أو نصوص إثبات صالحة.'],
  reason: ['Enter a dispute reason of up to 1000 characters.', 'أدخل سببًا للنزاع لا يتجاوز ١٠٠٠ حرف.'],
  save: ['The order could not be saved. Retry the same operation.', 'تعذر حفظ الطلب. أعد محاولة نفس العملية.'],
  permission: ['You cannot perform this action on this order.', 'لا يمكنك تنفيذ هذا الإجراء على هذا الطلب.'],
  legacy: ['This historical order is read-only.', 'هذا الطلب القديم متاح للعرض فقط.'],
  state: ['The order has changed. Refresh your orders to see its current status.', 'تغير الطلب. حدّث طلباتك لعرض حالته الحالية.'],
  auth: ['Sign in again to continue.', 'سجّل الدخول مجددًا للمتابعة.'],
  duplicateReview: ['You have already submitted a review for this order.', 'لقد أرسلت تقييمًا لهذا الطلب بالفعل.'],
  request: ['This payment request does not match the original attempt. Refresh orders to check it.', 'طلب الدفع هذا لا يطابق المحاولة الأصلية. حدّث الطلبات للتحقق.'],
  load: ['Could not load orders. Please retry.', 'تعذر تحميل الطلبات. يرجى إعادة المحاولة.'],
  validation: ['Check the order information and try again.', 'تحقق من معلومات الطلب وحاول مجددًا.'],
} as const;
const codes: Record<string, keyof typeof messages> = {
  ORDER_INSUFFICIENT_BALANCE: 'balance', INSUFFICIENT_BALANCE: 'balance', WALLET_INSUFFICIENT_BALANCE: 'balance',
  COUPON_INVALID: 'coupon', COUPON_USED: 'coupon', COUPON_TEMPLATE_MISSING: 'coupon', COUPON_MIN_SPEND: 'couponMinimum',
  ORDER_PRICE_CHANGED: 'price', ORDER_COMPANION_NOT_FOUND: 'companion', ORDER_COMPANION_UNAVAILABLE: 'companion',
  ORDER_ONGOING_EXISTS: 'active', ORDER_SERVICE_NOT_FOUND: 'service', ORDER_AMOUNT_INVALID: 'service', PRICE_OUT_OF_LEVEL_BAND: 'service',
  ORDER_EVIDENCE_REQUIRED: 'evidence', ORDER_EVIDENCE_INVALID: 'evidence', EVIDENCE_REQUIRED: 'evidence',
  ORDER_DISPUTE_REASON_REQUIRED: 'reason', ORDER_DISPUTE_REASON_INVALID: 'reason', DISPUTE_REASON_REQUIRED: 'reason',
  ORDER_PERSIST_FAILED: 'save', ORDER_PERSISTENCE_FAILED: 'save', ORDER_SAVE_FAILED: 'save', ORDER_PERSISTENCE_UNAVAILABLE: 'save',
  ORDER_FORBIDDEN: 'permission', REVIEW_BUYER_ONLY: 'permission', ORDER_ACTION_BLOCKED: 'permission', SELF_ORDER_NOT_ALLOWED: 'permission',
  ORDER_LEGACY_READ_ONLY: 'legacy', ORDER_LEGACY_UNFUNDED: 'legacy', ORDER_LEGACY: 'legacy', LEGACY_ORDER_RECONCILIATION_REQUIRED: 'legacy',
  ORDER_NOT_FOUND: 'state', ORDER_INVALID_STATE: 'state', ORDER_STATE_INVALID: 'state', ORDER_INVALID_TRANSITION: 'state', REVIEW_ORDER_NOT_COMPLETED: 'state', ESCROW_INVALID: 'state',
  WALLET_NOT_FOUND: 'balance', COMPANION_NOT_FOUND: 'companion', VALIDATION_ERROR: 'validation', VALIDATION_FAILED: 'validation',
  AUTH_REQUIRED: 'auth', SESSION_CHANGED: 'auth', REVIEW_ALREADY_EXISTS: 'duplicateReview', ORDER_REQUEST_ID_CONFLICT: 'request',
  ORDER_RESPONSE_INVALID: 'load', ORDER_LOAD_FAILED: 'load',
};
export function orderError(value: string, locale: string) {
  const category = codes[value];
  return category ? messages[category][locale.toLowerCase().startsWith('ar') ? 1 : 0] : value;
}

const rejectedCreates = new Set([
  'WALLET_INSUFFICIENT_BALANCE', 'ORDER_INSUFFICIENT_BALANCE', 'INSUFFICIENT_BALANCE', 'WALLET_NOT_FOUND',
  'COUPON_INVALID', 'COUPON_TEMPLATE_MISSING', 'COUPON_MIN_SPEND', 'ORDER_PRICE_CHANGED',
  'ORDER_COMPANION_NOT_FOUND', 'ORDER_COMPANION_UNAVAILABLE', 'ORDER_SERVICE_NOT_FOUND', 'ORDER_AMOUNT_INVALID',
  'ORDER_ACTION_BLOCKED', 'SELF_ORDER_NOT_ALLOWED', 'ORDER_ONGOING_EXISTS', 'ORDER_FORBIDDEN', 'PRICE_OUT_OF_LEVEL_BAND',
  'VALIDATION_ERROR', 'VALIDATION_FAILED', 'ORDER_PERSISTENCE_UNAVAILABLE',
]);
export function definitiveCheckoutRejection(code: string) { return rejectedCreates.has(code); }
