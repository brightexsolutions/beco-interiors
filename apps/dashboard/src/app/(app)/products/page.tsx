import type { Metadata } from 'next';
import { EmptyState } from '@beco/ui';
import { requirePath } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Products',
  robots: { index: false, follow: false },
};

/**
 * Placeholder so the product manager landing resolves. The products editor is
 * M5 section G. Gated here as well as in the proxy, per "checks in two
 * places".
 */
export default async function ProductsPage() {
  await requirePath('/products');

  return (
    <EmptyState
      title="Products"
      description="The catalogue editor, with prices, specs, availability and SEO overrides, arrives in the next build."
    />
  );
}
