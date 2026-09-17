'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Dialog, Field, Input, Notice, Skeleton, buttonClasses, toast, useActionToast } from '@beco/ui';
import { sendQuoteEmail, type QuoteActionState } from '@/app/(app)/quotes/actions';
import { useQuoteDraftFlush } from '@/components/quote-draft-flush';

const INITIAL: QuoteActionState = {};

/**
 * One control: View. Compact, top right of the heading, with a right arrow.
 * The dialog is a document viewer: the PDF fills the panel, Email and
 * Download sit in a pinned footer. View fetches the PDF as a blob so
 * X-Frame-Options on the app cannot blank the iframe.
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!open) return;
    let revoked: string | null = null;
    const controller = new AbortController();

    const load = async () => {
      setLoadError(null);
      setBlobUrl(null);
      try {
        const response = await fetch(previewHref, {
          signal: controller.signal,
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!response.ok) {
          const detail = await response.text();
          setLoadError(detail || 'Could not open the quote PDF.');
          return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        revoked = url;
        setBlobUrl(url);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : 'Could not open the quote PDF.');
      }
    };

    void load();
    return () => {
      controller.abort();
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [open, previewHref]);

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
          {blobUrl ? (
            <iframe title={`${reference} PDF`} src={blobUrl} className="absolute inset-0 h-full w-full border-0 bg-high-vis-white" />
          ) : loadError ? (
            <div className="flex h-full items-center justify-center p-6">
              <Notice tone="alert">{loadError}</Notice>
            </div>
          ) : (
            <div role="status" aria-busy="true" aria-label="Loading quote PDF" className="absolute inset-0 p-6">
              <Skeleton className="h-full w-full rounded-none" />
            </div>
          )}
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
                  send(formData);
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
