import React from 'react';
import { fieldLabelClass, inputClass, inputClassLg } from '../utils/ui';

/** 查询条内联输入（"标签: [输入]"），受控。 */
export function QueryField({
  label,
  placeholder,
  value = '',
  onChange,
  compact = false,
}: {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2 ${compact ? 'min-w-[280px]' : ''}`}>
      <span className="shrink-0 text-sm font-black text-slate-800">{label}:</span>
      <div className="relative min-w-0 flex-1">
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          className={inputClassLg}
        />
        {value && onChange && (
          <button
            type="button"
            aria-label="清空"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-slate-300 text-white hover:bg-slate-400"
          >
            ×
          </button>
        )}
      </div>
    </label>
  );
}

/** 竖排标签字段（标签在上，输入在下）。 */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className={fieldLabelClass}>{label}</span>
      {children}
    </label>
  );
}

/** 受控文本输入。 */
export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  step,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
}) {
  return (
    <input
      type={type}
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  );
}

/** 受控下拉。 */
export function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
