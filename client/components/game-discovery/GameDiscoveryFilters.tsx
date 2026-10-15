import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import { DEFAULT_GAME_DISCOVERY_QUERY, type GameDiscoveryQuery } from '@shared/gameDiscovery';
import { gameDiscoveryCopy } from './copy';

export function GameDiscoveryFilters({ locale, query, onApply, onClose }: { locale: string; query: GameDiscoveryQuery; onApply: (query: GameDiscoveryQuery) => void; onClose: () => void }) {
  const c = gameDiscoveryCopy(locale), rtl = locale.toLowerCase().startsWith('ar');
  const [draft, setDraft] = useState({ status: query.status, gender: query.gender, min: String(query.minPrice), max: String(query.maxPrice) });
  const min = Number(draft.min), max = Number(draft.max);
  const valid = draft.min.trim() !== '' && draft.max.trim() !== '' && [min, max].every(n => Number.isFinite(n) && n >= 0 && n <= 10000 && Math.abs(n * 100 - Math.round(n * 100)) < 1e-7) && min <= max;
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return;
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.current?.querySelector<HTMLElement>('button')?.focus();
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  const control = 'w-full min-w-0 h-12 rounded-lg border border-white/15 bg-[#1b1325] px-3 text-white outline-none focus:border-purple-400';
  const content = <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="discovery-filter-title" dir={rtl ? 'rtl' : 'ltr'} className="fixed inset-0 z-[401] bg-[#0f071a] text-white flex flex-col"
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)') || [])];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <header className="px-6 py-6 flex items-center gap-4 border-b border-white/10 shrink-0">
      <button type="button" aria-label={c.cancel} title={c.cancel} onClick={onClose} className="h-10 w-10 shrink-0 rounded-lg border border-white/10 flex items-center justify-center"><ArrowLeft className={'h-5 w-5 ' + (rtl ? 'rotate-180' : '')} /></button>
      <h2 id="discovery-filter-title" className="text-xl font-bold [overflow-wrap:anywhere]">{c.filters}</h2>
    </header>
    <form className="flex-1 min-h-0 flex flex-col" onSubmit={event => { event.preventDefault(); if (valid) { onApply({ ...query, status: draft.status, gender: draft.gender, minPrice: min, maxPrice: max }); onClose(); } }}>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <div className="space-y-2"><label htmlFor="discovery-status" className="block text-sm text-gray-300">{c.status}</label>
          <select id="discovery-status" className={control} value={draft.status} onChange={e => setDraft(p => ({ ...p, status: e.target.value as GameDiscoveryQuery['status'] }))}><option value="ALL">{c.all}</option><option value="ONLINE">{c.onlineOnly}</option></select></div>
        <div className="space-y-2"><label htmlFor="discovery-gender" className="block text-sm text-gray-300">{c.gender}</label>
          <select id="discovery-gender" className={control} value={draft.gender} onChange={e => setDraft(p => ({ ...p, gender: e.target.value as GameDiscoveryQuery['gender'] }))}><option value="ALL">{c.all}</option><option value="M">{c.male}</option><option value="F">{c.female}</option><option value="U">{c.undisclosed}</option></select></div>
        <div className="grid grid-cols-1 min-[375px]:grid-cols-2 gap-4">
          <div className="space-y-2"><label htmlFor="discovery-min-price" className="block text-sm text-gray-300">{c.minPrice}</label><input id="discovery-min-price" type="number" inputMode="decimal" min="0" max="10000" step="0.01" className={control} value={draft.min} aria-invalid={!valid} aria-describedby={!valid ? 'discovery-price-error' : undefined} onChange={e => setDraft(p => ({ ...p, min: e.target.value }))} /></div>
          <div className="space-y-2"><label htmlFor="discovery-max-price" className="block text-sm text-gray-300">{c.maxPrice}</label><input id="discovery-max-price" type="number" inputMode="decimal" min="0" max="10000" step="0.01" className={control} value={draft.max} aria-invalid={!valid} aria-describedby={!valid ? 'discovery-price-error' : undefined} onChange={e => setDraft(p => ({ ...p, max: e.target.value }))} /></div>
        </div>
        {!valid && <p id="discovery-price-error" role="alert" className="text-sm text-red-300">{c.priceError}</p>}
        {[c.server, c.platform, c.rank].map((label, i) => <div key={label} className="space-y-2"><label htmlFor={`discovery-unavailable-${i}`} className="block text-sm text-gray-500">{label}</label><select id={`discovery-unavailable-${i}`} disabled className={control + ' opacity-40'}><option>{c.unavailable}</option></select></div>)}
      </div>
      <footer className="p-6 border-t border-white/10 flex flex-wrap gap-3 shrink-0">
        <button type="button" className="flex-1 min-h-12 px-3 py-3 rounded-lg border border-white/15 text-sm font-bold [overflow-wrap:anywhere]" onClick={() => { onApply({ ...DEFAULT_GAME_DISCOVERY_QUERY }); onClose(); }}>{c.reset}</button>
        <button type="submit" disabled={!valid} className="flex-1 min-h-12 px-3 py-3 rounded-lg bg-purple-600 text-sm font-bold disabled:opacity-40 [overflow-wrap:anywhere]">{c.apply}</button>
      </footer>
    </form>
  </div>;
  return typeof document !== 'undefined' && document.body ? createPortal(content, document.body) : content;
}
