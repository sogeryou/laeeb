import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Plus } from 'lucide-react';
import { AUTH_PASSWORD_MAX_LENGTH, AUTH_PASSWORD_MIN_LENGTH } from '@shared/auth';
import { authPresentation } from './config';
import { tagLabels } from './copy';
import type { AuthFlow } from './useAuthFlow';

export function AuthField({ label, hint, id, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <div className="auth-field"><label htmlFor={id}>{label}</label><input {...input} id={id} aria-describedby={hint ? `${id}-hint` : undefined} />{hint && <p id={`${id}-hint`} className="auth-hint">{hint}</p>}</div>;
}
export function AuthButton({ children, busy, disabled = false }: { children: ReactNode; busy: boolean; disabled?: boolean }) {
  return <button type="submit" className="auth-primary" disabled={busy || disabled} aria-busy={busy}>{busy ? <span className="auth-spinner" aria-hidden="true" /> : null}{children}{!busy && <ArrowRight className="auth-direction" size={19} />}</button>;
}
function PasswordField({ flow, confirm = false, reset = false }: { flow: AuthFlow; confirm?: boolean; reset?: boolean }) {
  const [visible, setVisible] = useState(false);
  const id = confirm ? 'auth-confirm-password' : 'auth-password';
  const value = confirm ? flow.confirmPassword : flow.password;
  return <div className="auth-field"><label htmlFor={id}>{confirm ? flow.c.confirmPassword : reset ? flow.c.newPassword : flow.c.password}</label><div className="auth-password">
    <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={e => confirm ? flow.setConfirmPassword(e.target.value) : flow.setPassword(e.target.value)} required autoComplete={reset ? 'new-password' : 'current-password'} dir="ltr" {...(reset ? { minLength: AUTH_PASSWORD_MIN_LENGTH, maxLength: AUTH_PASSWORD_MAX_LENGTH * 2 } : {})} />
    <button type="button" aria-label={visible ? flow.c.hide : flow.c.show} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
  </div></div>;
}
const submit = (fn: () => unknown) => (event: FormEvent) => { event.preventDefault(); void fn(); };

export function EmailStep({ flow, mode }: { flow: AuthFlow; mode: 'login' | 'register' | 'reset' }) {
  const { c } = flow;
  return <form onSubmit={submit(() => mode === 'login' && flow.passwordMode ? flow.login() : flow.send(mode))}>
    <AuthField id="auth-email" label={c.email} type="email" value={flow.email} onChange={e => flow.setEmail(e.target.value)} autoComplete="email" dir="ltr" placeholder="you@example.com" required maxLength={254} />
    {mode === 'login' && flow.passwordMode && <><PasswordField flow={flow} /><div className="auth-align-end"><button type="button" className="auth-text-button" onClick={() => flow.enter('forgot-password')}>{c.forgot}</button></div></>}
    <AuthButton busy={flow.busy}>{flow.busy ? c.loading : mode === 'login' && flow.passwordMode ? c.signIn : c.continue}</AuthButton>
    {mode === 'login' && <p className="auth-center"><button type="button" className="auth-text-button" disabled={flow.busy} onClick={() => { flow.setPasswordMode(!flow.passwordMode); flow.setPassword(''); }}>{flow.passwordMode ? c.codeMethod : c.passwordMethod}</button></p>}
    {mode !== 'reset' && <p className="auth-center auth-secondary">{mode === 'login' ? c.firstTime : c.already} <button type="button" className="auth-text-button" disabled={flow.busy} onClick={() => flow.enter(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? c.join : c.signIn}</button></p>}
    {mode === 'register' && <p className="auth-private"><LockKeyhole size={14} />{c.privateEmail}</p>}
  </form>;
}

export function VerifyStep({ flow }: { flow: AuthFlow }) {
  const { c } = flow;
  return <form onSubmit={submit(flow.verify)}>
    <p className="auth-email-badge" dir="ltr">{flow.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2')}</p>
    <AuthField id="auth-code" label={c.code} className="auth-code" value={flow.code} onChange={e => flow.setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required dir="ltr" hint={c.codeHint} />
    {flow.developmentCode && <aside className="auth-development"><span>{c.development}</span><code>{flow.developmentCode}</code></aside>}
    <AuthButton busy={flow.busy} disabled={flow.code.length !== 6}>{c.continue}</AuthButton>
    <div className="auth-inline-actions"><button type="button" className="auth-text-button" disabled={flow.busy || flow.cooldown > 0} onClick={() => flow.send()}>{c.resend}{flow.cooldown > 0 && <bdi> {flow.cooldown}s</bdi>}</button><button type="button" className="auth-text-button" disabled={flow.busy} onClick={flow.back}>{c.changeEmail}</button></div>
  </form>;
}

export function ProfileStep({ flow, openAvatar, openLegal }: { flow: AuthFlow; openAvatar: () => void; openLegal: (kind: 'terms' | 'privacy') => void }) {
  const { c } = flow;
  return <form onSubmit={submit(flow.completeProfile)}>
    <div className="auth-avatar-row"><button className={`auth-avatar ${flow.avatar ? 'selected' : ''}`} type="button" onClick={openAvatar} aria-label={c.avatar}>{flow.avatarUrl ? <img src={flow.avatarUrl} alt="" /> : <Plus size={34} />}</button><div><button type="button" className="auth-text-button" onClick={openAvatar}>{c.avatar}</button><p className="auth-hint">{c.avatarHint}</p></div></div>
    <AuthField id="auth-nickname" label={c.nickname} value={flow.username} onChange={e => flow.setUsername(e.target.value)} autoComplete="nickname" placeholder={c.nicknamePlaceholder} required />
    <fieldset className="auth-field"><legend>{c.gender}</legend><div className="auth-gender">{([['F',c.woman],['M',c.man],['U',c.undisclosed]] as const).map(([value, label]) => <label key={value}><input type="radio" name="gender" value={value} checked={flow.gender === value} onChange={() => flow.setGender(value)} required /><span>{label}</span></label>)}</div></fieldset>
    <AuthField id="auth-birthday" label={c.birthday} type="date" value={flow.birthDate} onChange={e => flow.setBirthDate(e.target.value)} autoComplete="bday" max={flow.config?.maxBirthDate} dir="ltr" required aria-invalid={!!flow.birthDate && !flow.validBirthDate} hint={flow.birthDate && !flow.validBirthDate ? c.ageError : c.birthdayHint} />
    <div className="auth-consent"><input id="auth-consent" type="checkbox" aria-label={`${c.termsStart} ${c.terms} ${c.and} ${c.privacy}`} checked={flow.consent} onChange={e => flow.setConsent(e.target.checked)} required /><div><label htmlFor="auth-consent">{c.termsStart} </label><button type="button" onClick={() => openLegal('terms')}>{c.terms}</button><span> {c.and} </span><button type="button" onClick={() => openLegal('privacy')}>{c.privacy}</button>.</div></div>
    <AuthButton busy={flow.busy} disabled={!flow.profileValid || !flow.config}>{c.continue}</AuthButton>
  </form>;
}

export function InterestsStep({ flow }: { flow: AuthFlow }) {
  return <form onSubmit={submit(() => flow.finish())}>
    {authPresentation.tagGroups.map(group => <section className="auth-tag-section" key={group.id}><h2>{flow.c[group.id as 'games' | 'vibes' | 'life']}</h2><div className="auth-tags">{group.tags.map(id => <button type="button" key={id} aria-pressed={flow.tags.includes(id)} disabled={flow.busy} onClick={() => flow.toggleTag(id)}>{flow.tags.includes(id) ? <Check size={15} /> : <Plus size={15} />}{tagLabels[id][flow.language === 'ar' ? 1 : 0]}</button>)}</div></section>)}
    <div className="auth-tag-counter"><span>{flow.c.tagTip}</span><bdi>{flow.tags.length}/{authPresentation.maxTags}</bdi></div>
    <AuthButton busy={flow.busy}>{flow.c.finish}</AuthButton><p className="auth-center"><button type="button" className="auth-text-button" disabled={flow.busy} onClick={() => flow.finish(true)}>{flow.c.skip}</button></p>
  </form>;
}

export function ResetStep({ flow }: { flow: AuthFlow }) {
  return <form onSubmit={submit(flow.reset)}><PasswordField flow={flow} reset /><PasswordField flow={flow} confirm reset /><p className="auth-hint">{flow.c.passwordHint}</p><AuthButton busy={flow.busy}>{flow.c.save}</AuthButton></form>;
}
