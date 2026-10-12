import { useEffect, useRef, useState } from 'react';
import type { CreateOrderInput, OrderQuote } from '@shared/orders';

export function useCheckoutQuote(input: Omit<CreateOrderInput, 'requestId' | 'expectedTotal'>, session: string, quote: (input: Omit<CreateOrderInput, 'requestId' | 'expectedTotal'>) => Promise<OrderQuote>, fallback: string) {
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([session, input, attempt]);
  const [result, setResult] = useState<{ key: string; quote?: OrderQuote; error?: string }>({ key: '' });
  const request = useRef(quote);
  request.current = quote;
  useEffect(() => {
    let active = true;
    setResult({ key });
    void request.current(input).then(value => { if (active) setResult({ key, quote: value }); }).catch(error => { if (active) setResult({ key, error: error instanceof Error ? error.message : fallback }); });
    return () => { active = false; };
  }, [key, attempt]);
  const current = result.key === key ? result : null;
  return { quote: current?.quote, loading: !current?.quote && !current?.error, error: current?.error ?? '', retry: () => setAttempt(value => value + 1), key };
}

export interface PendingCheckout {
  owner: string;
  key: string;
  input: CreateOrderInput & { requestId: string; expectedTotal: number };
}

export function checkoutRequest(input: Omit<CreateOrderInput, 'requestId' | 'expectedTotal'>, total: number, owner: string): PendingCheckout {
  const key = `order-checkout:${JSON.stringify([owner, input, total])}`;
  let requestId: string | null = null;
  try { requestId = sessionStorage.getItem(key); } catch { /* Storage is optional in private browsing. */ }
  if (!requestId) {
    requestId = globalThis.crypto?.randomUUID?.() ?? `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try { sessionStorage.setItem(key, requestId); } catch { /* The caller retains the ID for in-page retries. */ }
  }
  return { owner, key, input: { ...input, expectedTotal: total, requestId } };
}

export function savePendingCheckout(record: PendingCheckout) {
  try { sessionStorage.setItem(`order-checkout-pending:${record.owner}`, JSON.stringify(record)); } catch { /* The view also keeps the pending request in memory. */ }
}
export function readPendingCheckout(owner: string): PendingCheckout | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(`order-checkout-pending:${owner}`) || 'null');
    const input = value?.input;
    if (value?.owner !== owner || typeof value?.key !== 'string' || typeof input?.requestId !== 'string' || !input.requestId ||
      typeof input.companionId !== 'string' || !input.companionId || !Number.isFinite(input.expectedTotal) || input.expectedTotal < 0 ||
      !Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 100 ||
      (input.serviceId !== undefined && typeof input.serviceId !== 'string') || (input.couponGrantId !== undefined && typeof input.couponGrantId !== 'string')) return null;
    return { owner, key: value.key, input: { companionId: input.companionId, quantity: input.quantity, requestId: input.requestId, expectedTotal: input.expectedTotal,
      ...(input.serviceId ? { serviceId: input.serviceId } : {}), ...(input.serviceName ? { serviceName: String(input.serviceName) } : {}), ...(input.couponGrantId ? { couponGrantId: input.couponGrantId } : {}) } };
  } catch { return null; }
}
export function clearPendingCheckout(record: PendingCheckout) {
  try { sessionStorage.removeItem(record.key); sessionStorage.removeItem(`order-checkout-pending:${record.owner}`); } catch { /* Storage may be unavailable. */ }
}
export function matchesCheckout(record: PendingCheckout, input: Omit<CreateOrderInput, 'requestId' | 'expectedTotal'>, total: number) {
  return record.input.companionId === input.companionId && record.input.serviceId === input.serviceId && record.input.serviceName === input.serviceName &&
    record.input.quantity === input.quantity && record.input.couponGrantId === input.couponGrantId && record.input.expectedTotal === total;
}
