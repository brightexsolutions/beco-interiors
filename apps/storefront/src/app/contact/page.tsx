import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Reveal, buttonClasses } from '@beco/ui';
import { ShowroomFilm } from '@/components/showroom-film';
import { getPublishedProducts, blurProps } from '@/lib/products';
import { SITE, whatsappLink } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Contact and showroom',
  description:
    'Beco Interiors, Urban Square, Enterprise Road, Industrial Area, Nairobi. Call +254 722 333 730, message us on WhatsApp, or request a quote.',
  alternates: { canonical: '/contact' },
};

/**
 * Everything here is CONFIRMED, per docs/CONTENT-AUDIT.md. The prototype
 * invented most of its content, but the address, phone, email and hours came
 * from real client contact. Nothing unverified is added: no response time
 * promise, because the prototype claimed two hours in five places and twenty
 * four in a sixth and nobody has confirmed which is real.
 *
 * The NAP block must match the Google Business Profile character for
 * character. A mismatch between the site, the schema and the profile is a
 * ranking drag and it is free to get right.
 */
const DIRECTIONS = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  'Urban Square, Enterprise Road, Industrial Area, Nairobi',
)}`;

const HOURS = [
  ['Monday to Friday', '8am to 6pm'],
  ['Saturday', '8am to 6pm'],
  ['Sunday', 'Closed'],
] as const;

export default async function ContactPage() {
  const products = await getPublishedProducts();
  const room = products
    .flatMap((p) => p.images ?? [])
    .find((i) => i.role === 'application');

  return (
    <main>
      {/* --- A real opening, against a real installation. The page used to
              start with a heading on white and three stacked buttons. --- */}
      <section className="relative border-b border-neutral-200 bg-charcoal">
        {room ? (
          <div className="absolute inset-0">
            <Image
              src={room.path}
              alt=""
              fill
              priority
              sizes="100vw"
              {...blurProps(room)}
              className="object-cover opacity-35"
            />
          </div>
        ) : null}

        <div className="relative mx-auto max-w-[1380px] px-6 py-20 sm:py-24 lg:py-30">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-8 bg-warm-red" />
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Come and see it
            </p>
          </div>
          <h1 className="mt-6 max-w-[14ch] font-display text-5xl leading-[1.04] tracking-[-0.015em] text-high-vis-white sm:text-6xl lg:text-7xl">
            Talk to us.
          </h1>
          <p className="mt-6 max-w-[52ch] text-base leading-[1.65] text-neutral-300 lg:text-lg">
            Materials are hard to choose from a screen. The showroom is open six days a week,
            and the stock you see is the stock we quote from.
          </p>
        </div>
      </section>

      {/* --- The three ways in, as equals in shape and ranked in weight, per
              D26: quote first, WhatsApp second, the business line third. --- */}
      <section className="mx-auto max-w-[1380px] px-6 py-16 sm:py-20">
        <div className="grid gap-px overflow-hidden border border-neutral-200 bg-neutral-200 sm:grid-cols-3">
          <Channel
            eyebrow="Best for a project"
            title="Request a quote"
            body="Send the whole list at once and we price it together, with delivery or collection set out."
            href="/quote"
            cta="Start a quote"
            primary
          />
          <Channel
            eyebrow="Fastest"
            title="WhatsApp"
            body="Send a photograph, a drawing or a question. It is how most of our customers reach us."
            href={whatsappLink()}
            cta="Message us"
            external
            analytics="whatsapp_click"
          />
          <Channel
            eyebrow="Straight through"
            title={SITE.phone}
            body="Monday to Saturday, 8am to 6pm. Ask for whoever is on the counter."
            href={SITE.phoneHref}
            cta="Call now"
            external
            analytics="call_click"
          />
        </div>

        <p className="mt-6 font-ui text-sm text-neutral-500">
          Prefer email? Write to{' '}
          <a
            href={`mailto:${SITE.email}`}
            className="font-semibold text-charcoal underline-offset-4 hover:underline"
          >
            {SITE.email}
          </a>
          .
        </p>
      </section>

      {/* --- The showroom itself: address, hours, and Beco's own footage. --- */}
      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto grid max-w-[1380px] gap-14 px-6 py-16 sm:py-20 lg:grid-cols-[1fr_26rem] lg:gap-20 lg:py-24">
          <Reveal>
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                The showroom
              </p>
            </div>

            <address className="mt-6 not-italic font-display text-3xl leading-[1.25] text-charcoal sm:text-4xl">
              {SITE.address.line1}
              <br />
              {SITE.address.line2}
              <br />
              {SITE.address.city}
            </address>

            <dl className="mt-10 max-w-[34rem] border-t border-neutral-200 font-ui text-base">
              {HOURS.map(([day, time]) => (
                <div
                  key={day}
                  className="flex items-baseline justify-between gap-6 border-b border-neutral-200 py-3"
                >
                  <dt className="text-neutral-500">{day}</dt>
                  <dd className="font-semibold text-charcoal">{time}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href={DIRECTIONS}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses({ variant: 'outline' })}
              >
                Open in Google Maps
              </a>
              <Link href="/gallery" className={buttonClasses({ variant: 'ghost' })}>
                See finished projects
              </Link>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="mx-auto w-full max-w-[20rem] overflow-hidden bg-charcoal">
              <ShowroomFilm className="aspect-[9/16] w-full object-cover" />
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

/**
 * One channel. All three share a shape so the page reads as a set, and the
 * weight is carried by the eyebrow and the button rather than by making one
 * card physically larger, which would break the row on a phone.
 */
function Channel({
  eyebrow, title, body, href, cta, primary, external, analytics,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  primary?: boolean;
  external?: boolean;
  analytics?: string;
}) {
  const inner = (
    <>
      <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {eyebrow}
      </p>
      <p className="mt-4 font-display text-2xl leading-tight text-charcoal">{title}</p>
      <p className="mt-3 flex-1 text-base leading-[1.6] text-neutral-700">{body}</p>
      <span
        className={
          primary
            ? 'mt-6 inline-flex min-h-11 items-center font-ui text-sm font-semibold uppercase tracking-[0.12em] text-warm-red-deep'
            : 'mt-6 inline-flex min-h-11 items-center font-ui text-sm font-semibold uppercase tracking-[0.12em] text-charcoal'
        }
      >
        {cta}
        <span aria-hidden className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
          &rarr;
        </span>
      </span>
    </>
  );

  const className =
    'group flex cursor-pointer flex-col bg-high-vis-white p-8 transition-colors duration-300 hover:bg-neutral-50 sm:p-9';

  return external ? (
    <a href={href} data-analytics={analytics} className={className}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
