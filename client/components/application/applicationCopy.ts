const errors: Record<string, [string, string]> = {
  INPUT_INVALID: ['Check the application fields and try again.', 'تحقق من بيانات الطلب وحاول مرة أخرى.'],
  COMPANION_APPLICATION_FORBIDDEN: ['Applications are unavailable for this account.', 'التقديم غير متاح لهذا الحساب.'],
  COMPANION_APPLICATION_CONFLICT: ['This application changed. Refresh to see its status.', 'تغيرت حالة الطلب. حدّث الصفحة للاطلاع عليها.'],
  COMPANION_ALREADY_EXISTS: ['You already have an approved companion profile.', 'لديك ملف مرافق معتمد بالفعل.'],
  PRICE_OUT_OF_LEVEL_BAND: ['Choose a price within the allowed range.', 'اختر سعراً ضمن النطاق المسموح.'],
  COMPANION_SAVE_FAILED: ['Your application was not saved. Retry with the same details.', 'لم يُحفظ طلبك. أعد المحاولة بنفس البيانات.'],
};

export function applicationErrorText(error: string, locale: string) {
  return errors[error]?.[locale === 'ar' ? 1 : 0] || error;
}
