import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClasses, Reveal } from '@beco/ui';
import { PageHeader } from '@/components/page-header';
import { SITE, whatsappLink } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact and showroom',
  description:
    'Beco Interiors, Urban Square, Enterprise Road, Industrial Area, Nairobi. Call +254 722 333 730, message us on WhatsApp, or request a quote.',
  alternates: { canonical: '/contact' },
};

/**
 * The contact page.
 *
 * Everything here is CONFIRMED, per docs/CONTENT-AUDIT.md. The prototype
 * invented most of its content, but the address, phone, email and hours came
 * from real client contact. Nothing unverified is added: no response time
 * promise, because the prototype claimed two hours in five places and twenty
 * four in a sixth, and nobody has confirmed which is real.
 *
 * The NAP block must match the Google Business Profile character for
 * character. A mismatch between the site, the schema and the profile is a
 * ranking drag and it is free to get right.
 */
const DIRECTIONS = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  'Urban Square, Enterprise Road, Industrial Area, Nairobi',
)}`;

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-[1380px] px-6 py-16 sm:py-20 lg:py-24">
      <PageHeader
        className="mb-16"
        eyebrow="Come and see it"
        title="Talk to us."
        lede="Materials are hard to choose from a screen. The showroom is open six days a week and the stock is on the floor."
      />

      <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
        {/* --- The three actions, ranked as they are everywhere else per
                D26: quote first, WhatsApp second, the business line third. --- */}
        <Reveal>
          <h2 className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Get a price
          </h2>
          <p className="mt-4 max-w-[34ch] font-display text-3xl leading-[1.12] text-charcoal sm:text-4xl">
            Send us the list and we will price it.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:max-w-[22rem]">
            <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
              Request a quote
            </Link>
            <a
              href={whatsappLink()}
              data-analytics="whatsapp_click"
              className={buttonClasses({ variant: 'outline' })}
            >
              Message us on WhatsApp
            </a>
            <a
              href={SITE.phoneHref}
              data-analytics="call_click"
              className={buttonClasses({ variant: 'outline' })}
            >
              Call {SITE.phone}
            </a>
          </div>
          <p className="mt-6 max-w-[46ch] font-ui text-sm text-neutral-500">
            Prefer email? Write to{' '}
            <a
              href={`mailto:${SITE.email}`}
              className="font-semibold text-charcoal underline-offset-4 hover:underline"
            >
              {SITE.email}
            </a>
            .
          </p>
        </Reveal>

        {/* --- The showroom. This block is the local search signal as well as
                the directions, which is why it is marked up as an address and
                repeated exactly in the footer and in the JSON-LD. --- */}
        <Reveal delay={80}>
          <div className="border-t border-neutral-200 pt-8 lg:border-l lg:border-t-0 lg:pl-16 lg:pt-0">
            <h2 className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Showroom
            </h2>
            <address className="mt-5 not-italic font-display text-2xl leading-[1.35] text-charcoal">
              {SITE.address.line1}
              <br />
              {SITE.address.line2}
              <br />
              {SITE.address.city}
            </address>

            <dl className="mt-8 border-t border-neutral-200 font-ui text-base">
              <div className="flex justify-between gap-6 border-b border-neutral-200 py-3">
                <dt className="text-neutral-500">Open</dt>
                <dd className="text-right font-semibold text-charcoal">Monday to Saturday</dd>
              </div>
              <div className="flex justify-between gap-6 border-b border-neutral-200 py-3">
                <dt className="text-neutral-500">Hours</dt>
                <dd className="text-right font-semibold text-charcoal">8am to 6pm</dd>
              </div>
              <div className="flex justify-between gap-6 border-b border-neutral-200 py-3">
                <dt className="text-neutral-500">Sunday</dt>
                <dd className="text-right font-semibold text-charcoal">Closed</dd>
              </div>
            </dl>

            <a
              href={DIRECTIONS}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex min-h-11 items-center font-ui text-sm font-semibold uppercase tracking-[0.12em] text-warm-red-deep underline-offset-4 hover:underline"
            >
              Open in Google Maps
            </a>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
