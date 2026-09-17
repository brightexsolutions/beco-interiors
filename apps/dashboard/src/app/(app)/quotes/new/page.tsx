import type { Metadata } from 'next';
import { BackLink } from '@beco/ui';
import { NewQuoteForm } from '@/components/new-quote-form';
import { requirePath } from '@/lib/session';

export const metadata: Metadata = {
  title: 'New quote',
  robots: { index: false, follow: false },
};

export default async function NewQuotePage() {
  await requirePath('/quotes');

  return (
    <>
      <BackLink href="/quotes" className="mb-2">
        Quotes
      </BackLink>
      <NewQuoteForm />
    </>
  );
}
