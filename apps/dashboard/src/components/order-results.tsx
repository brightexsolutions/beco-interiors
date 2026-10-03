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
import { ORDER_SOURCE_LABEL, ORDER_STATUS, PAYMENT_STATUS, type OrderListItem } from '@/lib/orders';

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  });

function ValueCell({ order }: { order: OrderListItem }) {
  if (!order.isPriced) return <span className="text-neutral-500">Pricing on application</span>;
  return <span className="tabular-nums">{money(order.value)}</span>;
}

function BadgeRow({ order }: { order: OrderListItem }) {
  const status = ORDER_STATUS[order.status];
  const payment = PAYMENT_STATUS[order.paymentStatus];
  return (
    <div className="flex flex-wrap gap-1.5">
      <StatusPill label={status.label} tone={status.tone} />
      <StatusPill label={payment.label} tone={payment.tone} />
    </div>
  );
}

const columns: DataTableColumn<OrderListItem>[] = [
  {
    key: 'reference',
    header: 'Order',
    sortable: true,
    sortValue: (order) => order.referenceNumber,
    render: (order) => (
      <Link
        href={`/orders/${order.referenceNumber}`}
        className="font-semibold text-charcoal underline decoration-neutral-300 underline-offset-4 hover:decoration-charcoal"
      >
        {order.referenceNumber}
      </Link>
    ),
  },
  {
    key: 'customer',
    header: 'Customer',
    sortable: true,
    sortValue: (order) => order.customerName,
    render: (order) => (
      <div>
        <p className="text-charcoal">{order.customerName}</p>
        <p className="text-neutral-500">{order.customerPhone}</p>
      </div>
    ),
  },
  { key: 'status', header: 'Status', render: (order) => {
    const status = ORDER_STATUS[order.status];
    return <StatusPill label={status.label} tone={status.tone} />;
  } },
  { key: 'payment', header: 'Payment', render: (order) => {
    const payment = PAYMENT_STATUS[order.paymentStatus];
    return <StatusPill label={payment.label} tone={payment.tone} />;
  } },
  {
    key: 'owner',
    header: 'Owner',
    render: (order) => order.salespersonName ?? <span className="text-neutral-500">Unassigned</span>,
  },
  {
    key: 'source',
    header: 'Source',
    sortable: true,
    sortValue: (order) => order.source,
    render: (order) => ORDER_SOURCE_LABEL[order.source],
  },
  {
    key: 'date',
    header: 'Raised',
    sortable: true,
    sortValue: (order) => order.createdAt,
    render: (order) => (
      <span className="whitespace-nowrap">
        {formatDate(order.createdAt)}
        <span className="ml-1.5 tabular-nums text-neutral-500">{formatTime(order.createdAt)}</span>
      </span>
    ),
  },
  {
    key: 'value',
    header: 'Value',
    align: 'right',
    sortable: true,
    sortValue: (order) => order.value,
    render: (order) => <ValueCell order={order} />,
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    render: (order) => (
      <Link
        href={`/orders/${order.referenceNumber}`}
        aria-label={`View ${order.referenceNumber}`}
        className={cn(buttonClasses({ variant: 'ghost' }), 'h-11 px-3 py-0')}
      >
        <Icon name="arrow-right" />
        View
      </Link>
    ),
  },
];

function OrderCard({ order }: { order: OrderListItem }) {
  return (
    <li>
      <Link
        href={`/orders/${order.referenceNumber}`}
        aria-label={`View ${order.referenceNumber}`}
        className="block rounded-panel border border-neutral-200 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warm-red"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-ui text-base font-semibold text-charcoal">{order.referenceNumber}</span>
          <span className="inline-flex shrink-0 items-center gap-1 font-ui text-sm font-semibold uppercase tracking-[0.09em] text-charcoal">
            View
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate font-ui text-base text-charcoal">
            {order.customerName}
            <span className="ml-2 text-neutral-500">{order.customerPhone}</span>
          </p>
          <p className="shrink-0 font-ui text-base font-semibold text-charcoal">
            <ValueCell order={order} />
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <BadgeRow order={order} />
          <p className="font-ui text-sm text-neutral-500">
            {order.salespersonName ?? 'Unassigned'}
            <span className="ml-2 whitespace-nowrap tabular-nums">
              {formatDate(order.createdAt)}, {formatTime(order.createdAt)}
            </span>
          </p>
        </div>
      </Link>
    </li>
  );
}

export function OrderResults({ orders }: { orders: OrderListItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const requestedPage = Number(searchParams.get('page') ?? 1);
  const paged = paginate(orders, requestedPage);

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders here"
        description="Nothing matches this filter yet. Convert a won quote, or clear the search."
      />
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        <DataTable
          caption={`${paged.total} orders`}
          columns={columns}
          rows={paged.items}
          getRowKey={(order) => order.id}
        />
      </div>

      <ul className="grid gap-2 lg:hidden">
        {paged.items.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </ul>

      <Pagination
        className="mt-4 lg:px-5 lg:pb-4"
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
