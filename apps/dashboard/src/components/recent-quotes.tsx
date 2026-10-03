import Link from 'next/link';
import { StatusPill } from '@beco/ui';
import { QUOTE_SOURCE_LABEL, QUOTE_STATUS, type QuoteListItem } from '@/lib/quotes';

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

/** "2 h ago", "3 d ago": the age at a glance, the exact time is on the quote. */
export const ageLabel = (iso: string, now = Date.now()): string => {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
};

/**
 * The latest quotes, newest first: a salesperson or director sees what just
 * came in without opening the list. Each row is the quote itself.
 */
export function RecentQuotes({ quotes }: { quotes: QuoteListItem[] }) {
  return (
    <section aria-labelledby="recent-quotes-title" className="rounded-panel border border-neutral-200 bg-high-vis-white">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 sm:px-5">
        <h2 id="recent-quotes-title" className="font-ui text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Latest quotes
        </h2>
        <Link href="/quotes?owner=all" className="inline-flex min-h-11 items-center font-ui text-sm font-semibold text-charcoal hover:underline">
          All quotes
        </Link>
      </div>
      {quotes.length === 0 ? (
        <p className="px-4 py-6 font-ui text-base text-neutral-500 sm:px-5">No quotes yet. The first one will show here.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {quotes.map((quote) => {
            const status = QUOTE_STATUS[quote.status];
            return (
              <li key={quote.id}>
                <Link
                  href={`/quotes/${encodeURIComponent(quote.referenceNumber)}`}
                  className="group flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-neutral-50 sm:px-5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-ui text-base font-semibold text-charcoal">{quote.customerName}</span>
                    <span className="block font-ui text-sm text-neutral-500">
                      <span className="tabular-nums">{quote.referenceNumber}</span>
                      <span className="hidden sm:inline"> · {QUOTE_SOURCE_LABEL[quote.source]}</span> · {ageLabel(quote.createdAt)}
                    </span>
                    <span className="block font-ui text-sm tabular-nums text-charcoal sm:hidden">
                      {quote.isPriced ? money(quote.value) : 'POA'}
                    </span>
                  </span>
                  <span className="hidden shrink-0 font-ui text-base tabular-nums text-charcoal sm:block">
                    {quote.isPriced ? money(quote.value) : 'POA'}
                  </span>
                  <StatusPill label={status.label} tone={status.tone} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
