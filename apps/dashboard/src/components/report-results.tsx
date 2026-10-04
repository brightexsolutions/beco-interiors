'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  EmptyState,
  RankedBars,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type DataTableColumn,
} from '@beco/ui';
import {
  funnelTotals,
  parseView,
  rateLabel,
  reportFigures,
  type ConversionReport,
  type ConversionRow,
  type LeaderboardPerson,
  type LeaderboardReport,
} from '@/lib/reports';

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

const personColumns: DataTableColumn<LeaderboardPerson>[] = [
  {
    key: 'name',
    header: 'Salesperson',
    sortable: true,
    sortValue: (row) => row.full_name,
    render: (row) => row.full_name,
  },
  {
    key: 'raised',
    header: 'Raised',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.raised,
    render: (row) => <span className="tabular-nums">{row.raised}</span>,
  },
  {
    key: 'won',
    header: 'Won',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.won,
    render: (row) => <span className="tabular-nums">{row.won}</span>,
  },
  {
    key: 'value',
    header: 'Won value',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.won_value,
    render: (row) => <span className="tabular-nums">{money(row.won_value)}</span>,
  },
  {
    key: 'conversion',
    header: 'Conversion',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.conversion ?? -1,
    render: (row) => <span className="tabular-nums">{rateLabel(row.conversion)}</span>,
  },
];

const productColumns: DataTableColumn<ConversionRow>[] = [
  {
    key: 'name',
    header: 'Product',
    sortable: true,
    sortValue: (row) => row.name,
    render: (row) => (
      <div>
        <p className="text-charcoal">{row.name}</p>
        {row.category ? <p className="text-neutral-500">{row.category}</p> : null}
      </div>
    ),
  },
  {
    key: 'views',
    header: 'Views',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.views,
    render: (row) => <span className="tabular-nums">{row.views}</span>,
  },
  {
    key: 'cart',
    header: 'Add to cart',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.add_to_cart,
    render: (row) => <span className="tabular-nums">{row.add_to_cart}</span>,
  },
  {
    key: 'quote',
    header: 'Quoted',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.quote_submitted,
    render: (row) => <span className="tabular-nums">{row.quote_submitted}</span>,
  },
  {
    key: 'whatsapp',
    header: 'WhatsApp',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.whatsapp,
    render: (row) => <span className="tabular-nums">{row.whatsapp}</span>,
  },
  {
    key: 'calls',
    header: 'Calls',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.calls,
    render: (row) => <span className="tabular-nums">{row.calls}</span>,
  },
  {
    key: 'view_to_cart',
    header: 'View to cart',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.view_to_cart ?? -1,
    render: (row) => <span className="tabular-nums">{rateLabel(row.view_to_cart)}</span>,
  },
  {
    key: 'cart_to_quote',
    header: 'Cart to quote',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.cart_to_quote ?? -1,
    render: (row) => <span className="tabular-nums">{rateLabel(row.cart_to_quote)}</span>,
  },
];

const categoryColumns: DataTableColumn<ConversionRow>[] = [
  {
    key: 'name',
    header: 'Category',
    sortable: true,
    sortValue: (row) => row.name,
    render: (row) => row.name,
  },
  ...productColumns.slice(1),
];

function ChartCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-panel border border-neutral-200 bg-high-vis-white p-5 shadow-panel">{children}</div>;
}

