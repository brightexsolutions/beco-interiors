import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { QuoteBuilder } from '@/components/quote-builder';

export const metadata: Metadata = {
  title: 'Request a quote',
  description:
    'Tell us what your project needs and we will price the whole list. No account required.',
  alternates: { canonical: '/quote' },
  // A personal working list, not a page for search results.
  robots: { index: false, follow: true },
};

export default function QuotePage() {
  return (
    <main className="mx-auto max-w-[1380px] px-6 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-24">
      <PageHeader
        className="mb-14"
        eyebrow="Your list"
        title="Request a quote."
        lede="No account, and only two fields we genuinely need. We price the whole list at once."
      />

      <QuoteBuilder />
    </main>
  );
}
