'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from './button';

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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
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

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <div
        aria-hidden
        onClick={close}
        className="absolute inset-0 bg-charcoal/60"
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="relative w-full max-w-[34rem] rounded-[4px] bg-high-vis-white p-6 shadow-[0_24px_60px_rgba(16,24,32,0.28)] sm:p-8"
      >
        <h2 id="confirm-title" className="font-display text-2xl leading-tight text-charcoal">
          {title}
        </h2>
        <div id="confirm-description" className="mt-3 max-w-[52ch] text-base text-neutral-700">
          {description}
        </div>
        {/* Cancel first in the DOM, so focus lands here rather than on the
            destructive action. Deliberate, not an ordering accident. */}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="ghost" onClick={close} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'primary' : 'secondary'}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
