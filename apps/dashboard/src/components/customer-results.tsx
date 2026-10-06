'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  DataTable,
  EmptyState,
  Icon,
  Pagination,
  buttonClasses,
  cn,
  paginate,
  type DataTableColumn,
} from '@beco/ui';
import { BusyRegion, ListRowLink, ListRows } from '@/components/list-rows';
import { ListFilters } from '@/components/list-filters';
import { useQueryNavigation } from '@/lib/use-query-navigation';
import { CLIENT_TYPE_LABEL, CUSTOMER_SORTS } from '@/lib/customer-search';
import type { CustomerListItem } from '@/lib/customer-records';
import { CLIENT_TYPES } from '@beco/types';

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

const formatDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }) : '';

const TYPE_OPTIONS = [
  { value: '', label: 'Any' },
  ...CLIENT_TYPES.map((type) => ({ value: type, label: CLIENT_TYPE_LABEL[type] })),
];

const SORT_OPTIONS = (Object.keys(CUSTOMER_SORTS) as (keyof typeof CUSTOMER_SORTS)[]).map((value) => ({
  value,
  label: CUSTOMER_SORTS[value].label,
}));

/** Search, client type and sort, written to the URL (D129). */
export function CustomerFilters({ count, showSpent }: { count?: string | undefined; showSpent: boolean }) {
  return (
    <ListFilters
      searchLabel="Search customers"
      searchPlaceholder="Name, phone, company or KRA PIN"
      count={count}
      filters={[
        { param: 'type', label: 'Type', options: TYPE_OPTIONS },
        {
          param: 'sort',
          label: 'Sort',
          options: showSpent ? SORT_OPTIONS : SORT_OPTIONS.filter((option) => option.value !== 'spent'),
          fallback: 'recent',
        },
      ]}
    />
  );
}

const countLabel = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function CustomerRow({ customer, showFigures }: { customer: CustomerListItem; showFigures: boolean }) {
  return (
    <ListRowLink href={`/customers/${customer.id}`} label={`View ${customer.name}`}>
      <p className="font-ui text-base font-semibold leading-snug text-charcoal [overflow-wrap:anywhere]">{customer.name}</p>
      <p className="mt-0.5 font-ui text-sm text-neutral-500 [overflow-wrap:anywhere]">
        <span className="tabular-nums">{customer.phone}</span>
        {customer.company ? ` · ${customer.company}` : ''}
        {customer.clientType ? ` · ${CLIENT_TYPE_LABEL[customer.clientType]}` : ''}
      </p>
      {showFigures ? (
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="font-ui text-base font-semibold tabular-nums text-charcoal">{money(customer.totalSpent)}</p>
          <p className="font-ui text-sm text-neutral-500">
            {countLabel(customer.quoteCount, 'quote', 'quotes')}, {countLabel(customer.orderCount, 'order', 'orders')}
          </p>
        </div>
      ) : null}
      <p className="mt-1 font-ui text-sm text-neutral-500">Last activity {formatDate(customer.lastActivityAt)}</p>
    </ListRowLink>
  );
}

/**
 * The customer list (D130): the table from `xl`, rows below it, both from
 * the same rows. A role that cannot read quotes or orders (the product
 * manager, D87) is not shown counts and totals that would read as zero.
 */
export function CustomerResults({
  customers,
  showFigures,
}: {
  customers: CustomerListItem[];
  /** Quotes, orders and spent. False for a role that cannot read them. */
  showFigures: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { searchParams, navigate, isPending } = useQueryNavigation();
  const requestedPage = Number(searchParams.get('page') ?? 1);
  const paged = paginate(customers, requestedPage);

  const columns = useMemo<DataTableColumn<CustomerListItem>[]>(() => {
    const all: (DataTableColumn<CustomerListItem> & { figure?: boolean })[] = [
      {
        key: 'name',
        header: 'Customer',
        render: (customer) => (
          <div className="min-w-[11rem]">
            <Link
              href={`/customers/${customer.id}`}
              className="font-semibold text-charcoal underline decoration-neutral-300 underline-offset-4 hover:decoration-charcoal"
            >
              {customer.name}
            </Link>
            {customer.company ? <p className="text-neutral-500">{customer.company}</p> : null}
          </div>
        ),
      },
      { key: 'phone', header: 'Phone', render: (customer) => <span className="whitespace-nowrap tabular-nums">{customer.phone}</span> },
      {
        key: 'type',
        header: 'Type',
        render: (customer) =>
          customer.clientType ? CLIENT_TYPE_LABEL[customer.clientType] : <span className="text-neutral-500">Not set</span>,
      },
      {
        key: 'activity',
        header: 'Quotes, orders',
        figure: true,
        render: (customer) => (
          <span className="whitespace-nowrap tabular-nums">
            {customer.quoteCount}, {customer.orderCount}
          </span>
        ),
      },
      {
        key: 'spent',
        header: 'Spent',
        align: 'right',
        figure: true,
        render: (customer) => <span className="whitespace-nowrap tabular-nums">{money(customer.totalSpent)}</span>,
      },
      {
        key: 'last',
        header: 'Last activity',
        render: (customer) => <span className="whitespace-nowrap">{formatDate(customer.lastActivityAt)}</span>,
      },
      {
        key: 'actions',
        header: 'Actions',
        headerHidden: true,
        align: 'right',
        render: (customer) => (
          <Link
            href={`/customers/${customer.id}`}
            aria-label={`View ${customer.name}`}
            className={cn(buttonClasses({ variant: 'ghost' }), 'h-11 w-11 px-0 py-0')}
          >
            <Icon name="arrow-right" />
            <span className="sr-only">View</span>
          </Link>
        ),
      },
    ];
    return all.filter((column) => showFigures || !column.figure);
  }, [showFigures]);

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const query = params.toString();
    navigate(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  if (customers.length === 0) {
    return (
      <BusyRegion busy={isPending}>
        <EmptyState title="No customers here" description="Nothing matches this search. Clear it, or add the customer." />
      </BusyRegion>
    );
  }

  return (
    <>
      <div className="hidden xl:block">
        <DataTable
          busy={isPending}
          caption={`${paged.total} customers`}
          columns={columns}
          rows={paged.items}
          getRowKey={(customer) => customer.id}
        />
      </div>

      <ListRows busy={isPending} label="Customers">
        {paged.items.map((customer) => (
          <CustomerRow key={customer.id} customer={customer} showFigures={showFigures} />
        ))}
      </ListRows>

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
