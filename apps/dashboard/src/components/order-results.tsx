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
  if (!order.isPriced) return <span className="whitespace-nowrap text-neutral-500">Pricing on application</span>;
  return <span className="whitespace-nowrap tabular-nums">{money(order.value)}</span>;
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
        className="whitespace-nowrap font-semibold text-charcoal underline decoration-neutral-300 underline-offset-4 hover:decoration-charcoal"
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
      <div className="min-w-[11rem]">
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
    render: (order) => <span className="whitespace-nowrap">{order.salespersonName ?? <span className="text-neutral-500">Unassigned</span>}</span>,
  },
  {
    key: 'source',
    header: 'Source',
    showFrom: '2xl',
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
    headerHidden: true,
    align: 'right',
    render: (order) => (
      <Link
        href={`/orders/${order.referenceNumber}`}
        aria-label={`View ${order.referenceNumber}`}
        className={cn(buttonClasses({ variant: 'ghost' }), 'h-11 w-11 px-0 py-0')}
      >
        <Icon name="arrow-right" />
        <span className="sr-only">View</span>
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
        className="group flex items-stretch gap-3 overflow-hidden rounded-panel border border-neutral-200 py-3 pl-4 pr-3 transition-shadow hover:shadow-panel active:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warm-red"
      >
        {/* The customer owns a row and wraps; the figure sits with the status
            on the next, so nothing is cut to make room (D112). */}
        <div className="min-w-0 flex-1">
          <p className="font-ui text-base font-semibold leading-snug text-charcoal [overflow-wrap:anywhere]">{order.customerName}</p>
          <p className="mt-0.5 font-ui text-sm text-neutral-500 [overflow-wrap:anywhere]">
            <span className="tabular-nums">{order.referenceNumber}</span> · {order.customerPhone}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <p className="font-ui text-base font-semibold text-charcoal">
              <ValueCell order={order} />
            </p>
            <BadgeRow order={order} />
          </div>
          <p className="mt-1.5 font-ui text-sm text-neutral-500">
            {order.salespersonName ?? 'Unassigned'}
            <span className="ml-2 whitespace-nowrap tabular-nums">
              {formatDate(order.createdAt)}, {formatTime(order.createdAt)}
            </span>
          </p>
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

export function OrderResults({ orders }: { orders: OrderListItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
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
      <div className="hidden xl:block">
        <DataTable
          busy={isPending}
          caption={`${paged.total} orders`}
          columns={columns}
          rows={paged.items}
          getRowKey={(order) => order.id}
        />
      </div>

      <ul className="grid gap-2 xl:hidden">
        {paged.items.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </ul>

      <Pagination
        className="mt-4 xl:px-5 xl:pb-4"
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
