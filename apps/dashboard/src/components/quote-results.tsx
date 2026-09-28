'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import {
  DataTable,
  EmptyState,
  Icon,
  Pagination,
  StatusPill,
  buttonClasses,
  cn,
  paginate,
  type DataTableColumn,
} from '@beco/ui';
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

/** The hour a quote came in is what tells a salesperson whether it is still
 *  warm, so "16 Sept" alone is not enough on the queue. Africa/Nairobi
 *  explicitly, like every other boundary on this dashboard. */
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  });

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
      <Link
        href={`/quotes/${q.referenceNumber}`}
        className="font-semibold text-charcoal underline decoration-neutral-300 underline-offset-4 hover:decoration-charcoal"
      >
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
    render: (q) => (
      <span className="whitespace-nowrap">
        {formatDate(q.createdAt)}
        <span className="ml-1.5 tabular-nums text-neutral-500">{formatTime(q.createdAt)}</span>
      </span>
    ),
  },
  {
    key: 'value',
    header: 'Value',
    align: 'right',
    sortable: true,
    sortValue: (q) => q.value,
    render: (q) => <ValueCell quote={q} />,
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    render: (q) => (
      <Link
        href={`/quotes/${q.referenceNumber}`}
        aria-label={`View ${q.referenceNumber}`}
        className={cn(buttonClasses({ variant: 'ghost' }), 'h-11 px-3 py-0')}
      >
        <Icon name="arrow-right" />
        View
      </Link>
    ),
  },
];

function QuoteCard({ quote }: { quote: QuoteListItem }) {
  const fresh = quote.status === 'new';
  return (
    <li className="min-w-0">
      <Link
        href={`/quotes/${quote.referenceNumber}`}
        aria-label={`View ${quote.referenceNumber}, ${quote.customerName}`}
        className={cn(
          'group flex items-stretch gap-3 overflow-hidden rounded-panel border border-neutral-200 bg-high-vis-white py-3 pl-4 pr-3',
          'transition-shadow hover:shadow-panel active:bg-neutral-50',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal',
          // A new, untouched quote carries a charcoal edge: the queue reads
          // at a glance without spending Warm Red on every arrival.
          fresh ? 'border-l-4 border-l-charcoal' : null,
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate font-ui text-base font-semibold text-charcoal">{quote.customerName}</p>
            <p className="shrink-0 font-ui text-base font-semibold text-charcoal">
              {quote.isPriced ? <span className="tabular-nums">{money(quote.value)}</span> : <span className="text-neutral-500">POA</span>}
            </p>
          </div>
          <p className="mt-0.5 truncate font-ui text-sm text-neutral-500">
            <span className="tabular-nums">{quote.referenceNumber}</span> · {quote.customerPhone}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <BadgeRow quote={quote} />
            <p className="min-w-0 font-ui text-sm text-neutral-500">
              <OwnerLine quote={quote} />
              <span className="ml-2 whitespace-nowrap tabular-nums">
                {formatDate(quote.createdAt)}, {formatTime(quote.createdAt)}
              </span>
            </p>
          </div>
        </div>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 self-center text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-charcoal motion-reduce:transition-none"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}

export function QuoteResults({ quotes }: { quotes: QuoteListItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const requestedPage = Number(searchParams.get('page') ?? 1);
  const paged = paginate(quotes, requestedPage);

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

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
        <DataTable
          caption={`${paged.total} quotes`}
          columns={columns}
          rows={paged.items}
          getRowKey={(q) => q.id}
        />
      </div>

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 lg:hidden">
        {paged.items.map((q) => (
          <QuoteCard key={q.id} quote={q} />
        ))}
      </ul>

      <Pagination
        className="mt-4"
        page={paged.page}
        pageCount={paged.pageCount}
        from={paged.from}
        to={paged.to}
        total={paged.total}
        onPageChange={setPage}
      />
    </>
  );
}
