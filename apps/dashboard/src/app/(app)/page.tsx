import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EmptyState } from '@beco/ui';
import { ROLE_LANDING } from '@/lib/access';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Beco Operations',
  robots: { index: false, follow: false },
};

/**
 * Role-based landing (PRD section 4.2). A salesperson and the product manager
 * open onto their own work; the admins get the stat-card home (M5 section H);
 * an editor, which has no operations screen in M5, gets a plain page rather
 * than being bounced out.
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

  return (
    <EmptyState
      title="Your overview"
      description="Quotes awaiting a response, won this month, conversion, invoiced against collected, leads today, low stock. The six stat cards land in the next build."
    />
  );
}
