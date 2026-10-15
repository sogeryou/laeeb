export function gameDiscoveryCopy(locale: string) {
  const ar = locale.toLowerCase().startsWith('ar');
  const format = (n: number) => new Intl.NumberFormat(ar ? 'ar' : 'en', { maximumFractionDigits: 2 }).format(n);
  return ar ? {
    filter: 'تصفية', filters: 'عوامل التصفية', back: 'رجوع', cancel: 'إلغاء', apply: 'تطبيق التصفية', reset: 'إعادة تعيين الكل',
    defaultSort: 'الافتراضي', orders: 'الطلبات', score: 'التقييم', status: 'الحالة', gender: 'الجنس', all: 'الكل', onlineOnly: 'المتصلون فقط',
    male: 'ذكر', female: 'أنثى', undisclosed: 'غير محدد', minPrice: 'الحد الأدنى للسعر', maxPrice: 'الحد الأقصى للسعر',
    priceError: 'أدخل نطاقاً صالحاً من ٠ إلى ١٠٠٠٠، بمنزلتين عشريتين كحد أقصى.',
    server: 'الخادم', platform: 'المنصة', rank: 'الرتبة', unavailable: 'غير متاح', loading: 'جارٍ التحميل', loadingMore: 'جارٍ تحميل المزيد',
    loadMore: 'تحميل المزيد', refresh: 'تحديث القائمة', retry: 'إعادة المحاولة', empty: 'لا يوجد مرافقون بهذه التصفية',
    loadError: 'تعذر تحميل القائمة. حاول مرة أخرى.', noReviews: 'لا توجد تقييمات', perHour: 'لكل ساعة',
    Online: 'متصل', Busy: 'مشغول', Offline: 'غير متصل', onlinePending: 'المتصلون: —',
    onlineCount: (n: number) => `المتصلون: ${format(n)}`, results: (n: number) => `المرافقون: ${format(n)}`,
    orderCount: (n: number) => `${format(n)} طلب`, orderPeriod: 'طلبات مكتملة ومسواة خلال آخر ٣٠ يوماً',
    ownProfile: 'ملفك الشخصي', book: (name: string) => `احجز مع ${name}`, profile: (name: string) => `ملف ${name}`, format,
  } : {
    filter: 'Filter', filters: 'Filters', back: 'Back', cancel: 'Cancel', apply: 'Apply Filters', reset: 'Reset All',
    defaultSort: 'Default', orders: 'Orders', score: 'Score', status: 'Status', gender: 'Gender', all: 'All', onlineOnly: 'Online Only',
    male: 'Male', female: 'Female', undisclosed: 'Undisclosed', minPrice: 'Minimum Price', maxPrice: 'Maximum Price',
    priceError: 'Enter a range from 0 to 10000, with at most two decimal places.',
    server: 'Server', platform: 'Platform', rank: 'Rank', unavailable: 'Unavailable', loading: 'Loading', loadingMore: 'Loading more',
    loadMore: 'Load More', refresh: 'Refresh list', retry: 'Retry', empty: 'No companions match these filters',
    loadError: 'The list could not be loaded. Please try again.', noReviews: 'No reviews', perHour: 'per hour',
    Online: 'Online', Busy: 'Busy', Offline: 'Offline', onlinePending: 'Online: —',
    onlineCount: (n: number) => `${format(n)} online`, results: (n: number) => `${format(n)} ${n === 1 ? 'companion' : 'companions'}`,
    orderCount: (n: number) => `${format(n)} ${n === 1 ? 'order' : 'orders'}`, orderPeriod: 'Completed and settled orders in the last 30 days',
    ownProfile: 'Your profile', book: (name: string) => `Book ${name}`, profile: (name: string) => `Profile of ${name}`, format,
  };
}
