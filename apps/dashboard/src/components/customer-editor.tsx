'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, ConfirmDialog, buttonClasses, cn, toast, useKeepValuesSubmit } from '@beco/ui';
import { deleteCustomer, updateCustomer, type CustomerActionState } from '@/app/(app)/customers/actions';
import { CustomerFields } from '@/components/customer-fields';
import type { CustomerRecord } from '@/lib/customer-records';

const INITIAL: CustomerActionState = {};

/**
 * A customer's details on their own page (D130). Saved under the record's
 * optimistic lock, with the button showing it running and the result
 * stated when it lands (D117). A number that belongs to another customer is
 * refused under the phone field with a link to them. Delete is a soft
 * delete, admins only, through ConfirmDialog naming the customer.
 */
export function CustomerEditor({
  customer,
  canEdit,
  canDelete,
}: {
  customer: CustomerRecord;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const prefix = useId();
  const router = useRouter();
  const [state, save, saving] = useActionState(updateCustomer, INITIAL);
  const submit = useKeepValuesSubmit(save);
  const [lock, setLock] = useState(customer.updatedAt);
  const handled = useRef<CustomerActionState | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // A save from elsewhere re-renders this page with a fresh row; take its lock.
  useEffect(() => setLock(customer.updatedAt), [customer.updatedAt]);

  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      if (state.updatedAt) setLock(state.updatedAt);
      toast.success(state.ok);
      return;
    }
    if (state.error && !state.field) toast.error(state.error);
  }, [state]);

  const remove = async () => {
    const form = new FormData();
    form.set('customerId', customer.id);
    setDeleting(true);
    try {
      const result = await deleteCustomer({}, form);
      if (result.ok) {
        toast.success(`${customer.name} deleted.`);
        setConfirming(false);
        router.push('/customers');
      } else {
        toast.error(result.error ?? 'Could not delete the customer.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <form onSubmit={submit} aria-label="Customer details" className="min-w-0 space-y-8">
      <input type="hidden" name="customerId" value={customer.id} />
      <input type="hidden" name="updatedAt" value={lock} />
      {state.existing ? (
        <div role="alert" className="border-l-4 border-charcoal bg-neutral-50 px-4 py-3 font-ui">
          <p className="text-base text-charcoal">
            {state.existing.phone} is already on file for <strong>{state.existing.name}</strong>.
          </p>
          <Link
            href={`/customers/${state.existing.id}`}
            className={cn(buttonClasses({ variant: 'outline' }), 'mt-3 h-11 py-0')}
          >
            Open {state.existing.name}
          </Link>
        </div>
      ) : null}
      <CustomerFields
        idPrefix={prefix}
        values={customer}
        error={state.error}
        field={state.field}
        disabled={!canEdit}
      />
      {canEdit || canDelete ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-4">
          {canEdit ? (
            <Button type="submit" variant="secondary" pending={saving}>
              {saving ? 'Saving' : 'Save customer'}
            </Button>
          ) : null}
          {canDelete ? (
            <Button type="button" variant="ghost" pending={deleting} onClick={() => setConfirming(true)}>
              {deleting ? 'Deleting' : 'Delete customer'}
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="font-ui text-sm text-neutral-500">Read only. Sales and admins edit customers.</p>
      )}
    </form>
    {/* Outside the form, so its buttons can never submit the details. */}
    <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${customer.name}?`}
        description={
          <>
            {customer.name} leaves the customer list and can no longer be picked for a quote. Their quotes and orders
            stay as they are, and the record stays in the audit trail.
          </>
        }
        confirmLabel="Delete customer"
        destructive
        onConfirm={remove}
      />
    </>
  );
}
