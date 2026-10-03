import type { Metadata } from 'next';
import Link from 'next/link';
import { Panel, TableToolbar, buttonClasses, cn } from '@beco/ui';
import { PageHeading } from '@/components/page-heading';
import { QuoteFilters, type OwnerOption } from '@/components/quote-filters';
import { QuoteResults } from '@/components/quote-results';
import { fetchQuotes, type QuoteListItem, type QuoteOwnerFilter } from '@/lib/quotes';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Quotes',
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

const SALES_OWNER_OPTIONS: OwnerOption[] = [
  { value: 'mine', label: 'Assigned to me' },
  { value: 'preparing', label: "I'm preparing" },
  { value: 'unassigned', label: 'Unassigned' },
];

const ADMIN_OWNER_OPTIONS: OwnerOption[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'mine', label: 'Assigned to me' },
  { value: 'preparing', label: "I'm preparing" },
  { value: 'unassigned', label: 'Unassigned' },
];

export default async function QuotesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requirePath('/quotes');
  const params = await searchParams;

  const ownerOptions = user.role === 'beco_sales' ? SALES_OWNER_OPTIONS : ADMIN_OWNER_OPTIONS;
  const defaultOwner: QuoteOwnerFilter = user.role === 'beco_sales' ? 'mine' : 'all';
  const owner = (one(params.owner) || defaultOwner) as QuoteOwnerFilter;
  const status = one(params.status) || undefined;
  const source = one(params.source) || undefined;
  const search = one(params.search) || undefined;
  const approval = one(params.approval) === 'pending' ? 'pending' : undefined;

  const supabase = await getSupabase();
  const quotes = await fetchQuotes(supabase, user.userId, {
    owner,
    status: status as QuoteListItem['status'] | undefined,
    source: source as QuoteListItem['source'] | undefined,
    search,
    approval,
  });

  const withoutApproval = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => (key === 'approval' || value === undefined ? [] : [[key, one(value)]])),
  ).toString();

  return (
    <>
      <PageHeading
        eyebrow="Sales"
        title="Quotes"
        actions={
          // On a phone the bottom bar carries New quote, so this shows from lg.
          <Link href="/quotes/new" className={cn(buttonClasses({ variant: 'secondary' }), 'hidden xl:inline-flex')}>
            New quote
          </Link>
        }
        lede={
          owner === 'unassigned'
            ? 'Website submissions nobody has claimed yet.'
            : owner === 'preparing'
              ? 'Started, not yet assigned to anyone.'
              : undefined
        }
      />

      <Panel>
        <TableToolbar
          filters={<QuoteFilters ownerOptions={ownerOptions} />}
          count={`${quotes.length} ${quotes.length === 1 ? 'quote' : 'quotes'}`}
        />
        {approval ? (
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3 sm:px-5">
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-charcoal bg-charcoal px-3 font-ui text-sm font-semibold text-high-vis-white">
              Needs approval
              <Link
                href={withoutApproval ? `/quotes?${withoutApproval}` : '/quotes'}
                aria-label="Show every quote, not only those needing approval"
                className="-mr-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-neutral-300 hover:bg-high-vis-white/10 hover:text-high-vis-white"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </Link>
            </span>
          </div>
        ) : null}
        <div className="px-4 pb-4 sm:px-5 xl:px-0 xl:pb-0">
          <QuoteResults quotes={quotes} />
        </div>
      </Panel>

    </>
  );
}
