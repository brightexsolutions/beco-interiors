'use client';

import { useActionState, useState } from 'react';
import { Button, Dialog, Field, Input, buttonClasses, Icon, useActionToast } from '@beco/ui';
import { sendOrderReceipt, type OrderActionState } from '@/app/(app)/orders/actions';
import { PdfPreview } from '@/components/pdf-preview';

const INITIAL: OrderActionState = {};

export function OrderDocumentPanel({
  orderId,
  updatedAt,
  reference,
  customerEmail,
  canMutate,
  paid,
  layout = 'compact',
}: {
  orderId: string;
  updatedAt: string;
  reference: string;
  customerEmail: string | null;
  canMutate: boolean;
  paid: boolean;
  layout?: 'compact' | 'block';
}) {
  const [open, setOpen] = useState(false);
  const [mailState, send, sending] = useActionState(sendOrderReceipt, INITIAL);
  useActionToast(mailState);
  const previewHref = `/orders/${encodeURIComponent(reference)}/pdf`;
  const downloadHref = `${previewHref}?download=1`;

  if (!paid) return null;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        className={layout === 'block' ? 'h-11 w-full gap-1.5 py-0' : 'h-11 shrink-0 gap-1.5 px-3 py-0'}
      >
        View receipt
        <Icon name="arrow-right" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen} title={reference} className="max-w-5xl">
        <div className="relative min-h-0 flex-1 bg-neutral-100">
          <PdfPreview
            src={previewHref}
            title={`${reference} PDF`}
            loadingLabel="Loading receipt PDF"
            fallbackError="Could not open the receipt PDF."
          />
        </div>

        <div className="shrink-0 border-t border-neutral-200 bg-high-vis-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            {canMutate ? (
              <form action={send} className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <input type="hidden" name="orderId" value={orderId} />
                <input type="hidden" name="updatedAt" value={updatedAt} />
                <Field label="Email to" htmlFor="order-email">
                  <Input
                    id="order-email"
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
            <a href={downloadHref} className={buttonClasses({ variant: 'outline' })}>
              Download
            </a>
          </div>
          <p className="mt-3 font-ui text-sm text-neutral-500">Download the file to send it on WhatsApp.</p>
        </div>
      </Dialog>
    </>
  );
}
