'use client';

import Link from 'next/link';
import { DataTable, EmptyState, StatusPill, type DataTableColumn } from '@beco/ui';
import { QUOTE_SOURCE_LABEL, QUOTE_STATUS, isExpired, type QuoteListItem } from '@/lib/quotes';

/**
 * The table's column config carries render functions, which cannot cross a
 * server-to-client boundary (React Server Components only pass serializable
 * props). `quotes` is the only thing the server actually needs to hand
 * down; everything presentational, including `DataTable`'s columns, is
 * built here, inside the client boundary.
 */

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' });

function ValueCell({ quote }: { quote: QuoteListItem }) {
  if (!quote.isPriced) return <span className="text-neutral-500">Pricing on application</span>;
  return <span className="tabular-nums">{money(quote.value)}</span>;
}

function BadgeRow({ quote }: { quote: QuoteListItem }) {
  const expired = isExpired(quote.validUntil, quote.status);
  const { label, tone } = QUOTE_STATUS[quote.status];
  return (
    <div className="flex flex-wrap gap-1.5">
      <StatusPill label={label} tone={tone} />
      {quote.requiresApproval && !quote.approvedAt ? <StatusPill label="Needs approval" tone="attention" /> : null}
      {expired ? <StatusPill label="Expired" tone="muted" /> : null}
    </div>
  );
}

function OwnerLine({ quote }: { quote: QuoteListItem }) {
  if (quote.assignedToName) return <span>{quote.assignedToName}</span>;
  if (quote.createdByName) return <span className="text-neutral-500">Preparing: {quote.createdByName}</span>;
  return <span className="text-neutral-500">Unassigned</span>;
}

const columns: DataTableColumn<QuoteListItem>[] = [
  {
    key: 'reference',
    header: 'Quote',
    sortable: true,
    sortValue: (q) => q.referenceNumber,
    render: (q) => (
      <Link href={`/quotes/${q.referenceNumber}`} className="font-semibold text-charcoal hover:underline">
        {q.referenceNumber}
      </Link>
    ),
  },
  {
    key: 'customer',
    header: 'Customer',
    sortable: true,
    sortValue: (q) => q.customerName,
    render: (q) => (
      <div>
        <p className="text-charcoal">{q.customerName}</p>
        <p className="text-neutral-500">{q.customerPhone}</p>
      </div>
    ),
  },
  { key: 'status', header: 'Status', render: (q) => <BadgeRow quote={q} /> },
  { key: 'owner', header: 'Owner', render: (q) => <OwnerLine quote={q} /> },
  {
    key: 'source',
    header: 'Source',
    sortable: true,
    sortValue: (q) => q.source,
    render: (q) => QUOTE_SOURCE_LABEL[q.source],
  },
  {
    key: 'date',
    header: 'Raised',
    sortable: true,
    sortValue: (q) => q.createdAt,
    render: (q) => formatDate(q.createdAt),
  },
  {
    key: 'value',
    header: 'Value',
    align: 'right',
    sortable: true,
    sortValue: (q) => q.value,
    render: (q) => <ValueCell quote={q} />,
  },
];

export function QuoteResults({ quotes }: { quotes: QuoteListItem[] }) {
  if (quotes.length === 0) {
    return (
      <EmptyState
        title="No quotes here"
        description="Nothing matches this filter yet. Try Everyone or clear the search."
      />
    );
  }

  return (
    <>
      {/* Desktop: the sortable table. Per D38, quotes are a decision per
          row, so mobile gets full cards instead, not a squeezed table. */}
      <div className="hidden lg:block">
        <DataTable caption={`${quotes.length} quotes`} columns={columns} rows={quotes} getRowKey={(q) => q.id} />
      </div>

      <ul className="grid gap-3 lg:hidden">
        {quotes.map((q) => (
          <li key={q.id} className="rounded-panel border border-neutral-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/quotes/${q.referenceNumber}`}
                  className="font-ui text-base font-semibold text-charcoal hover:underline"
                >
                  {q.referenceNumber}
                </Link>
                <p className="font-ui text-sm text-neutral-700">{q.customerName}</p>
                <p className="font-ui text-sm text-neutral-500">{q.customerPhone}</p>
              </div>
              <p className="font-ui text-sm font-semibold text-charcoal">
                <ValueCell quote={q} />
              </p>
            </div>
            <div className="mt-3">
              <BadgeRow quote={q} />
            </div>
            <div className="mt-3 flex items-center justify-between font-ui text-sm text-neutral-500">
              <OwnerLine quote={q} />
              <span>{formatDate(q.createdAt)}</span>
            </div>
            <Link
              href={`/quotes/${q.referenceNumber}`}
              className="mt-4 flex min-h-11 items-center justify-center rounded-full border border-neutral-300 font-ui text-sm font-semibold text-charcoal"
            >
              View quote
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
