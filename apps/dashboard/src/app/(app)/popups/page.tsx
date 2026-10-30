import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, Panel, buttonClasses, cn } from '@beco/ui';
import { PageHeading } from '@/components/page-heading';
import { PopupResults } from '@/components/popup-results';
import { QueryNavigationProvider } from '@/lib/use-query-navigation';
import { describeTrigger, fetchPopupStones, fetchPopups, popupWindow } from '@/lib/popups';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Pop ups',
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function PopupsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePath('/popups');
  const params = await searchParams;
  const supabase = await getSupabase();
  const [popups, stones] = await Promise.all([fetchPopups(supabase), fetchPopupStones(supabase)]);

  const editId = one(params.edit);
  const creating = one(params.new) === '1' && !editId;
  const editing = editId ? (popups.find((row) => row.id === editId) ?? null) : null;
  // Every live one is armed on the site, each on its own trigger.
  const showing = popups.filter((row) => popupWindow(row) === 'live');

  return (
    <>
      <PageHeading
        eyebrow="Storefront"
        title="Pop ups"
        actions={
          <Link href="/popups?new=1" className={cn(buttonClasses({ variant: 'secondary' }), 'gap-2')}>
            <Icon name="plus" />
            New pop up
          </Link>
        }
      />
      <section
        aria-labelledby="popup-on-site"
        className="mb-8 rounded-panel border border-neutral-200 bg-neutral-50 p-4 sm:p-5"
      >
        <h2 id="popup-on-site" className="beco-case mb-2 font-ui text-xs font-semibold text-neutral-500">
          On the site now
        </h2>
        {showing.length > 0 ? (
          <ul className="space-y-1 font-ui text-base text-neutral-700">
            {showing.map((row) => (
              <li key={row.id}>
                <span className="font-semibold text-charcoal">{row.title}</span>
                <span className="text-neutral-500"> · {describeTrigger(row)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-ui text-base text-neutral-700">Nothing is live. No pop up opens on the site.</p>
        )}
      </section>
      <QueryNavigationProvider>
        <Panel className="mb-24">
          <div className="px-4 py-4 sm:px-5 xl:px-0 xl:py-0">
            <PopupResults popups={popups} stones={stones} editing={editing} creating={creating} />
          </div>
        </Panel>
      </QueryNavigationProvider>
    </>
  );
}
