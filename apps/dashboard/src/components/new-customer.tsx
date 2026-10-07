'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog, Icon } from '@beco/ui';
import { CustomerCreate } from '@/components/customer-create';
import type { CustomerSummary } from '@/lib/customer-search';

/**
 * New customer, the list's one create action (D130): a heading button
 * (D112) opening the shared Dialog with the customer form. A customer can
 * be added without a quote; on success the new record's page opens.
 */
export function NewCustomer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const created = useCallback(
    (customer: CustomerSummary) => {
      setOpen(false);
      router.push(`/customers/${customer.id}`);
    },
    [router],
  );
  return (
    <>
      <Button type="button" variant="secondary" className="gap-2" onClick={() => setOpen(true)}>
        <Icon name="plus" />
        New customer
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="New customer">
        <CustomerCreate onCreated={created} />
      </Dialog>
    </>
  );
}
