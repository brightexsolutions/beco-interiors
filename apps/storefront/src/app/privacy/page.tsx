import type { Metadata } from 'next';
import { pageMetadata, sectionOgImage } from '@/lib/seo';
import { PageHeader } from '@/components/page-header';
import { LegalSection } from '@/components/legal-section';
import { SITE } from '@/lib/site';

export const revalidate = 3600;

/**
 * Privacy policy, the natural pair to `/terms` in the footer.
 *
 * `LAST_UPDATED` is set by hand when this page's content actually changes,
 * matching `/terms`' own note on why that is not read from a clock. First
 * written and published 24 September 2026.
 *
 * States what actually happens today rather than a generic template: the
 * quote form is the one place this site asks for a name, phone number and
 * email (per CLAUDE.md's own note that `quotes` and `orders` hold real
 * names and phone numbers), the list a reader builds before that lives in
 * their own browser via localStorage, not on a server, and no advertising
 * or tracking script is wired into the storefront yet, `grep`ed for rather
 * than assumed. Four sections, not six: "what we collect" and "why we
 * collect it" used to be two separate uniform blocks of near identical
 * length, reported directly as reading like a generated checklist rather
 * than something a person at Beco would actually say, so they are folded
 * into one. Update this the day any of it stops being true.
 */
const LAST_UPDATED = '24 September 2026';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy',
  description:
    'What Beco Interiors collects when you request a quote, where it goes, what this site keeps in your browser, and how to ask us to delete your details.',
  path: '/privacy',
  image: sectionOgImage('legal'),
});

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[1380px] px-8 sm:px-24 lg:px-40 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[68ch]">
        <PageHeader
          eyebrow="Your information"
          title="Privacy policy."
          lede="What we ask for when you request a quote, and what we do with it."
        />
        <p className="mt-4 font-ui text-sm text-neutral-500">Last updated {LAST_UPDATED}</p>

        <div className="mt-14 space-y-12">
          <LegalSection title="What we collect, and why">
            <p>
              When you request a quote or get in touch, we ask for your name, phone number and,
              if you give it, your email, company and project details. That is it: no payment
              details anywhere on this site. It goes toward pricing your list, following up on
              the quote and fulfilling the order if you go ahead, never advertising, and it is
              not sold or passed to anyone outside Beco.
            </p>
          </LegalSection>

          <LegalSection title="Your list, before you send it">
            <p>
              The materials you add while browsing are kept in your own browser, not on our
              servers, so the list survives a refresh without an account. Nobody at Beco sees it
              until you choose to send it as a quote request.
            </p>
          </LegalSection>

          <LegalSection title="Where it goes">
            <p>
              Quote and order details sit in our database, reachable only by Beco staff who need
              them to do their job. If an order needs delivering, we share your name, phone
              number and delivery address with whoever is making that delivery. Nothing more, and
              nobody else.
            </p>
          </LegalSection>

          <LegalSection title="Cookies and tracking">
            <p>
              We measure how the site is used with Google Analytics, which sets its own cookies,
              and with Vercel&apos;s analytics, which sets none. We also count calls, WhatsApp
              messages and quote requests by the page they started from. None of this records
              your name, number or what you asked for, and none of it is used for advertising.
            </p>
          </LegalSection>

          <LegalSection title="Questions, or asking us to delete your details">
            <p>
              Call {SITE.phone} or write to{' '}
              <a href={`mailto:${SITE.email}`} className="font-semibold text-charcoal underline-offset-4 hover:underline">
                {SITE.email}
              </a>{' '}
              and we will remove anything we are not required to keep for our own accounting
              records.
            </p>
          </LegalSection>
        </div>
      </div>
    </main>
  );
}
