import type { Metadata } from 'next';
import { pageMetadata, sectionOgImage } from '@/lib/seo';
import { PageHeader } from '@/components/page-header';
import { QuoteBuilder } from '@/components/quote-builder';

export const metadata: Metadata = pageMetadata({
  title: 'Request a Quote',
  description:
    'Tell us what your project needs and we price the whole list in one quote. No account needed. Or call +254 722 333 730 and message us on WhatsApp.',
  path: '/quote',
  image: sectionOgImage('quote'),
  // A personal working list, not a page for search results.
  robots: { index: false, follow: true },
});

export default function QuotePage() {
  return (
    <main className="mx-auto max-w-[1380px] px-8 sm:px-24 lg:px-40 py-16 sm:py-20 lg:py-24">
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
