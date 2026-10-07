'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { Button, buttonClasses, cn, toast, useKeepValuesSubmit } from '@beco/ui';
import { createCustomer, type CustomerActionState } from '@/app/(app)/customers/actions';
import { CustomerFields } from '@/components/customer-fields';
import type { CustomerSummary } from '@/lib/customer-search';

const INITIAL: CustomerActionState = {};

/**
 * The form that adds a customer without a quote (D130), in a Dialog's body.
 * Used by New customer on the list and by Add new client on a quote.
 *
 * A number that already belongs to someone is not created twice: the
 * server answers with that customer, and the form says whose number it is
 * and offers them instead, a link to their page, or, on a quote, Use them.
 */
export function CustomerCreate({
  onCreated,
  onUseExisting,
  submitLabel = 'Add customer',
}: {
  onCreated: (customer: CustomerSummary) => void;
  /** Given on a quote, where the existing customer can be picked at once. */
  onUseExisting?: ((customer: CustomerSummary) => void) | undefined;
  submitLabel?: string | undefined;
}) {
  const prefix = useId();
  const [state, create, pending] = useActionState(createCustomer, INITIAL);
  const submit = useKeepValuesSubmit(create);
  const handled = useRef<CustomerActionState | null>(null);

  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;
    if (state.ok && state.customer) {
      toast.success(state.ok);
      onCreated(state.customer);
      return;
    }
    // A refusal that belongs to one field is shown under it; the rest toast.
    if (state.error && !state.field) toast.error(state.error);
  }, [state, onCreated]);

  return (
    <form onSubmit={submit} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 space-y-8 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-6">
        {state.existing ? (
          <div role="alert" className="border-l-4 border-charcoal bg-neutral-50 px-4 py-3 font-ui">
            <p className="text-base text-charcoal">
              {state.existing.phone} is already on file for <strong>{state.existing.name}</strong>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {onUseExisting ? (
                <Button type="button" variant="secondary" className="h-11 py-0" onClick={() => onUseExisting(state.existing!)}>
                  Use {state.existing.name}
                </Button>
              ) : null}
              <Link
                href={`/customers/${state.existing.id}`}
                className={cn(buttonClasses({ variant: onUseExisting ? 'outline' : 'secondary' }), 'h-11 py-0')}
              >
                Open {state.existing.name}
              </Link>
            </div>
          </div>
        ) : null}
        <CustomerFields idPrefix={prefix} error={state.error} field={state.field} />
      </div>
      <div className="shrink-0 border-t border-neutral-200 px-5 py-3 sm:px-6">
        <Button type="submit" pending={pending}>
          {pending ? 'Adding' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
