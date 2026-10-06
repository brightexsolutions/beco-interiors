import type { Metadata } from 'next';
import { Panel, TableToolbar } from '@beco/ui';
import { PageHeading } from '@/components/page-heading';
import { OrderFilters, type OrderOwnerOption } from '@/components/order-filters';
import { OrderResults } from '@/components/order-results';
import { fetchOrders, type OrderOwnerFilter } from '@/lib/orders';
import { QueryNavigationProvider } from '@/lib/use-query-navigation';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Orders',
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

const SALES_OWNER_OPTIONS: OrderOwnerOption[] = [
  { value: 'mine', label: 'Assigned to me' },
  { value: 'all', label: 'Everyone' },
];

const ADMIN_OWNER_OPTIONS: OrderOwnerOption[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'mine', label: 'Assigned to me' },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requirePath('/orders');
  const params = await searchParams;

  const ownerOptions = user.role === 'beco_sales' ? SALES_OWNER_OPTIONS : ADMIN_OWNER_OPTIONS;
  const defaultOwner: OrderOwnerFilter = user.role === 'beco_sales' ? 'mine' : 'all';
  const owner = (one(params.owner) || defaultOwner) as OrderOwnerFilter;
  const status = one(params.status) || undefined;
  const payment = one(params.payment) || undefined;
  const source = one(params.source) || undefined;
  const search = one(params.search) || undefined;

  const supabase = await getSupabase();
  const orders = await fetchOrders(supabase, user.userId, {
    owner,
    status: status as never,
    payment: payment as never,
    source: source as never,
    search,
  });

  return (
    <>
      <PageHeading eyebrow="Sales" title="Orders" />

      {/* One transition for the filters and the list. D117. */}
      <QueryNavigationProvider>
        <Panel className="mb-8">
          <TableToolbar
            filters={
              <OrderFilters ownerOptions={ownerOptions} count={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`} />
            }
          />
          <div className="px-4 pb-4 sm:px-5 xl:px-0 xl:pb-0">
            <OrderResults orders={orders} />
          </div>
        </Panel>
      </QueryNavigationProvider>
    </>
  );
}
