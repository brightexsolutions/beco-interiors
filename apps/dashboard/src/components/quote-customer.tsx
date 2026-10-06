'use client';

import { useCallback, useRef, useState } from 'react';
import { Button, Dialog, toast } from '@beco/ui';
import { linkQuoteCustomer } from '@/app/(app)/quotes/actions';
import { CustomerCard } from '@/components/customer-card';
import { CustomerCreate } from '@/components/customer-create';
import { CustomerPicker } from '@/components/customer-picker';
import type { CustomerSummary } from '@/lib/customer-search';

/**
 * The customer record a quote belongs to, on the quote's page (D130). Shows
 * the linked record with a link to its page; the owner or an admin can link
 * one, or change it, by picking or adding a client in one dialog whose body
 * swaps between the two rather than stacking a second dialog. Linking does
 * not change the name and phone printed on the quote: it is a historical
 * document.
 */
export function QuoteCustomer({
  quoteId,
  updatedAt,
  customer,
  canMutate,
}: {
  quoteId: string;
  updatedAt: string;
  customer: CustomerSummary | null;
  canMutate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const close = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setAdding(false);
  }, []);

  const link = useCallback(
    async (picked: CustomerSummary) => {
      if (picked.id === customer?.id) {
        close(false);
        return;
      }
      setLinking(picked.id);
      const form = new FormData();
      form.set('quoteId', quoteId);
      form.set('updatedAt', updatedAt);
      form.set('customerId', picked.id);
      try {
        const result = await linkQuoteCustomer({}, form);
        if (result.ok) {
          toast.success(`Linked to ${picked.name}.`);
          close(false);
        } else {
          toast.error(result.error ?? 'Could not link the customer.');
        }
      } finally {
        setLinking(null);
      }
    },
    [quoteId, updatedAt, customer?.id, close],
  );

  const action = canMutate ? (
    <Button type="button" variant="ghost" className="h-11 px-2 py-0" onClick={() => setOpen(true)}>
      {customer ? 'Change' : 'Link'}
    </Button>
  ) : null;

  return (
    <div>
      {customer ? (
        <CustomerCard customer={customer} action={action} />
      ) : (
        <div className="flex items-center justify-between gap-3 border-l-4 border-neutral-200 px-3 py-2">
          <p className="font-ui text-sm text-neutral-500">No customer record linked.</p>
          {action}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={close}
        title={adding ? 'Add new client' : customer ? 'Change customer' : 'Link a customer'}
        initialFocusRef={adding ? undefined : searchRef}
      >
        {adding ? (
          <CustomerCreate submitLabel="Add and link" onCreated={link} onUseExisting={link} />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <CustomerPicker inputRef={searchRef} onPick={link} onAddNew={() => setAdding(true)} />
            {linking ? <p className="mt-3 font-ui text-sm text-neutral-500" aria-live="polite">Linking</p> : null}
            <p className="mt-4 font-ui text-sm text-neutral-500">
              The name and phone printed on this quote stay as issued.
            </p>
          </div>
        )}
      </Dialog>
    </div>
  );
}
