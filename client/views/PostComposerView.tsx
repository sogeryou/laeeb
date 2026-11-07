import React, { useEffect, useRef } from 'react';
import { useApp } from '../app/AppContext';
import { postCopy } from '../components/community/postCopy';
import { AUTH_SESSION_EVENT } from '../features/auth/session';

export function PostComposerView() {
  const app = useApp();
  const { social, authUser, authToken, currentView, locale } = app;
  const copy = postCopy(locale);
  const input = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(false), operation = useRef(0);
  const activeAttempt = useRef<number | null>(null);
  const identity = useRef({ owner: authUser?.id, token: authToken, view: currentView });
  if (identity.current.owner !== authUser?.id || identity.current.token !== authToken || identity.current.view !== currentView) {
    operation.current++;
    activeAttempt.current = null;
    identity.current = { owner: authUser?.id, token: authToken, view: currentView };
  }
  useEffect(() => {
    mounted.current = true;
    input.current?.focus();
    const changed = (event: Event) => {
      const session = (event as CustomEvent).detail;
      if (session?.user?.id !== identity.current.owner || session?.token !== identity.current.token) {
        operation.current++;
        activeAttempt.current = null;
      }
    };
    window.addEventListener(AUTH_SESSION_EVENT, changed);
    return () => { mounted.current = false; operation.current++; activeAttempt.current = null; window.removeEventListener(AUTH_SESSION_EVENT, changed); };
  }, []);
  const valid = Boolean(social.postDraft.trim()) && social.postDraft.length <= 5000;
  const cancel = () => {
    operation.current++;
    activeAttempt.current = null;
    social.invalidatePostComposer();
    app.handleBack();
    // The feed header remounts after Back; restore the keyboard user's trigger.
    setTimeout(() => document.getElementById('community-compose-trigger')?.focus(), 0);
  };
  return <main dir={locale === 'ar' ? 'rtl' : 'ltr'} className="min-h-dvh flex flex-col px-5 py-4 sm:px-8 max-w-3xl mx-auto">
    <form className="flex flex-1 flex-col" onSubmit={async event => {
      event.preventDefault();
      if (!valid || social.publishingPost || activeAttempt.current !== null || currentView !== 'POST_CREATE' || !authToken || !authUser) return;
      const attempt = ++operation.current;
      activeAttempt.current = attempt;
      try {
        if (!await social.publishPost() || !mounted.current || operation.current !== attempt) return;
        social.setPostListMode('mine'); app.setCommunityTab('LATEST'); app.setSelectedGame(null);
        app.notify(copy.submitted); app.handleBack();
      } finally {
        if (activeAttempt.current === attempt) activeAttempt.current = null;
      }
    }}>
      <header className="flex items-center justify-between gap-4 pb-5">
        <button type="button" onClick={cancel} className="min-h-11 px-2 text-sm text-gray-300 hover:text-white">{copy.cancel}</button>
        <button type="submit" disabled={!valid || social.publishingPost} className="min-h-11 px-6 rounded-full bg-purple-600 font-bold text-sm disabled:opacity-40">{social.publishingPost ? copy.publishing : copy.publish}</button>
      </header>
      <textarea ref={input} aria-label={copy.content} maxLength={5000} value={social.postDraft}
        onChange={event => social.setPostDraft(event.target.value)} placeholder={copy.placeholder}
        className="w-full flex-1 min-h-64 resize-none bg-transparent text-lg leading-relaxed text-white placeholder:text-gray-500 focus:outline-none" />
      {social.postError && <p role="alert" className="text-sm text-red-300 py-3">{copy.error}</p>}
      <footer className="flex flex-wrap justify-between gap-3 pt-5 pb-5 text-xs text-gray-400 border-t border-white/10">
        <p className="max-w-sm">{copy.hint}</p><output aria-live="polite" className="tabular-nums" dir="ltr">{social.postDraft.length}/5000</output>
      </footer>
    </form>
  </main>;
}
