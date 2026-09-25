import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState, StatCard } from '@beco/ui';
import { PageHeading } from '@/components/page-heading';
import { ROLE_LANDING } from '@/lib/access';
import { fetchDashboardSummary, toStatCards } from '@/lib/dashboard-summary';
import { requireUser } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Beco Operations',
  robots: { index: false, follow: false },
};

const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? '';

/**
 * Role-based landing (PRD section 4.2). A salesperson and the product manager
 * open onto their own work; the admins get the stat cards (M5 section H); an
 * editor, which has no operations screen in M5, gets a plain page rather than
 * being bounced out.
 *
 * The six figures come from `dashboard_summary()` in one round trip, computed
 * against Africa/Nairobi boundaries in Postgres. It is a security INVOKER
 * function, so what a role can see is decided by RLS rather than by this
 * page: nothing here re-checks a role before showing a number.
 */
export default async function DashboardHome() {
  const user = await requireUser();

  if (user.role === 'beco_sales' || user.role === 'beco_product_manager') {
    redirect(ROLE_LANDING[user.role]);
  }

  if (user.role === 'beco_editor') {
    return (
      <EmptyState
        title="Nothing assigned yet"
        description="Your account has no operations screen. Blog authoring lives in Studio, which is not part of this release."
      />
    );
  }

  const supabase = await getSupabase();
  const summary = await fetchDashboardSummary(supabase);
  const cards = toStatCards(summary);
  const waiting = summary.awaiting.count;

  return (
    <>
      <PageHeading
        eyebrow="Today"
        title={`Good to see you, ${firstName(user.fullName) || 'there'}`}
        lede={
          waiting === 0
            ? 'Nothing is waiting on a response right now.'
            : `${waiting} quote${waiting === 1 ? '' : 's'} waiting on a response.`
        }
        actions={
          <Link
            href="/quotes?owner=unassigned"
            className="inline-flex min-h-11 items-center rounded-full border border-neutral-300 px-4 font-ui text-sm font-semibold text-charcoal hover:border-charcoal"
          >
            Open the queue
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
    </>
  );
}
