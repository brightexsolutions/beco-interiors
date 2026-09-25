'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import { Button, Dialog, Field, Input, buttonClasses, toast, useActionToast } from '@beco/ui';
import { sendQuoteEmail, type QuoteActionState } from '@/app/(app)/quotes/actions';
import { PdfPreview } from '@/components/pdf-preview';
import { useQuoteDraftFlush } from '@/components/quote-draft-flush';

const INITIAL: QuoteActionState = {};

/**
 * One control: View. Compact, top right of the heading, with a right arrow.
 * The dialog is a document viewer: the PDF fills the panel, Email and
 * Download sit in a pinned footer. Pages paint onto canvas so iPhone
 * Safari can show the document.
 *
 * Dirty line quantities are written first, so the PDF matches the form
 * without a separate Save tap.
 */
export function QuoteDocumentPanel({
  quoteId,
  updatedAt,
  reference,
  customerEmail,
  canMutate,
}: {
  quoteId: string;
  updatedAt: string;
  reference: string;
  customerEmail: string | null;
  canMutate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [lock, setLock] = useState(updatedAt);
  const [mailState, send, sending] = useActionState(sendQuoteEmail, INITIAL);
  const { flush } = useQuoteDraftFlush();
  useActionToast(mailState);
  const previewHref = `/quotes/${encodeURIComponent(reference)}/pdf`;
  const downloadHref = `${previewHref}?download=1`;

  useEffect(() => {
    setLock(updatedAt);
  }, [updatedAt]);

  const ensureStoredLines = async () => {
    const result = await flush();
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    if (result.updatedAt) setLock(result.updatedAt);
    return true;
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          if (!(await ensureStoredLines())) return;
          setOpen(true);
        }}
        className="h-11 shrink-0 gap-1.5 px-3 py-0"
      >
        View
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Button>

      <Dialog open={open} onOpenChange={setOpen} title={reference} className="max-w-5xl">
        <div className="relative min-h-0 flex-1 bg-neutral-100">
          <PdfPreview
            src={previewHref}
            title={`${reference} PDF`}
            loadingLabel="Loading quote PDF"
            fallbackError="Could not open the quote PDF."
          />
        </div>

        <div className="shrink-0 border-t border-neutral-200 bg-high-vis-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            {canMutate ? (
              <form
                action={async (formData) => {
                  const result = await flush();
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  formData.set('updatedAt', result.updatedAt ?? lock);
                  // `send` is useActionState's own dispatch, called here
                  // after an await rather than directly as the form's
                  // action, which is the one case React cannot wrap in a
                  // transition for you: done explicitly, or `sending` stops
                  // tracking this submit correctly.
                  startTransition(() => {
                    send(formData);
                  });
                }}
                className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
              >
                <input type="hidden" name="quoteId" value={quoteId} />
                <input type="hidden" name="updatedAt" value={lock} />
                <Field label="Email to" htmlFor="quote-email">
                  <Input
                    id="quote-email"
                    name="to"
                    type="email"
                    required
                    defaultValue={customerEmail ?? ''}
                    placeholder="name@company.com"
                    autoComplete="email"
                  />
                </Field>
                <Button type="submit" variant="secondary" disabled={sending}>
                  {sending ? 'Sending' : 'Email'}
                </Button>
              </form>
            ) : null}
            <a
              href={downloadHref}
              className={buttonClasses({ variant: 'outline' })}
              onClick={(event) => {
                event.preventDefault();
                void (async () => {
                  if (!(await ensureStoredLines())) return;
                  window.location.assign(downloadHref);
                })();
              }}
            >
              Download
            </a>
          </div>
          <p className="mt-3 font-ui text-sm text-neutral-500">Download the file to send it on WhatsApp.</p>
        </div>
      </Dialog>
    </>
  );
}
