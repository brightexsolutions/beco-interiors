import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackLink, StatusPill } from '@beco/ui';
import { PageHeading } from '@/components/page-heading';
import { CustomerContact } from '@/components/customer-contact';
import { CustomerEditor } from '@/components/customer-editor';
import { isAdminRole } from '@/lib/access';
import { fetchCustomer, fetchCustomerHistory } from '@/lib/customer-records';
import { CLIENT_TYPE_LABEL } from '@/lib/customer-search';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/lib/orders';
import { QUOTE_STATUS } from '@/lib/quotes';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Customer',
  robots: { index: false, follow: false },
};

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' });

const WRITERS = new Set(['beco_sales', 'beco_admin', 'brightex_admin']);

const RAIL_HEADING = 'font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500';

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePath('/customers');
  const { id } = await params;
  const supabase = await getSupabase();
  const customer = await fetchCustomer(supabase, id);
  if (!customer) notFound();

  const canEdit = WRITERS.has(user.role);
  // The product manager reads the record, not the quotes and orders (D87).
  const showHistory = canEdit;
  const history = showHistory ? await fetchCustomerHistory(supabase, customer.id) : null;

  return (
    <>
      <BackLink href="/customers" className="mb-2">
        Customers
      </BackLink>
      <PageHeading
        eyebrow={customer.clientType ? CLIENT_TYPE_LABEL[customer.clientType] : 'Customer'}
        title={customer.name}
        lede={[customer.phone, customer.company].filter(Boolean).join(' · ')}
      />

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <aside className="min-w-0 space-y-6 border-b border-neutral-200 pb-6 xl:col-start-2 xl:row-start-1 xl:border-b-0 xl:border-l xl:pb-0 xl:pl-8">
          <div>
            <h2 className={RAIL_HEADING}>Contact</h2>
            <div className="mt-2">
              <CustomerContact phone={customer.phone} email={customer.email} reference={customer.name} kind="customer" />
            </div>
          </div>

          {history ? (
            <>
              <div>
                <h2 className={RAIL_HEADING}>Totals</h2>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 font-ui">
                  <div>
                    <dt className="text-sm text-neutral-500">Ordered</dt>
                    <dd className="text-lg font-semibold tabular-nums text-charcoal">{money(history.ordered)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-neutral-500">Paid</dt>
                    <dd className="text-lg font-semibold tabular-nums text-charcoal">{money(history.paid)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-neutral-500">Quotes</dt>
                    <dd className="text-lg font-semibold tabular-nums text-charcoal">{history.quotes.length}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-neutral-500">Orders</dt>
                    <dd className="text-lg font-semibold tabular-nums text-charcoal">{history.orders.length}</dd>
                  </div>
                </dl>
                <p className="mt-2 font-ui text-sm text-neutral-500">VAT inclusive. Cancelled orders left out.</p>
              </div>

              <div>
                <h2 className={RAIL_HEADING}>Quotes</h2>
                {history.quotes.length === 0 ? (
                  <p className="mt-2 font-ui text-sm text-neutral-500">No quotes yet.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-neutral-200 border-y border-neutral-200">
                    {history.quotes.map((quote) => {
                      const status = QUOTE_STATUS[quote.status];
                      return (
                        <li key={quote.id}>
                          <Link
                            href={`/quotes/${quote.reference}`}
                            className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 font-ui hover:bg-neutral-50"
                          >
                            <span className="min-w-0">
                              <span className="block text-base font-semibold tabular-nums text-charcoal">{quote.reference}</span>
                              <span className="block text-sm text-neutral-500">
                                {formatDate(quote.createdAt)}
                                {quote.total > 0 ? `, ${money(quote.total)}` : ''}
                              </span>
                            </span>
                            <StatusPill label={status.label} tone={status.tone} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <h2 className={RAIL_HEADING}>Orders</h2>
                {history.orders.length === 0 ? (
                  <p className="mt-2 font-ui text-sm text-neutral-500">No orders yet.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-neutral-200 border-y border-neutral-200">
                    {history.orders.map((order) => {
                      const status = ORDER_STATUS[order.status];
                      const payment = PAYMENT_STATUS[order.paymentStatus];
                      return (
                        <li key={order.id}>
                          <Link
                            href={`/orders/${order.reference}`}
                            className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 font-ui hover:bg-neutral-50"
                          >
                            <span className="min-w-0">
                              <span className="block text-base font-semibold tabular-nums text-charcoal">{order.reference}</span>
                              <span className="block text-sm text-neutral-500">
                                {formatDate(order.createdAt)}, {money(order.total)}
                              </span>
                            </span>
                            <span className="flex flex-wrap gap-1.5">
                              <StatusPill label={status.label} tone={status.tone} />
                              <StatusPill label={payment.label} tone={payment.tone} />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </aside>

        <div className="min-w-0 xl:col-start-1 xl:row-start-1">
          <CustomerEditor customer={customer} canEdit={canEdit} canDelete={isAdminRole(user.role)} />
        </div>
      </div>
    </>
  );
}
