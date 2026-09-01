import type { Metadata } from 'next';
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
    <main className="mx-auto max-w-[1380px] px-6 py-16">
      <header className="mb-12">
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px w-8 bg-warm-red" />
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Your list
          </p>
        </div>
        <h1 className="mt-4 max-w-[18ch] font-display text-5xl leading-[1.05] text-charcoal">
          Request a quote.
        </h1>
      </header>
      <QuoteBuilder />
    </main>
  );
}
