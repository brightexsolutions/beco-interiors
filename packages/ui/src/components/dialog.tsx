'use client';

import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { cn } from '../lib/cn';
import { useScrollLock } from '../lib/use-scroll-lock';

/**
 * A branded modal. Same rules as ConfirmDialog: no <dialog>, no browser
 * chrome, escape and backdrop close, focus returns to the opener, tab stays
 * inside. ConfirmDialog is the destructive special case. This is everything
 * else, including a PDF preview.
 */
export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  /** Extra classes on the panel, for a wide preview. */
  className?: string | undefined;
  /** Lands focus on open. Close is the default, search for a picker. */
  initialFocusRef?: RefObject<HTMLElement | null> | undefined;
}

export function Dialog({ open, onOpenChange, title, children, className, initialFocusRef }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  useScrollLock(open, panelRef);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    (initialFocusRef?.current ?? closeRef.current)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, close, initialFocusRef]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex overscroll-none items-end justify-center sm:items-center sm:p-6">
      <div aria-hidden onClick={close} className="absolute inset-0 bg-charcoal/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          'relative flex h-[min(100dvh,56rem)] w-full max-w-[34rem] flex-col overflow-hidden bg-high-vis-white shadow-[0_24px_60px_-16px_rgba(16,24,32,0.28)] sm:h-[min(92dvh,56rem)] sm:max-h-[min(92dvh,56rem)] sm:rounded-[4px]',
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-5 py-3 sm:px-6">
          <h2 id="dialog-title" className="min-w-0 truncate font-ui text-base font-semibold text-charcoal">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center font-ui text-sm font-semibold text-neutral-500 hover:text-charcoal"
          >
            Close
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
