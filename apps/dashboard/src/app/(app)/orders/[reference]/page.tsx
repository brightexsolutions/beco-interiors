import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackLink, StatusPill } from '@beco/ui';
import { PageHeading } from '@/components/page-heading';
import { OrderActions } from '@/components/order-actions';
import { OrderDates } from '@/components/order-dates';
import { OrderDocumentPanel } from '@/components/order-document-panel';
import { OrderLines } from '@/components/order-lines';
import { fetchOrder } from '@/lib/order-detail';
import { ORDER_SOURCE_LABEL, ORDER_STATUS, PAYMENT_STATUS } from '@/lib/orders';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Order',
  robots: { index: false, follow: false },
};

interface Params {
  reference: string;
}

export default async function OrderDetailPage({ params }: { params: Promise<Params> }) {
  const user = await requirePath('/orders');
  const { reference } = await params;
  const decoded = decodeURIComponent(reference);

  const supabase = await getSupabase();
  const order = await fetchOrder(supabase, decoded);
  if (!order) notFound();

  const isAdmin = user.role === 'beco_admin' || user.role === 'brightex_admin';
  const canMutate = isAdmin || order.salespersonId === user.userId;
  const statusMeta = ORDER_STATUS[order.status];
  const paymentMeta = PAYMENT_STATUS[order.paymentStatus];
  const paid = order.paymentStatus === 'paid';

  return (
    <>
      <BackLink href="/orders" className="mb-2">
        Orders
      </BackLink>
      <PageHeading
        eyebrow={ORDER_SOURCE_LABEL[order.source]}
        title={order.reference}
        lede={`${order.customerName} · ${order.customerPhone}`}
        actions={
          paid ? (
            <OrderDocumentPanel
              orderId={order.id}
              updatedAt={order.updatedAt}
              reference={order.reference}
              customerEmail={order.customerEmail}
              customerPhone={order.customerPhone}
              canMutate={canMutate}
              paid
              layout="compact"
            />
          ) : null
        }
      />

      <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
        <StatusPill label={paymentMeta.label} tone={paymentMeta.tone} />
        {!paid ? <p className="font-ui text-base text-neutral-500">Receipt after payment</p> : null}
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <OrderLines lines={order.lines} totals={order.totals} />

          {order.notes ? (
            <div className="mt-8">
              <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">Notes</h2>
              <p className="mt-2 max-w-[68ch] font-ui text-base text-neutral-700">{order.notes}</p>
            </div>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-8 border-t border-neutral-200 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div>
            <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">Actions</h2>
            <div className="mt-3 flex flex-col gap-2">
              {paid ? (
                <OrderDocumentPanel
                  orderId={order.id}
                  updatedAt={order.updatedAt}
                  reference={order.reference}
                  customerEmail={order.customerEmail}
              customerPhone={order.customerPhone}
                  canMutate={canMutate}
                  paid
                  layout="block"
                />
              ) : null}
              <OrderActions
                orderId={order.id}
                updatedAt={order.updatedAt}
                reference={order.reference}
                status={order.status}
                paymentStatus={order.paymentStatus}
                canMutate={canMutate}
              />
            </div>
          </div>

          <div>
            <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">Customer</h2>
            <dl className="mt-2 space-y-1 break-words font-ui text-base text-charcoal">
              <div>{order.customerName}</div>
              <div>
                <a className="text-neutral-500 underline-offset-2 hover:underline" href={`tel:${order.customerPhone}`}>
                  {order.customerPhone}
                </a>
              </div>
              {order.customerEmail ? <div className="text-neutral-500">{order.customerEmail}</div> : null}
              {order.fulfilment ? <div className="text-neutral-500">{order.fulfilment}</div> : null}
              {order.deliveryAddress ? <div className="text-neutral-500">{order.deliveryAddress}</div> : null}
            </dl>
          </div>

          <div>
            <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">Ownership</h2>
            <dl className="mt-2 space-y-1 font-ui text-base">
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
                <dt className="text-neutral-500">Salesperson</dt>
                <dd className="text-right text-charcoal">{order.salespersonName ?? 'Unassigned'}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
                <dt className="text-neutral-500">Raised by</dt>
                <dd className="text-right text-charcoal">{order.createdByName ?? 'Unknown'}</dd>
              </div>
              {order.quoteReference ? (
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
                  <dt className="text-neutral-500">Quote</dt>
                  <dd className="text-right">
                    <Link
                      href={`/quotes/${order.quoteReference}`}
                      className="text-charcoal underline decoration-neutral-300 underline-offset-4 hover:decoration-charcoal"
                    >
                      {order.quoteReference}
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <OrderDates
            createdAt={order.createdAt}
            confirmedAt={order.confirmedAt}
            paidAt={order.paidAt}
            fulfilledAt={order.fulfilledAt}
            cancelledAt={order.cancelledAt}
          />
        </aside>
      </div>
    </>
  );
}
