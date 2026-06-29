import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyle: Record<ToastTone, { wrap: string; icon: React.ReactNode }> = {
  success: { wrap: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: <CheckCircle2 className="size-4" /> },
  error: { wrap: 'border-rose-200 bg-rose-50 text-rose-700', icon: <XCircle className="size-4" /> },
  info: { wrap: 'border-sky-200 bg-sky-50 text-sky-700', icon: <Info className="size-4" /> },
};

let seq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = ++seq;
    setItems((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-black shadow-lg animate-fade-in-up ${toneStyle[item.tone].wrap}`}
          >
            {toneStyle[item.tone].icon}
            <span className="min-w-0 flex-1">{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** 操作结果反馈。 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用');
  return ctx;
}
