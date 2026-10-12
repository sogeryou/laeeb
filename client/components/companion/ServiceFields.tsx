import React from 'react';
import { Gamepad2 } from 'lucide-react';
import type { ServiceDraft } from '../../hooks/useCompanionProfile';

type Copy = { name: string; price: string; unit: string; hour: string; match: string; primary: string; primaryName: string; primaryPrice: string; servicePrice: string; serviceUnit: string };
type Props = { id: string; name: string; price: string; unit: string; primary?: boolean; copy: Copy; disabled: boolean; onChange: (patch: Partial<ServiceDraft> | { gameName?: string; hourlyRate?: string }) => void };
const fieldClass = 'min-w-0 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400 disabled:opacity-50';

export function ServiceFields({ id, name, price, unit, primary, copy, disabled, onChange }: Props) {
  return <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
    <div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600/20"><Gamepad2 className="h-5 w-5 text-purple-400" /></div><div className="min-w-0"><p className="truncate font-bold text-white">{name || copy.name}</p><p className="text-[10px] text-gray-400">{primary ? copy.primary : id}</p></div></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
      <label className="block min-w-0 text-xs text-gray-400">{copy.name}<input aria-label={primary ? copy.primaryName : `${copy.name} ${id}`} className={fieldClass} value={name} maxLength={100} disabled={disabled} onChange={e => onChange(primary ? { gameName: e.target.value } : { name: e.target.value })} /></label>
      <label className="block min-w-0 text-xs text-gray-400">{copy.price}<input aria-label={primary ? copy.primaryPrice : `${copy.servicePrice} ${id}`} className={fieldClass} inputMode="decimal" value={price} disabled={disabled} onChange={e => onChange(primary ? { hourlyRate: e.target.value } : { price: e.target.value })} /></label>
      <label className="block min-w-0 text-xs text-gray-400">{copy.unit}{primary ? <div className={`${fieldClass} opacity-60`}>{copy.hour}</div> : <select aria-label={`${copy.serviceUnit} ${id}`} className={fieldClass} value={unit} disabled={disabled} onChange={e => onChange({ unit: e.target.value })}>{!['hr', 'match'].includes(unit) && <option value={unit}>{unit || '-'}</option>}<option value="hr">{copy.hour}</option><option value="match">{copy.match}</option></select>}</label>
    </div>
  </div>;
}
