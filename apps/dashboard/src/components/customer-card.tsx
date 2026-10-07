import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CustomerSummary } from '@/lib/customer-search';

/**
 * The picked customer, on the new quote form and a quote's page (D130):
 * name, then the contact lines and the KRA PIN when there is one, with the
 * name a link to the customer's page and room for one action beside it.
 * A thin charcoal rule down the edge says it is chosen, not typed.
 */
export function CustomerCard({
  customer,
  action,
  linked = true,
}: {
  customer: CustomerSummary;
  action?: ReactNode;
  /** Whether the name links to the customer's page. */
  linked?: boolean | undefined;
}) {
  const lines = [customer.phone, customer.email, customer.company].filter(Boolean) as string[];
  return (
    <div className="flex items-start justify-between gap-3 border-l-4 border-charcoal bg-neutral-50 px-3 py-2">
      <div className="min-w-0 font-ui">
        {linked ? (
          <Link
            href={`/customers/${customer.id}`}
            className="text-base font-semibold text-charcoal underline decoration-neutral-300 underline-offset-4 [overflow-wrap:anywhere] hover:decoration-charcoal"
          >
            {customer.name}
          </Link>
        ) : (
          <p className="text-base font-semibold text-charcoal [overflow-wrap:anywhere]">{customer.name}</p>
        )}
        {lines.map((line) => (
          <p key={line} className="text-sm tabular-nums text-neutral-500 [overflow-wrap:anywhere]">
            {line}
          </p>
        ))}
        {customer.kraPin ? <p className="text-sm tabular-nums text-neutral-500">KRA PIN {customer.kraPin}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
