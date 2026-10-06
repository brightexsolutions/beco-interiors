'use client';

import { useActionState, useState } from 'react';
import { Button, Dialog, Field, Input, buttonClasses, Icon, useActionToast, useKeepValuesSubmit } from '@beco/ui';
import { markReceiptSharedWhatsApp, sendOrderReceipt, type OrderActionState } from '@/app/(app)/orders/actions';
import { PdfPreview } from '@/components/pdf-preview';
import { WhatsAppShare } from '@/components/whatsapp-share';
import { whatsAppChatLink } from '@/lib/whatsapp';

const INITIAL: OrderActionState = {};

export function OrderDocumentPanel({
  orderId,
  updatedAt,
  reference,
  customerEmail,
  customerPhone,
  canMutate,
  paid,
  layout = 'compact',
}: {
  orderId: string;
  updatedAt: string;
  reference: string;
  customerEmail: string | null;
  customerPhone: string;
  canMutate: boolean;
  paid: boolean;
  layout?: 'compact' | 'block';
}) {
  const [open, setOpen] = useState(false);
  const [mailState, send, sending] = useActionState(sendOrderReceipt, INITIAL);
  const onSendSubmit = useKeepValuesSubmit(send);
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
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            {canMutate ? (
              <form onSubmit={onSendSubmit} className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
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
                <Button type="submit" variant="secondary" pending={sending}>
                  {sending ? 'Sending' : 'Email'}
                </Button>
              </form>
            ) : null}
            <div className="grid grid-cols-2 gap-2 xl:flex">
              <WhatsAppShare
                downloadHref={downloadHref}
                fallbackFilename={`${reference}.pdf`}
                chatHref={whatsAppChatLink(customerPhone, `Beco receipt ${reference}`)}
                message={`Beco receipt ${reference}`}
                onShared={(path) => markReceiptSharedWhatsApp(reference, path)}
              />
              <a href={downloadHref} className={buttonClasses({ variant: 'outline' })}>
                Download
              </a>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
