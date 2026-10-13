'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';
import { cn } from '../lib/cn';
import { useScrollLock } from '../lib/use-scroll-lock';

/**
 * Replaces window.confirm ENTIRELY. See CLAUDE.md rule 4.
 *
 * Rules this encodes:
 *  - name the thing being acted on
 *  - say what happens, INCLUDING what does not happen
 *  - the confirm button carries the verb, never "OK"
 *  - focus lands on cancel, not confirm
 *  - escape cancels, and so does clicking the backdrop
 *  - focus returns to whatever opened it
 *
 * Built from plain elements rather than <dialog>, because showModal is still
 * uneven in jsdom and rule 2 says component interaction is tested there. A
 * dialog whose behaviour cannot be asserted is a dialog nobody will notice
 * breaking.
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** The verb. "Delete product", never "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive or irreversible actions get the warning treatment. */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  useScrollLock(open, panelRef);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      // Keep focus inside the dialog. Without this, tabbing walks out into
      // the page behind, which for a screen reader user means the page is not
      // modal at all.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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
      // Focus goes back where it came from, or the keyboard user is dropped
      // at the top of the document.
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, close]);

  if (!open) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  // Portalled to the body for the same reason as Dialog: no ancestor's
  // stacking context may paint the page over the overlay.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex overscroll-none items-end justify-center p-4 sm:items-center">
      <div
        aria-hidden
        onClick={close}
        className="absolute inset-0 bg-ink/60"
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="relative w-full max-w-[34rem] rounded-card bg-high-vis-white p-6 shadow-[0_24px_60px_rgba(16,24,32,0.28)] sm:p-8"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-control',
              destructive ? 'bg-danger-soft text-danger' : 'bg-tint text-charcoal',
            )}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {destructive ? (
                <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              ) : (
                <path d="M12 16v-4m0-4h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
              )}
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="font-display text-2xl font-semibold leading-tight tracking-[-0.01em] text-charcoal">
              {title}
            </h2>
            <div id="confirm-description" className="mt-2 max-w-[52ch] text-base text-neutral-700">
              {description}
            </div>
          </div>
        </div>
        {/* Cancel first in the DOM, so focus lands here rather than on the
            destructive action. Deliberate, not an ordering accident. */}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="ghost" onClick={close} disabled={busy}>
            {cancelLabel}
          </Button>
          {/* The verb stays while it runs, with the spinner beside it, so the
              reader still knows what they pressed. */}
          <Button variant={destructive ? 'primary' : 'secondary'} onClick={handleConfirm} pending={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
