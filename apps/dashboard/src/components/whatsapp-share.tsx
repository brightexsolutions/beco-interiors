'use client';

import { useState } from 'react';
import { Button, toast } from '@beco/ui';

export const filenameFrom = (disposition: string | null, fallback: string): string => {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
};

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

/**
 * Send the PDF itself on WhatsApp in one tap.
 *
 * On a phone the share sheet carries the file, so the customer receives the
 * document, not a link. Where a browser cannot share files (most desktops),
 * the PDF is saved and a chat opens prefilled to the customer's number, so
 * attaching it is the only step left. Either way the stored copy is then
 * recorded as sent on WhatsApp against this quote or order.
 */
export function WhatsAppShare({
  downloadHref,
  fallbackFilename,
  chatHref,
  message,
  beforeShare,
  onShared,
  className,
}: {
  downloadHref: string;
  fallbackFilename: string;
  /** wa.me link prefilled to the customer, for the desktop fallback. */
  chatHref: string;
  message: string;
  /** Anything that must be saved before the PDF is generated. False stops the share. */
  beforeShare?: () => Promise<boolean>;
  onShared: (path: string) => Promise<{ error?: string; ok?: string }>;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (beforeShare && !(await beforeShare())) return;
      const response = await fetch(downloadHref, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) {
        toast.error((await response.text()) || 'Could not prepare the PDF.');
        return;
      }
      const blob = await response.blob();
      const path = response.headers.get('X-Document-Path');
      const filename = filenameFrom(response.headers.get('Content-Disposition'), fallbackFilename);
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: message });
        } catch (error) {
          if (isAbort(error)) return;
          throw error;
        }
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
        window.open(chatHref, '_blank', 'noopener,noreferrer');
        toast.success('PDF saved. Attach it in the WhatsApp chat that just opened.');
      }

      if (path) {
        const recorded = await onShared(path);
        if (recorded.error) toast.error(recorded.error);
      }
    } catch {
      toast.error('Could not share on WhatsApp. Download the PDF instead.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="secondary" onClick={share} disabled={busy} className={className}>
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z" />
      </svg>
      {busy ? 'Preparing' : 'WhatsApp'}
    </Button>
  );
}
