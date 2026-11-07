export const postCopy = (locale: string) => locale === 'ar' ? {
  create: 'إنشاء منشور', cancel: 'إلغاء', publish: 'نشر', publishing: 'جارٍ الإرسال…',
  content: 'محتوى المنشور', placeholder: 'شارك لحظة مع المجتمع…',
  hint: 'يظهر المنشور للجميع وتُحتسب النقاط بعد الموافقة فقط.',
  public: 'منشورات المجتمع', mine: 'منشوراتي وحالة المراجعة',
  empty: 'لا توجد منشورات بعد', more: 'عرض المزيد', error: 'تعذّر الإرسال. احتفظنا بالنص، حاول مجددًا.',
  submitted: 'تم استلام المنشور. تابع حالة المراجعة في منشوراتي.',
  statuses: { PENDING: 'قيد المراجعة', APPROVED: 'مقبول', REJECTED: 'مرفوض', REMOVED: 'تمت الإزالة' },
} : {
  create: 'Create post', cancel: 'Cancel', publish: 'Publish', publishing: 'Submitting…',
  content: 'Post content', placeholder: 'Share a moment with the community…',
  hint: 'Posts become public and earn task points only after approval.',
  public: 'Community posts', mine: 'My posts & review status', empty: 'No posts yet', more: 'Load more',
  error: 'Could not submit. Your draft is safe — please try again.',
  submitted: 'Submission received. Check My posts for its review status.',
  statuses: { PENDING: 'Pending review', APPROVED: 'Approved', REJECTED: 'Rejected', REMOVED: 'Removed' },
};
