import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle, ArrowLeft, Check, Gamepad2, Heart, LockKeyhole, Mail, MessageCircle, Tags, UserRound, X } from 'lucide-react';
import { businessApi } from '../../services/businessApi';
import { authPresentation } from './config';
import { AvatarPicker } from './AvatarPicker';
import { AuthField, EmailStep, InterestsStep, ProfileStep, ResetStep, VerifyStep } from './StepForms';
import { useAuthFlow, type AuthFlow } from './useAuthFlow';
import { navigateAuth, type AuthStep } from './routing';
import './auth.css';

function DetailDialog({ kind, flow, onClose }: { kind: 'terms' | 'privacy' | 'help'; flow: AuthFlow; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [subject, setSubject] = useState(''); const [message, setMessage] = useState('');
  const [status, setStatus] = useState(''); const [sending, setSending] = useState(false);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  const c = flow.c;
  return <dialog ref={ref} className="auth-dialog auth-detail-dialog" aria-labelledby="auth-detail-title" onCancel={onClose}>
    <div className="auth-dialog-head"><h2 id="auth-detail-title">{kind === 'help' ? c.supportTitle : c[kind]}</h2><button type="button" className="auth-icon" onClick={onClose} aria-label={c.close}><X /></button></div>
    {kind !== 'help' ? <><p className="auth-hint">{kind === 'terms' ? flow.config?.termsVersion : flow.config?.privacyVersion}</p>{(kind === 'terms' ? c.policyTerms : c.policyPrivacy).map((line, i) => <p key={i} className="auth-policy-paragraph">{line}</p>)}</> : flow.app.authToken ? <form onSubmit={async e => {
      e.preventDefault(); if (sending) return; setSending(true); setStatus('');
      try { await businessApi.createTicket(flow.app.authToken!, subject, message); setMessage(''); setStatus(c.supportSent); }
      catch { setStatus(c.generic); } finally { setSending(false); }
    }}><p className="auth-hint">{c.supportHint}</p><AuthField id="support-subject" label={c.supportSubject} value={subject} onChange={e => setSubject(e.target.value)} minLength={2} maxLength={120} required /><div className="auth-field"><label htmlFor="support-message">{c.supportMessage}</label><textarea id="support-message" value={message} onChange={e => setMessage(e.target.value)} minLength={5} maxLength={2000} required /></div><button className="auth-primary" disabled={sending}>{sending ? c.loading : c.sendMessage}</button>{status && <p role="status" className="auth-hint">{status}</p>}</form> : <><p className="auth-policy-paragraph">{c.supportGuest}</p><button type="button" className="auth-primary" onClick={() => navigateAuth(null, true)}>{c.browse}</button></>}
  </dialog>;
}

export function AuthExperience({ step }: { step: AuthStep }) {
  const flow = useAuthFlow(step);
  const { c } = flow;
  const reducedMotion = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [detail, setDetail] = useState<'terms' | 'privacy' | 'help' | null>(null);
  const previousStep = useRef(step);
  const direction = ['login','register','verify','profile','interests'].indexOf(step) < ['login','register','verify','profile','interests'].indexOf(previousStep.current) ? -1 : 1;
  useEffect(() => { previousStep.current = step; document.title = `${c[step]} · LE3EB Club`; heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }, [step, flow.language]);
  const progress = step === 'profile' ? 2 : step === 'interests' ? 3 : ['register','verify'].includes(step) && flow.purpose !== 'reset' ? 1 : 0;
  return <main className="auth-page" dir={flow.language === 'ar' ? 'rtl' : 'ltr'} lang={flow.language}>
    <section className="auth-layout" aria-label="LE3EB Club">
      <aside className="auth-visual" aria-hidden="true"><img src={authPresentation.heroImage} alt="" /><span className="auth-brand">LE3EB <small>club</small></span><div className="auth-visual-symbols"><Gamepad2 /><i /><MessageCircle /><i /><Heart /></div></aside>
      <div className="auth-form-side">
        <header className="auth-header"><button type="button" className="auth-icon" aria-label={c.back} disabled={flow.busy} onClick={flow.back}><ArrowLeft className="auth-direction" /></button><span className="auth-brand auth-mobile-brand">LE3EB <small>club</small></span><select aria-label={flow.language === 'ar' ? 'اللغة' : 'Language'} value={flow.language} onChange={e => flow.app.setLocale(e.target.value as 'en' | 'ar')}><option value="en">English</option><option value="ar">العربية</option></select></header>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} className="auth-content" initial={reducedMotion ? false : { opacity: 0, x: direction * (flow.language === 'ar' ? -16 : 16) }} animate={{ opacity: 1, x: 0 }} exit={reducedMotion ? undefined : { opacity: 0 }} transition={{ duration: reducedMotion ? 0 : authPresentation.transitionSeconds, ease: [.22, 1, .36, 1] }} onAnimationComplete={() => heading.current?.focus({ preventScroll: true })}>
            {!!progress && <nav className="auth-progress" aria-label={flow.language === 'ar' ? 'خطوات التسجيل' : 'Registration progress'}>{[Mail, UserRound, Tags].map((Icon, i) => <div key={i} className={`auth-progress-step ${i + 1 === progress ? 'active' : i + 1 < progress ? 'complete' : ''}`} aria-current={i + 1 === progress ? 'step' : undefined}><span>{i + 1 < progress ? <Check size={18} /> : <Icon size={18} />}</span><small>{[c.emailStep,c.youStep,c.tagsStep][i]}</small></div>)}</nav>}
            {step === 'restricted' && <div className="auth-result-icon"><LockKeyhole /></div>}
            <h1 ref={heading} tabIndex={-1}>{c[step]}</h1>
            {flow.error && <div className="auth-error" role="alert"><AlertCircle size={18} /><span>{flow.error}</span></div>}
            {flow.error === c.expired && <button className="auth-text-button" type="button" onClick={() => flow.enter(step === 'reset-password' ? 'forgot-password' : 'register')}>{c.retry}</button>}
            {flow.notice && <p role="status" className="auth-notice">{flow.notice}</p>}
            {!flow.config && <button type="button" className="auth-text-button" onClick={flow.loadConfig}>{flow.error ? c.retry : c.loading}</button>}
            {(step === 'login' || step === 'register' || step === 'forgot-password') && <EmailStep flow={flow} mode={step === 'forgot-password' ? 'reset' : step} />}
            {step === 'verify' && <VerifyStep flow={flow} />}
            {step === 'profile' && <ProfileStep flow={flow} openAvatar={() => setAvatarOpen(true)} openLegal={setDetail} />}
            {step === 'interests' && <InterestsStep flow={flow} />}
            {step === 'reset-password' && <ResetStep flow={flow} />}
            {step === 'restricted' && <><p className="auth-hint">{c.restrictedHint}</p><button type="button" className="auth-primary" onClick={() => setDetail('help')}>{c.support}</button><p className="auth-center"><button type="button" className="auth-text-button" onClick={async () => { await flow.app.handleLogout(); navigateAuth('login', true); }}>{c.signOut}</button></p></>}
          </motion.div>
        </AnimatePresence>
        <footer className="auth-footer"><button type="button" onClick={() => setDetail('terms')}>{c.terms}</button><button type="button" onClick={() => setDetail('privacy')}>{c.privacy}</button><button type="button" onClick={() => setDetail('help')}>{c.help}</button></footer>
      </div>
    </section>
    {avatarOpen && <AvatarPicker c={c} onClose={() => setAvatarOpen(false)} onChoose={flow.chooseAvatar} onUpload={flow.uploadAvatar} />}
    {detail && <DetailDialog kind={detail} flow={flow} onClose={() => setDetail(null)} />}
  </main>;
}
