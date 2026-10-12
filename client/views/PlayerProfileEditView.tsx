import React from 'react';
import { ArrowLeft, Image, Mic2, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../app/AppContext';
import { ServiceFields } from '../components/companion/ServiceFields';
import { useCompanionProfile } from '../hooks/useCompanionProfile';

const messages: Record<string, { en: string; ar: string }> = {
  COMPANION_NOT_FOUND: { en: 'No companion profile is linked to this account.', ar: 'لا يوجد ملف مرافق مرتبط بهذا الحساب.' },
  COMPANION_FORBIDDEN: { en: 'This profile cannot be edited.', ar: 'لا يمكن تعديل هذا الملف.' },
  COMPANION_PROFILE_STALE: { en: 'This profile changed elsewhere. Reload to review the latest version.', ar: 'تم تعديل هذا الملف في مكان آخر. أعد التحميل لمراجعة أحدث نسخة.' },
  COMPANION_SERVICES_INVALID: { en: 'Service IDs have changed. Reload the profile.', ar: 'تغيرت معرفات الخدمات. أعد تحميل الملف.' },
  COMPANION_SAVE_FAILED: { en: 'Could not save. Your changes are still here.', ar: 'تعذر الحفظ. ما زالت تعديلاتك موجودة.' },
  INPUT_INVALID: { en: 'Check the entered names, prices, and units.', ar: 'تحقق من الأسماء والأسعار والوحدات المدخلة.' },
  AUTH_UNAUTHORIZED: { en: 'Your session expired. Sign in again.', ar: 'انتهت الجلسة. سجل الدخول مجددا.' },
  AUTH_PROFILE_INCOMPLETE: { en: 'Complete your account profile before editing.', ar: 'أكمل ملف حسابك قبل التعديل.' },
  PRICE_OUT_OF_LEVEL_BAND: { en: 'Primary price is outside the allowed range.', ar: 'سعر الخدمة الأساسية خارج النطاق المسموح.' },
  VALIDATION_gameName: { en: 'Enter a primary service name (up to 100 characters).', ar: 'أدخل اسم الخدمة الأساسية (حتى 100 حرف).' },
  VALIDATION_hourlyRate: { en: 'Enter a valid primary price (up to two decimals).', ar: 'أدخل سعرا صحيحا للخدمة الأساسية (حتى منزلتين عشريتين).' },
  VALIDATION_intro: { en: 'Enter an introduction (up to 2000 characters).', ar: 'أدخل نبذة تعريفية (حتى 2000 حرف).' },
  VALIDATION_services: { en: 'Check service names, prices and units (maximum 20).', ar: 'تحقق من أسماء الخدمات وأسعارها ووحداتها (20 كحد أقصى).' },
};

export function PlayerProfileEditView() {
  const { locale, authToken, authUser, handleBack, notify } = useApp();
  const ar = locale === 'ar';
  const copy = ar ? { title: 'ملف اللاعب', cover: 'صورة الغلاف', upload: 'رفع صورة الغلاف غير متاح', services: 'خدمات الألعاب', add: 'إضافة خدمة جديدة', bio: 'النبذة والتعريف', introLabel: 'النبذة التعريفية', voice: 'التعريف الصوتي غير متاح', save: 'حفظ التغييرات', saving: 'جار الحفظ...', loading: 'جار تحميل الملف...', retry: 'إعادة المحاولة', reload: 'إعادة تحميل الملف', saved: 'تم تحديث الملف بنجاح.', name: 'اسم الخدمة', price: 'السعر', unit: 'الوحدة', hour: 'ساعة', match: 'مباراة', primary: 'الخدمة الأساسية', primaryName: 'اسم الخدمة الأساسية', primaryPrice: 'سعر الخدمة الأساسية', servicePrice: 'سعر الخدمة', serviceUnit: 'وحدة الخدمة' } : { title: 'Player Profile', cover: 'Cover Image', upload: 'Upload Cover Image', services: 'Game Services', add: 'Add New Service', bio: 'Bio & Introduction', introLabel: 'Introduction', voice: 'Voice Intro', save: 'Save Changes', saving: 'Saving...', loading: 'Loading profile...', retry: 'Retry', reload: 'Reload profile', saved: 'Profile updated successfully.', name: 'Service name', price: 'Price', unit: 'Unit', hour: 'Hour', match: 'Match', primary: 'Primary service', primaryName: 'Primary service name', primaryPrice: 'Primary service price', servicePrice: 'Service price', serviceUnit: 'Service unit' };
  const profile = useCompanionProfile(authToken, authUser?.id);
  const error = profile.error ? messages[profile.error]?.[ar ? 'ar' : 'en'] || (ar ? 'تعذر إكمال الطلب. حاول مرة أخرى.' : 'Could not complete the request. Please retry.') : '';
  const canEdit = !!profile.draft && !profile.loading && !profile.busy;
  const addService = () => profile.edit(d => ({ ...d, services: [...d.services, { id: crypto.randomUUID(), name: '', price: '', unit: 'hr' }] }));
  const save = async () => { if (await profile.save()) { notify(copy.saved); handleBack(); } };
  return <motion.div key="player_profile_edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} dir={ar ? 'rtl' : 'ltr'} className="min-h-screen space-y-6 bg-[#0f071a] p-6 pb-32 text-white">
    <div className="flex items-center gap-4"><button aria-label={ar ? 'رجوع' : 'Back'} onClick={handleBack} className="rounded-xl border border-white/10 bg-white/5 p-2"><ArrowLeft className={`h-5 w-5 ${ar ? 'rotate-180' : ''}`} /></button><h1 className="text-xl font-bold">{copy.title}</h1></div>
    {profile.loading && !profile.draft ? <p role="status" className="text-sm text-gray-400">{copy.loading}</p> : null}
    {error && <div role="alert" className="space-y-2 rounded-lg border border-red-400/30 bg-red-900/20 p-3 text-sm text-red-200"><p>{error}</p>{profile.conflict ? <button aria-label={copy.reload} onClick={() => void profile.reload(true)} className="font-bold underline">{copy.reload}</button> : !profile.draft ? <button onClick={() => void profile.reload()} className="font-bold underline">{copy.retry}</button> : null}</div>}
    {profile.draft && <>
      <div className="space-y-2"><p className="px-2 text-[10px] font-black uppercase text-gray-500">{copy.cover}</p><button aria-label={copy.upload} disabled className="flex aspect-video max-h-48 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-white/10 bg-white/5 text-gray-500 opacity-60"><Image className="h-6 w-6" /><span className="text-xs font-bold">{copy.upload}</span></button></div>
      <div className="space-y-3"><p className="px-2 text-[10px] font-black uppercase text-gray-500">{copy.services}</p><ServiceFields id={profile.source?.id || ''} name={profile.draft.gameName} price={profile.draft.hourlyRate} unit="hr" primary copy={copy} disabled={!canEdit} onChange={patch => profile.edit(d => ({ ...d, ...patch }))} />{profile.draft.services.map(service => <ServiceFields key={service.id} {...service} copy={copy} disabled={!canEdit} onChange={patch => profile.edit(d => ({ ...d, services: d.services.map(s => s.id === service.id ? { ...s, ...patch } : s) }))} />)}<button aria-label={copy.add} disabled={!canEdit || profile.draft.services.length >= 20} onClick={addService} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-xs font-bold text-gray-400 disabled:opacity-40"><Plus className="h-4 w-4" />{copy.add}</button></div>
      <div className="space-y-2"><label className="block px-2 text-[10px] font-black uppercase text-gray-500" htmlFor="companion-intro">{copy.bio}</label><textarea id="companion-intro" aria-label={copy.introLabel} value={profile.draft.intro} maxLength={2000} disabled={!canEdit} onChange={e => profile.edit(d => ({ ...d, intro: e.target.value }))} className="h-32 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-5 font-bold text-white outline-none focus:border-purple-400 disabled:opacity-50" /></div>
      <div className="space-y-2"><p className="px-2 text-[10px] font-black uppercase text-gray-500">{copy.voice}</p><button aria-label={copy.voice} disabled className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 font-bold text-gray-500 opacity-60"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/40"><Mic2 className="h-5 w-5" /></span><span className="text-xs">{copy.voice}</span></button></div>
      <button aria-label={copy.save} disabled={!canEdit} onClick={() => void save()} className="w-full rounded-2xl bg-purple-600 py-5 text-xs font-black uppercase text-white shadow-[0_0_40px_rgba(168,85,247,0.4)] disabled:opacity-50">{profile.busy ? copy.saving : copy.save}</button>
    </>}
  </motion.div>;
}
