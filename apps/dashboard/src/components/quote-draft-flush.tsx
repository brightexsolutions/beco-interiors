'use client';

import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';

export type QuoteDraftFlushResult =
  | { ok: true; updatedAt?: string }
  | { ok: false; error: string };

export type QuoteDraftFlushFn = () => Promise<QuoteDraftFlushResult>;

const QuoteDraftFlushContext = createContext<{
  register: (fn: QuoteDraftFlushFn | null) => void;
  flush: QuoteDraftFlushFn;
}>({
  register: () => undefined,
  flush: async () => ({ ok: true }),
});

/**
 * Lets View write dirty line quantities before the PDF is rendered, so the
 * document matches the form without a separate Save tap.
 */
export function QuoteDraftFlushProvider({ children }: { children: ReactNode }) {
  const fnRef = useRef<QuoteDraftFlushFn | null>(null);
  const register = useCallback((fn: QuoteDraftFlushFn | null) => {
    fnRef.current = fn;
  }, []);
  const flush = useCallback<QuoteDraftFlushFn>(async () => {
    if (!fnRef.current) return { ok: true };
    return fnRef.current();
  }, []);

  return (
    <QuoteDraftFlushContext.Provider value={{ register, flush }}>{children}</QuoteDraftFlushContext.Provider>
  );
}

export function useQuoteDraftFlush() {
  return useContext(QuoteDraftFlushContext);
}
