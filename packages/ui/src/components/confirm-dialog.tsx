'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';

/**
 * Replaces window.confirm ENTIRELY. See CLAUDE.md rule 4.
 *
 * Scaffold: the Radix Dialog wiring lands in M5 alongside the dashboard.
 * The contract below is fixed, so callers can be written against it now.
 *
 * Rules this encodes:
 *  - name the thing being acted on
 *  - say what happens, INCLUDING what does not happen
 *  - the confirm button carries the verb, never "OK"
 *  - focus lands on cancel, not confirm
 *  - escape cancels
 */
export interface ConfirmDialogProps {
  title: string;
  description: ReactNode;
  /** The verb. "Delete product", never "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  trigger?: ReactNode;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="alertdialog" aria-modal="true" aria-label={title} className={cn('contents')}>
      <h2>{title}</h2>
      <p>{description}</p>
      {/* Cancel first in the DOM, so focus lands here rather than on the
          destructive action. Deliberate, not an ordering accident. */}
      <Button variant="ghost" autoFocus disabled={busy}>
        {cancelLabel}
      </Button>
      <Button
        variant={tone === 'destructive' ? 'primary' : 'secondary'}
        onClick={handleConfirm}
        disabled={busy}
      >
        {confirmLabel}
      </Button>
    </div>
  );
}
