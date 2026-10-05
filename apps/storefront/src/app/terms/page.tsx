import type { Metadata } from 'next';
import { pageMetadata, sectionOgImage } from '@/lib/seo';
import { PageHeader } from '@/components/page-header';
import { LegalSection } from '@/components/legal-section';
import { SITE } from '@/lib/site';

export const revalidate = 3600;

/**
 * Terms and conditions.
 *
 * `LAST_UPDATED` is set by hand when this page's content actually changes,
 * not read from a clock: a "last updated" date that just says today,
 * forever, is worse than none, because it is trusted. First written and
 * published 24 September 2026.
 *
 * States what is already true elsewhere on the site (30 day quote validity
 * and VAT shown separately per files/BUILD-PLAN.md A3, no online payment
 * through the site itself, the same fraud prevention note `/team` already
 * carries about matching a payment request to a real quote) rather than
 * inventing a returns window or a liability clause nobody at Beco has
 * agreed to. Five sections, not seven: two near-identical uniform blocks
 * (stock availability, damage and shortfalls) were folded into the sections
 * they actually belong beside, reported directly as reading like a
 * generated checklist, one tidy paragraph per heading, all the same length,
 * rather than something a person at Beco would actually say.
 */
const LAST_UPDATED = '24 September 2026';

export const metadata: Metadata = pageMetadata({
  title: 'Terms and Conditions',
  description:
    'The terms Beco Interiors quotes and delivers under in Nairobi: how quotes and prices work, payment, delivery and collection, and what if something is wrong.',
  path: '/terms',
  image: sectionOgImage('legal'),
});

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-[1380px] px-8 sm:px-24 lg:px-40 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[68ch]">
        <PageHeader
          eyebrow="Terms of business"
          title="Terms and conditions."
          lede="The short version of what applies whenever you request a quote, place an order or buy from the showroom."
        />
        <p className="mt-4 font-ui text-sm text-neutral-500">Last updated {LAST_UPDATED}</p>

        <div className="mt-14 space-y-12">
          <LegalSection title="Quotes and pricing">
            <p>
              A written quote holds for 30 days from the date on it. Prices are in Kenyan
              Shillings, VAT charged at 16% and shown as its own line rather than folded into the
              unit price. What is quoted reflects what was in stock the day we raised it, and
              stock does shift between a quote and an order: if it moves, we say so before it
              changes what you pay.
            </p>
          </LegalSection>

          <LegalSection title="Payment">
            <p>
              We do not take payment through this website. Payment terms and our own banking or
              till details are stated on the quote itself, along with a reference number.
            </p>
            <p>
              Before you pay anyone for a Beco order, check that the request matches the quote
              you were sent. If it does not, stop and call{' '}
              <a href={SITE.phoneHref} className="font-semibold text-charcoal underline-offset-4 hover:underline">
                {SITE.phone}
              </a>{' '}
              before sending anything.
            </p>
          </LegalSection>

          <LegalSection title="Delivery, collection, and if something is wrong">
            <p>
              Collect from Urban Square, Industrial Area, or give us the site address and we will
              price delivery separately, whichever the quote sets out. Check what you are taking
              away or receiving before you sign for it. Damaged, or an order short? Tell us the
              moment you notice, not weeks later, so we can put it right.
            </p>
          </LegalSection>

          <LegalSection title="This website">
            <p>
              What is described here, materials, prices, lead times, is accurate as we know it. A
              quote is the real answer: some ranges are still being photographed and this page can
              lag behind what is actually on the showroom floor. Nothing is bought or paid for
              through the site itself.
            </p>
          </LegalSection>

          <LegalSection title="Questions">
            <p>
              These terms are governed by the laws of Kenya. Anything they do not cover:{' '}
              {SITE.phone} or{' '}
              <a href={`mailto:${SITE.email}`} className="font-semibold text-charcoal underline-offset-4 hover:underline">
                {SITE.email}
              </a>
              .
            </p>
          </LegalSection>
        </div>
      </div>
    </main>
  );
}
