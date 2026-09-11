import type { Metadata } from 'next';
import { EmptyState } from '@beco/ui';
import { requirePath } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Quotes',
  robots: { index: false, follow: false },
};

/**
 * Placeholder so the salesperson landing resolves. The quote list, detail and
 * counter flow are M5 section D. Gated here as well as in the proxy, per
 * "checks in two places".
 */
export default async function QuotesPage() {
  await requirePath('/quotes');

  return (
    <EmptyState
      title="Quotes"
      description="The quote list, the counter flow and the branded quote document all arrive in the next build. This is where they will live."
    />
  );
}
