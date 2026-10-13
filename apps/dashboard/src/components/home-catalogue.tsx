import Link from 'next/link';
import { Icon, Panel, cn } from '@beco/ui';
import type { DashboardSummary } from '@/lib/dashboard-summary';

interface Row {
  label: string;
  value: number;
  href: string;
  /** What the figure asks for, when it asks for anything. */
  hint: string;
  attention: boolean;
}

export const catalogueRows = (catalogue: DashboardSummary['catalogue']): Row[] => [
  { label: 'On the website', value: catalogue.published, href: '/products?published=published', hint: 'Published products', attention: false },
  { label: 'Drafts', value: catalogue.draft, href: '/products?published=draft', hint: catalogue.draft > 0 ? 'Not on the site yet' : 'Nothing waiting', attention: false },
  { label: 'Low stock', value: catalogue.low_stock, href: '/products?stock=low', hint: catalogue.low_stock > 0 ? 'At or below the reorder mark' : 'Nothing at the mark', attention: catalogue.low_stock > 0 },
  { label: 'Price on request', value: catalogue.poa, href: '/products?availability=poa', hint: 'Shown without a figure', attention: false },
];

/**
 * The catalogue at a glance, D142: what is live, what is waiting, what is
 * running out. Each figure is a link to the filtered list behind it, so
 * the number and the work it points at are one tap apart.
 */
export function HomeCatalogue({ catalogue }: { catalogue: DashboardSummary['catalogue'] }) {
  const rows = catalogueRows(catalogue);
  return (
    <Panel
      title={
        <div>
          <h2 className="font-ui text-base font-semibold text-charcoal">Catalogue</h2>
          <p className="mt-0.5 font-ui text-sm text-neutral-500">Live, waiting and running low.</p>
        </div>
      }
      action={
        <Link href="/products" className="inline-flex min-h-11 items-center font-ui text-sm font-semibold text-charcoal hover:underline">
          Open the catalogue
        </Link>
      }
    >
      <ul className="grid grid-cols-2 divide-x divide-y divide-neutral-200 [&>li:nth-child(-n+2)]:border-t-0 [&>li:nth-child(odd)]:border-l-0">
        {rows.map((row) => (
          <li key={row.label} className="min-w-0 border-neutral-200">
            <Link
              href={row.href}
              className="group flex min-h-24 flex-col justify-between gap-2 px-4 py-4 outline-none transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-charcoal sm:px-5"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-ui text-sm font-semibold text-neutral-500">{row.label}</span>
                <Icon name="arrow-right" className="text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-charcoal motion-reduce:transition-none" />
              </span>
              <span>
                <span className={cn('block font-display text-3xl leading-none tabular-nums lining-nums', row.attention ? 'text-warm-red-deep' : 'text-charcoal')}>
                  {row.value}
                </span>
                <span className="mt-1 block font-ui text-sm text-neutral-500">{row.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