function PersonCard({ person }: { person: LeaderboardPerson }) {
  return (
    <li className="rounded-panel border border-neutral-200 px-4 py-3">
      <p className="font-ui text-base font-semibold text-charcoal">{person.full_name}</p>
      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 font-ui text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-2">
          <dt className="whitespace-nowrap text-neutral-500">Raised</dt>
          <dd className="tabular-nums text-charcoal">{person.raised}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="whitespace-nowrap text-neutral-500">Won</dt>
          <dd className="tabular-nums text-charcoal">{person.won}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="whitespace-nowrap text-neutral-500">Won value</dt>
          <dd className="tabular-nums text-charcoal">{money(person.won_value)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="whitespace-nowrap text-neutral-500">Conversion</dt>
          <dd className="tabular-nums text-charcoal">{rateLabel(person.conversion)}</dd>
        </div>
      </dl>
    </li>
  );
}

function FunnelCard({ row, kind }: { row: ConversionRow; kind: 'product' | 'category' }) {
  return (
    <li className="rounded-panel border border-neutral-200 px-4 py-3">
      <p className="font-ui text-base font-semibold text-charcoal">{row.name}</p>
      {kind === 'product' && row.category ? <p className="font-ui text-sm text-neutral-500">{row.category}</p> : null}
      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 font-ui text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-2">
          <dt className="whitespace-nowrap text-neutral-500">Views</dt>
          <dd className="tabular-nums">{row.views}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="whitespace-nowrap text-neutral-500">Add to cart</dt>
          <dd className="tabular-nums">{row.add_to_cart}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="whitespace-nowrap text-neutral-500">Quoted</dt>
          <dd className="tabular-nums">{row.quote_submitted}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="whitespace-nowrap text-neutral-500">WhatsApp</dt>
          <dd className="tabular-nums">{row.whatsapp}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="whitespace-nowrap text-neutral-500">Calls</dt>
          <dd className="tabular-nums">{row.calls}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="whitespace-nowrap text-neutral-500">View to cart</dt>
          <dd className="tabular-nums">{rateLabel(row.view_to_cart)}</dd>
        </div>
      </dl>
    </li>
  );
}

function ranked(rows: ConversionRow[]) {
  return [...rows].sort((a, b) => b.views - a.views).slice(0, 8);
}

function FunnelView({
  rows,
  kind,
  columns,
}: {
  rows: ConversionRow[];
  kind: 'product' | 'category';
  columns: DataTableColumn<ConversionRow>[];
}) {
  const emptyTitle = kind === 'product' ? 'No product events' : 'No category events';
  const emptyDescription =
    kind === 'product'
      ? 'The storefront has not recorded views or clicks in this period.'
      : 'Nothing to group by range in this period.';

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const funnel = funnelTotals(rows);
  const top = ranked(rows);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard>
          <RankedBars
            title="Funnel"
            description="Views, then the two steps that follow them"
            valueLabel="Events"
            items={[
              { label: 'Views', value: funnel.views },
              { label: 'Add to cart', value: funnel.add_to_cart },
              { label: 'Quoted', value: funnel.quote_submitted },
            ]}
          />
        </ChartCard>
        <ChartCard>
          <RankedBars
            title={kind === 'product' ? 'Most viewed' : 'Views by category'}
            valueLabel="Views"
            items={top.map((row) => ({ label: row.name, value: row.views }))}
          />
        </ChartCard>
      </div>
      <div className="hidden overflow-x-hidden xl:block">
        <DataTable
          caption={kind === 'product' ? 'Conversion by product' : 'Conversion by category'}
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
        />
      </div>
      <ul className="grid gap-2 xl:hidden">
        {rows.map((row) => (
          <FunnelCard key={row.id} row={row} kind={kind} />
        ))}
      </ul>
    </div>
  );
}

export function ReportResults({
  leaderboard,
  conversion,
}: {
  leaderboard: LeaderboardReport;
  conversion: ConversionReport;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const urlView = parseView(searchParams.get('view') ?? undefined);
  const [view, setViewState] = useState(urlView);

  useEffect(() => {
    setViewState(urlView);
  }, [urlView]);
  const figures = reportFigures(leaderboard);
  const invoiced = money(leaderboard.invoiced);
  const collected = money(leaderboard.collected);
  const wonBars = [...leaderboard.people]
    .sort((a, b) => b.won_value - a.won_value || b.won - a.won)
    .slice(0, 8)
    .map((person) => ({ label: person.full_name, value: person.won_value }));

  const setView = (next: string) => {
    const parsed = parseView(next);
    setViewState(parsed);
    const params = new URLSearchParams(searchParams.toString());
    if (parsed === 'sales') params.delete('view');
    else params.set('view', parsed);
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <StatCard
          size="compact"
          label="Invoiced"
          value={invoiced}
          comparison={leaderboard.period}
          implication="Confirmed or fulfilled"
          tone="inverse"
        />
        <StatCard
          size="compact"
          label="Collected"
          value={collected}
          comparison={`of ${invoiced}`}
          implication="Marked paid"
        />
        <StatCard
          size="compact"
          label="Won"
          value={String(figures.won)}
          comparison={`of ${figures.raised} raised`}
          implication="Quotes that became orders"
        />
        <StatCard
          size="compact"
          label="Conversion"
          value={rateLabel(figures.conversion)}
          comparison={leaderboard.period}
          implication={figures.conversion == null ? 'Nothing raised yet' : 'Won of quotes raised'}
        />
      </div>

      <Tabs value={view} onValueChange={setView} className="mt-8">
        <TabsList aria-label="Report views">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          {leaderboard.people.length === 0 ? (
            <EmptyState title="No salesperson figures" description="Nothing decided in this period yet." />
          ) : (
            <div className="space-y-8">
              <ChartCard>
                <RankedBars title="Won value" description="By salesperson, this period" valueLabel="KES" items={wonBars} format={money} />
              </ChartCard>
              <div className="hidden xl:block">
                <DataTable
                  busy={isPending}
                  caption="Salesperson leaderboard"
                  columns={personColumns}
                  rows={leaderboard.people}
                  getRowKey={(row) => row.id}
                />
              </div>
              <ul className="grid gap-2 xl:hidden">
                {leaderboard.people.map((person) => (
                  <PersonCard key={person.id} person={person} />
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products">
          <FunnelView rows={conversion.products} kind="product" columns={productColumns} />
        </TabsContent>

        <TabsContent value="categories">
          <FunnelView rows={conversion.categories} kind="category" columns={categoryColumns} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
