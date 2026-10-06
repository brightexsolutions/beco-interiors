import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { AuditFilters } from '@/components/audit-filters';
import { AuditResults } from '@/components/audit-results';
import { fetchAuditLog, type AuditFilters as Filters } from '@/lib/audit';
import { QueryNavigationProvider } from '@/lib/use-query-navigation';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Audit',
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function AuditPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePath('/audit');
  const params = await searchParams;
  const filters: Filters = {
    search: one(params.search) || undefined,
    entity: one(params.entity) || undefined,
    action: one(params.action) || undefined,
  };
  const supabase = await getSupabase();
  const rows = await fetchAuditLog(supabase, filters);
  const viewing = rows.find((row) => row.id === one(params.row)) ?? null;

  return (
    <>
      <PageHeading eyebrow="Studio" title="Audit" />
      {/* One transition for the filters and the list. D117. */}
      <QueryNavigationProvider>
        <div className="mb-4">
          {/* The log query stops at 200 rows, so the count says "latest" there. */}
          <AuditFilters
            count={rows.length >= 200 ? `Latest ${rows.length} events` : `${rows.length} ${rows.length === 1 ? 'event' : 'events'}`}
          />
        </div>
        <AuditResults rows={rows} viewing={viewing} />
      </QueryNavigationProvider>
    </>
  );
}
