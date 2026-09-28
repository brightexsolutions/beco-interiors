import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState, StatCard } from '@beco/ui';
import { HomeFocus } from '@/components/home-focus';
import { PageHeading } from '@/components/page-heading';
import { RecentQuotes } from '@/components/recent-quotes';
import { ROLE_LANDING } from '@/lib/access';
import { fetchDashboardSummary, toFocus, toStatCards } from '@/lib/dashboard-summary';
import { fetchApprovalCount, fetchQuotes } from '@/lib/quotes';
import { requireUser } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Beco Operations',
  robots: { index: false, follow: false },
};

const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? '';

const todayInNairobi = () =>
  new Date().toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Nairobi',
  });

/**
 * Role-based landing (PRD section 4.2). A salesperson and the product manager
 * open onto their own work; the admins get this page; an editor, which has
 * no operations screen, gets a plain page rather than being bounced out.
 *
 * Reading order: what needs someone today (the charcoal focus panel), how
 * the month is going (linked tiles, each with its comparison), then what
 * just came in. The figures come from `dashboard_summary()` in one round
 * trip against Africa/Nairobi boundaries, a security INVOKER function, so
 * RLS decides what each role can count.
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
  const [summary, approvals, recent] = await Promise.all([
    fetchDashboardSummary(supabase),
    fetchApprovalCount(supabase),
    fetchQuotes(supabase, user.userId, { owner: 'all', limit: 6 }),
  ]);
  const focus = toFocus(summary);
  const cards = toStatCards(summary);

  return (
    <>
      <PageHeading eyebrow={todayInNairobi()} title={`Good to see you, ${firstName(user.fullName) || 'there'}`} />

      <HomeFocus focus={focus} approvals={approvals} />

      <h2 className="mb-3 mt-8 font-ui text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">This month</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        {cards.map(({ href, actionLabel, ...card }, index) => (
          <StatCard
            key={card.label}
            {...card}
            // Won this month leads; on a phone it spans the row so the
            // two-column grid below it stays even.
            className={index === 0 ? 'col-span-2 xl:col-span-1' : undefined}
            action={<Link href={href}>{actionLabel}</Link>}
          />
        ))}
      </div>

      <div className="mt-8">
        <RecentQuotes quotes={recent} />
      </div>
    </>
  );
}
