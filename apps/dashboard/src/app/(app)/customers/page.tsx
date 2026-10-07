import type { Metadata } from 'next';
import { Panel, TableToolbar } from '@beco/ui';
import { CLIENT_TYPES, type ClientType } from '@beco/types';
import { PageHeading } from '@/components/page-heading';
import { CustomerFilters, CustomerResults } from '@/components/customer-results';
import { NewCustomer } from '@/components/new-customer';
import { fetchCustomers } from '@/lib/customer-records';
import { customerSortFrom } from '@/lib/customer-search';
import { QueryNavigationProvider } from '@/lib/use-query-navigation';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Customers',
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

const parseType = (value: string): ClientType | undefined =>
  (CLIENT_TYPES as readonly string[]).includes(value) ? (value as ClientType) : undefined;

/** The roles that raise quotes, and so add and edit customers (D130). */
const WRITERS = new Set(['beco_sales', 'beco_admin', 'brightex_admin']);

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requirePath('/customers');
  const params = await searchParams;
  // A role that cannot read quotes and orders (the product manager, D87)
  // sees the list without the figures, and cannot sort by spend.
  const showFigures = WRITERS.has(user.role);
  const sort = customerSortFrom(one(params.sort));

  const supabase = await getSupabase();
  const customers = await fetchCustomers(supabase, {
    search: one(params.search) || undefined,
    clientType: parseType(one(params.type)),
    sort: sort === 'spent' && !showFigures ? 'recent' : sort,
  });

  return (
    <>
      <PageHeading eyebrow="Sales" title="Customers" actions={WRITERS.has(user.role) ? <NewCustomer /> : undefined} />

      {/* One transition for the filters and the list. D117. */}
      <QueryNavigationProvider>
        <Panel className="mb-8">
          <TableToolbar
            filters={
              <CustomerFilters
                showSpent={showFigures}
                count={`${customers.length} ${customers.length === 1 ? 'customer' : 'customers'}`}
              />
            }
          />
          <div className="px-4 pb-4 sm:px-5 xl:px-0 xl:pb-0">
            <CustomerResults customers={customers} showFigures={showFigures} />
          </div>
        </Panel>
      </QueryNavigationProvider>
    </>
  );
}
