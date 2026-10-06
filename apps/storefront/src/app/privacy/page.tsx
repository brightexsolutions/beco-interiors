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
 * States what actually happens rather than a generic template. Rewritten 6
 * October 2026 when analytics went live (D128) and production moved onto
 * beco-prod (D127): it now names the service providers that hold or carry
 * personal data and where, since quotes sit in Supabase in Ireland (EU), not
 * in Kenya, and Kenya's Data Protection Act 2019 expects that disclosed; what
 * Google Analytics reads and how to refuse it; how long things are kept; and
 * the reader's rights, including a complaint to the Office of the Data
 * Protection Commissioner. Short sections in Beco's own voice, as before.
 * Beco should have a lawyer read it; it is accurate to the system, not legal
 * advice. Update it the day any of it stops being true.
 */
const LAST_UPDATED = '6 October 2026';

const link = 'font-semibold text-charcoal underline-offset-4 hover:underline';

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
          <LegalSection title="Who we are">
            <p>
              Beco Interiors Limited, Urban Square, Shop 8 and 9, Enterprise Road, Industrial
              Area, Nairobi, is responsible for the personal details this site collects.
            </p>
          </LegalSection>

          <LegalSection title="What we collect, and why">
            <p>
              When you request a quote or get in touch, we ask for your name, phone number and,
              if you give it, your email, company and project details. That is it: no payment
              details anywhere on this site. We use it to price your list, follow up on the quote
              and fulfil the order if you go ahead. Never for advertising, and we do not sell it.
            </p>
          </LegalSection>

          <LegalSection title="Your list, before you send it">
            <p>
              The materials you add while browsing are kept in your own browser, not on our
              servers, so the list survives a refresh without an account. Nobody at Beco sees it
              until you choose to send it as a quote request.
            </p>
          </LegalSection>

          <LegalSection title="Who handles it for us, and where">
            <p>
              Only Beco staff who need your details to do their job can see them. A few companies
              run parts of this site for us and handle data only on our instructions: Supabase
              stores quotes and orders in Ireland, in the EU; Vercel hosts the site; Resend sends
              our emails; Cloudflare serves our domain and product photographs; Google provides
              the analytics below; and Brightex Solutions, in Nairobi, builds and maintains the
              site. If an order needs delivering, we share your name, phone number and address
              with whoever is making that delivery.
            </p>
          </LegalSection>

          <LegalSection title="Analytics and cookies">
            <p>
              We use Google Analytics to see how the site is used. It sets cookies and reads your
              device, browser and approximate location from your IP address; Google keeps this for
              no more than 14 months. Vercel&apos;s analytics counts visits without cookies. We
              also count calls, WhatsApp messages and quote requests by the page they started
              from. None of this records your name, number or what you asked for, and none of it
              is used for advertising.
            </p>
            <p>
              To opt out, block cookies for this site in your browser, or install{' '}
              <a href="https://tools.google.com/dlpage/gaoptout" className={link} rel="noopener noreferrer" target="_blank">
                Google&apos;s opt-out add-on
              </a>
              . The site works the same either way.
            </p>
          </LegalSection>

          <LegalSection title="How long we keep it">
            <p>
              Quote requests that do not go ahead are kept for as long as they are useful for
              following up, then deleted on request. Orders and the records behind them are kept
              for as long as Kenyan tax law requires, currently five years.
            </p>
          </LegalSection>

          <LegalSection title="Your rights">
            <p>
              Under Kenya&apos;s Data Protection Act, 2019, you can ask to see the details we hold
              about you, to correct them, to delete them, or to stop us using them. Call{' '}
              {SITE.phone} or write to{' '}
              <a href={`mailto:${SITE.email}`} className={link}>
                {SITE.email}
              </a>{' '}
              and we will do it, keeping only what we must for our accounting records. If you are
              not happy with how we handle your details, you can complain to the{' '}
              <a href="https://www.odpc.go.ke" className={link} rel="noopener noreferrer" target="_blank">
                Office of the Data Protection Commissioner
              </a>
              .
            </p>
          </LegalSection>
        </div>
      </div>
    </main>
  );
}
