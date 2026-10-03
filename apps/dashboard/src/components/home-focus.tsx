import Link from 'next/link';
import type { HomeFocus as HomeFocusData } from '@/lib/dashboard-summary';

interface FocusRow {
  label: string;
  meta: string;
  count: string;
  href: string;
}

/**
 * The first thing on home: what needs someone today. Charcoal carries it,
 * so it reads as the page's lead without spending Warm Red; the red is kept
 * for a breached response target alone. Every row is a link to the list
 * that clears it, and a row with nothing to do is not shown at all.
 */
export function HomeFocus({ focus, approvals }: { focus: HomeFocusData; approvals: number }) {
  const rows: FocusRow[] = [];
  if (approvals > 0) {
    rows.push({
      label: 'Needs approval',
      meta: 'Priced away from the catalogue',
      count: String(approvals),
      href: '/quotes?owner=all&approval=pending',
    });
  }
  if (focus.owedLabel) {
    rows.push({ label: 'Still owed this month', meta: 'Invoiced, not yet collected', count: focus.owedLabel, href: '/orders?payment=unpaid' });
  }
  if (focus.lowStock > 0) {
    rows.push({ label: 'Low stock', meta: 'At or below the reorder mark', count: String(focus.lowStock), href: '/products?stock=low' });
  }
  if (focus.drafts > 0) {
    rows.push({ label: 'Unpublished products', meta: 'Drafts not on the site yet', count: String(focus.drafts), href: '/products?published=draft' });
  }

  return (
    <section
      aria-labelledby="home-focus-title"
      className="overflow-hidden rounded-panel bg-charcoal text-high-vis-white shadow-panel"
    >
      {focus.breached ? <div aria-hidden className="h-1 bg-warm-red-deep" /> : null}
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
        <div className="min-w-0">
          <h2 id="home-focus-title" className="font-ui text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Waiting on a response
          </h2>
          <div className="mt-3 flex items-end gap-4">
            <p className="font-display text-6xl leading-none tabular-nums lining-nums sm:text-7xl">{focus.waiting}</p>
            {focus.breached ? (
              <span className="mb-2 inline-flex items-center rounded-full bg-warm-red-deep px-2.5 py-1 font-ui text-xs font-semibold uppercase tracking-[0.08em] text-high-vis-white">
                Past target
              </span>
            ) : focus.waiting > 0 ? (
              <span className="mb-2 inline-flex items-center rounded-full bg-high-vis-white/10 px-2.5 py-1 font-ui text-xs font-semibold uppercase tracking-[0.08em] text-neutral-300">
                On time
              </span>
            ) : null}
          </div>
          <p className="mt-3 font-ui text-base text-high-vis-white">{focus.waitingLine}</p>
          <p className="mt-1 font-ui text-sm text-neutral-300">{focus.slaLine}</p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link
              href="/quotes?owner=unassigned"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[2px] bg-high-vis-white px-3 sm:px-4 font-ui text-sm font-semibold text-charcoal hover:bg-neutral-100"
            >
              Open queue
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
            <Link
              href="/quotes/new"
              className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[2px] border border-high-vis-white/30 px-4 font-ui text-sm font-semibold text-high-vis-white hover:border-high-vis-white"
            >
              New quote
            </Link>
          </div>
        </div>

        <div className="min-w-0 lg:border-l lg:border-high-vis-white/10 lg:pl-10">
          <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">Also on your plate</h2>
          {rows.length === 0 ? (
            <p className="mt-4 font-ui text-base text-neutral-300">Nothing else needs you today.</p>
          ) : (
            <ul className="mt-2 divide-y divide-high-vis-white/10">
              {rows.map((row) => (
                <li key={row.label}>
                  <Link
                    href={row.href}
                    className="group flex min-h-14 items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-high-vis-white"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-ui text-base font-semibold leading-snug text-high-vis-white">{row.label}</span>
                      <span className="block font-ui text-sm text-neutral-300">{row.meta}</span>
                    </span>
                    {/* A money figure at 2xl left the label three words wide on a
                        phone; xl keeps the label whole and steps up from sm (D112). */}
                    <span className="shrink-0 whitespace-nowrap font-display text-xl tabular-nums lining-nums text-high-vis-white sm:text-2xl">
                      {row.count}
                    </span>
                    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-neutral-300 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
