import React, { useState } from 'react';
import { ArrowLeft, Camera, Check, LoaderCircle, RefreshCw, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { ACCOUNT_BIO_MAX_LENGTH, ACCOUNT_BIO_RAW_MAX_LENGTH } from '@shared/accountProfile';
import { isAuthNicknameValid } from '@shared/auth';
import { useApp } from '../app/AppContext';
import { AvatarPicker } from '../features/auth/AvatarPicker';
import { authCopy } from '../features/auth/copy';
import { accountProfileCopy, accountProfileError } from '../components/account-profile/copy';
import { validBio, visibleLength } from '../components/account-profile/model';
import '../features/auth/auth.css';

export function SettingsEditProfileView() {
  const { locale, authUser, accountProfile: editor, setCurrentView } = useApp();
  const c = accountProfileCopy(locale), rtl = locale.toLowerCase().startsWith('ar');
  const [pickerAccount, setPickerAccount] = useState<number | null>(null);
  const busy = editor.saving || editor.uploading;
  const disabled = busy || !editor.profile;
  const invalidName = Boolean(editor.profile) && !isAuthNicknameValid(editor.draft.username.trim());
  const invalidBio = !validBio(editor.draft.bio);
  const number = new Intl.NumberFormat(rtl ? 'ar' : 'en');
  return <motion.div key="settings-edit-profile" dir={rtl ? 'rtl' : 'ltr'} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
    className="min-h-screen pb-32 bg-[#0f071a] p-6 space-y-8">
    <header className="flex items-center gap-3">
      <button type="button" title={c.back} aria-label={c.back} onClick={() => setCurrentView('SETTINGS')} className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-white/5 border border-white/10"><ArrowLeft className={'h-5 w-5 ' + (rtl ? 'rotate-180' : '')} /></button>
      <h1 className="min-w-0 flex-1 text-center text-xl font-bold [overflow-wrap:anywhere]">{c.title}</h1>
      <button type="button" title={c.reload} aria-label={c.reload} disabled={busy || editor.loading} onClick={() => void editor.reload(true)} className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-40"><RefreshCw className={'h-5 w-5 ' + (editor.loading ? 'animate-spin' : '')} /></button>
    </header>
    {editor.error && <p role="alert" className="text-sm text-red-300 [overflow-wrap:anywhere]">{accountProfileError(editor.error, locale, Boolean(editor.profile))}</p>}
    {editor.loading && !editor.profile && <p role="status" className="text-center text-sm text-gray-400">{c.loading}</p>}
    <form onSubmit={event => { event.preventDefault(); void editor.save(); }} className="flex flex-col items-center gap-6 py-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-purple-500/50 bg-white/5 flex items-center justify-center">
          {editor.avatarPreview ? <img src={editor.avatarPreview} alt={c.avatar} className="w-full h-full object-cover" /> : <UserRound className="w-10 h-10 text-gray-500" />}
        </div>
        <button type="button" title={c.avatar} aria-label={c.avatar} disabled={disabled} onClick={() => setPickerAccount(editor.account)} className="absolute -bottom-2 -end-2 h-10 w-10 flex items-center justify-center bg-purple-600 rounded-lg border-2 border-[#0f071a] disabled:opacity-40"><Camera className="h-4 w-4" /></button>
      </div>
      <div className="w-full space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-400"><label htmlFor="account-nickname">{c.nickname}</label><span id="account-nickname-count" className={invalidName ? 'text-red-300' : ''}>{number.format(visibleLength(editor.draft.username.trim()))}/{number.format(32)}</span></div>
          <input id="account-nickname" type="text" autoComplete="nickname" value={editor.draft.username} maxLength={4096} disabled={disabled} aria-invalid={invalidName} aria-describedby="account-nickname-count"
            onChange={event => editor.change('username', event.target.value)} className="w-full min-w-0 p-5 bg-white/5 border border-white/10 rounded-lg text-white font-bold focus:border-purple-500/50 outline-none disabled:opacity-50" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-400"><label htmlFor="account-bio">{c.bio}</label><span id="account-bio-count" className={invalidBio ? 'text-red-300' : ''}>{number.format(visibleLength(editor.draft.bio.trim()))}/{number.format(ACCOUNT_BIO_MAX_LENGTH)}</span></div>
          <textarea id="account-bio" value={editor.draft.bio} maxLength={ACCOUNT_BIO_RAW_MAX_LENGTH} disabled={disabled} aria-invalid={invalidBio} aria-describedby="account-bio-count"
            onChange={event => editor.change('bio', event.target.value)} className="w-full min-w-0 p-5 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500/50 outline-none h-32 resize-none [overflow-wrap:anywhere] disabled:opacity-50" />
        </div>
        <button type="submit" disabled={disabled || editor.loading || !editor.dirty || invalidName || invalidBio} className="w-full min-h-14 py-4 px-4 bg-purple-600 rounded-lg font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40">
          {busy ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" /> : <Check className="h-4 w-4 shrink-0" />}<span className="[overflow-wrap:anywhere]">{editor.saving ? c.saving : editor.uploading ? c.uploading : c.save}</span>
        </button>
        {editor.saved && <p role="status" className="flex items-center justify-center gap-2 text-sm text-green-400"><Check className="h-4 w-4 shrink-0" />{c.saved}</p>}
      </div>
    </form>
    {pickerAccount === editor.account && editor.profile && authUser?.id === editor.owner && <AvatarPicker key={editor.account} c={rtl ? authCopy.ar : authCopy.en}
      onClose={() => setPickerAccount(null)} onChoose={editor.chooseAvatar} onUpload={editor.uploadAvatar} />}
  </motion.div>;
}
