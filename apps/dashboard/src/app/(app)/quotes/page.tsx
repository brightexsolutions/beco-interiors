import type { Metadata } from 'next';
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

  const supabase = await getSupabase();
  const quotes = await fetchQuotes(supabase, user.userId, {
    owner,
    status: status as QuoteListItem['status'] | undefined,
    source: source as QuoteListItem['source'] | undefined,
    search,
  });

  return (
    <>
      <PageHeading
        eyebrow="Sales"
        title="Quotes"
        lede={
          owner === 'unassigned'
            ? 'Web submissions nobody has claimed yet.'
            : owner === 'preparing'
              ? 'Started, not yet assigned to anyone.'
              : undefined
        }
      />

      <div className="mb-6">
        <QuoteFilters ownerOptions={ownerOptions} />
      </div>

      <QuoteResults quotes={quotes} />
    </>
  );
}
