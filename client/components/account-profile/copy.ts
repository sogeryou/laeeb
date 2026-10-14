const en = {
  title: 'Edit Profile', back: 'Back', nickname: 'Nickname', bio: 'Bio', avatar: 'Choose avatar', save: 'Save Changes',
  reload: 'Reload saved profile', loading: 'Loading profile', saving: 'Saving', uploading: 'Uploading photo', saved: 'Profile saved',
  invalid: 'Use a nickname of 2-32 characters and a bio of up to 280 characters.',
  stale: 'Your profile changed elsewhere. Reload the saved profile before editing again.',
  taken: 'This nickname is already in use.', avatarFailed: 'The photo could not be used. Try again or choose a system avatar.',
  session: 'Sign in again to edit your profile.', failed: 'Your profile could not be saved. Your changes are still here. Try again.',
  loadFailed: 'Your profile could not be loaded. Try again.',
};
const ar: typeof en = {
  title: 'تعديل الملف الشخصي', back: 'رجوع', nickname: 'الاسم المستعار', bio: 'نبذة شخصية', avatar: 'اختيار صورة', save: 'حفظ التغييرات',
  reload: 'إعادة تحميل الملف المحفوظ', loading: 'جارٍ تحميل الملف الشخصي', saving: 'جارٍ الحفظ', uploading: 'جارٍ رفع الصورة', saved: 'تم حفظ الملف الشخصي',
  invalid: 'استخدم اسماً من 2 إلى 32 حرفاً ونبذة لا تتجاوز 280 حرفاً.',
  stale: 'تم تعديل ملفك في مكان آخر. أعد تحميل الملف المحفوظ قبل التعديل.',
  taken: 'هذا الاسم المستعار مستخدم بالفعل.', avatarFailed: 'تعذر استخدام الصورة. حاول مجدداً أو اختر صورة جاهزة.',
  session: 'سجّل الدخول مجدداً لتعديل ملفك.', failed: 'تعذر حفظ الملف الشخصي. تغييراتك ما زالت هنا. حاول مجدداً.',
  loadFailed: 'تعذر تحميل الملف الشخصي. حاول مجدداً.',
};
export const accountProfileCopy = (locale: string) => locale.toLowerCase().startsWith('ar') ? ar : en;
export function accountProfileError(code: string, locale: string, hasProfile: boolean) {
  const c = accountProfileCopy(locale);
  if (code === 'PROFILE_STALE') return c.stale;
  if (code === 'PROFILE_NICKNAME_TAKEN') return c.taken;
  if (/INPUT_INVALID|PROFILE_INPUT_INVALID/.test(code)) return c.invalid;
  if (/AVATAR|UPLOAD/.test(code)) return c.avatarFailed;
  if (/SESSION|UNAUTHORIZED|PROFILE_INCOMPLETE/.test(code)) return c.session;
  return hasProfile ? c.failed : c.loadFailed;
}
