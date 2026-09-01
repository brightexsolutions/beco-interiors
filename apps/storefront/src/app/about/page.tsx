import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { buttonClasses, Reveal } from '@beco/ui';
import { PageHeader } from '@/components/page-header';
import { RoomStack } from '@/components/room-stack';
import { getPublishedProducts, blurProps, primaryImage } from '@/lib/products';
import { SITE } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'About Beco Interiors',
  description:
    'A Nairobi supplier of sintered stone, lighting, panels and interior accessories, holding stock on the ground at Urban Square, Industrial Area.',
  alternates: { canonical: '/about' },
};

/**
 * The about page.
 *
 * **Nothing here claims a history Beco does not have.** The approved prototype
 * said "10+ Years in Nairobi" and "Kenya's trusted interior materials
 * partner". The brand guideline, which is the client's own document, says
 * Beco is "a new entrant into the market newly launched in the East African
 * region". Those cannot both be true, and an overstated claim on a site aimed
 * at architects and contractors who will check is a credibility risk rather
 * than a marketing win. See docs/CONTENT-AUDIT.md.
 *
 * So the page is built on what is actually true and actually good: the range
 * is here, in Nairobi, on the floor, today. For a buyer specifying a project
 * that matters more than a founding date.
 *
 * The four pillars come from the guideline's own strapline, which appears on
 * every page of it. Lighting is named there but has no Drive folder yet, so it
 * is described as part of the range without a link to a category that would be
 * empty. That mismatch is recorded in docs/BRAND-GUIDELINE-NOTES.md as a
 * decision for Beco rather than something to paper over.
 */
const PILLARS = [
  ['Sintered stone', 'Large format slabs for worktops, feature walls, vanities and flooring. Heat, scratch and stain resistant.'],
  ['Lighting', 'Decorative and architectural fittings, specified alongside the surfaces they sit in.'],
  ['Panels', 'Wall panelling and cladding systems for interiors that need to go up quickly and cleanly.'],
  ['Accessories', 'Handles, hinges, legs and the hardware that finishes a piece of joinery properly.'],
];

export default async function AboutPage() {
  const products = await getPublishedProducts();
  const hero = products.find((p) => p.images?.some((i) => i.role === 'application'));
  const heroImage = hero?.images.find((i) => i.role === 'application') ?? primaryImage(products[0]!);

  return (
    <main>
      <div className="mx-auto max-w-[1380px] px-6 py-16 sm:py-20 lg:py-24">
        <PageHeader
          className="mb-16"
          eyebrow="About Beco Interiors"
          title="New here. Stocked already."
          lede={
            <>
              Beco Interiors is a new supplier in the East African market, and we would rather
              say so than pretend otherwise. What matters to a project is not how long we have
              been trading. It is whether the material is in Nairobi when you need it, and
              whether someone can price it today.
            </>
          }
        />

        {heroImage ? (
          <Reveal className="beco-zoom">
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100 sm:aspect-[21/9]">
              <Image
                src={heroImage.path}
                alt={heroImage.alt}
                fill
                priority
                sizes="100vw"
                {...blurProps(heroImage)}
                className="object-cover"
              />
            </div>
          </Reveal>
        ) : null}
      </div>

      {/* --- What we sell. The guideline's own four pillars, as a numbered
              editorial list rather than four cards with icons in circles. --- */}
      <section className="mx-auto max-w-[1380px] px-6 pb-16 sm:pb-22 lg:pb-30">
        <div className="beco-clip">
          <div className="beco-wipe">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                What we supply
              </p>
            </div>
            <h2 className="mt-4 max-w-[18ch] font-display text-4xl leading-[1.08] tracking-[-0.015em] text-charcoal sm:text-5xl">
              Four things, properly stocked.
            </h2>
          </div>
        </div>

        <ol className="mt-14 border-t border-neutral-200">
          {PILLARS.map(([title, body], i) => (
            <Reveal as="li" key={title} delay={i * 60}>
              <div className="grid gap-4 border-b border-neutral-200 py-8 sm:grid-cols-[6rem_1fr] sm:gap-10">
                <span aria-hidden className="font-display text-4xl leading-none text-neutral-300 sm:text-5xl">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-display text-2xl leading-tight text-charcoal">{title}</h3>
                  <p className="mt-2 max-w-[58ch] text-base leading-[1.65] text-neutral-700">{body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* --- The showroom, against real installations. --- */}
      <section className="border-y border-neutral-200 bg-neutral-50">
        <div className="mx-auto grid max-w-[1380px] items-center gap-16 px-6 py-16 sm:py-22 lg:grid-cols-[1fr_24rem] lg:gap-20 lg:py-30">
          <div>
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                The showroom
              </p>
            </div>
            <h2 className="mt-4 max-w-[17ch] font-display text-4xl leading-[1.08] tracking-[-0.015em] text-charcoal sm:text-5xl">
              Materials are hard to choose from a screen.
            </h2>
            <p className="mt-6 max-w-[54ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
              The range is on the floor at Urban Square on Enterprise Road, in Industrial Area,
              six days a week. Bring a drawing, a sample, or a photograph of the room, and we
              will tell you what it takes and what it costs.
            </p>

            <address className="mt-8 not-italic font-ui text-base leading-[1.8] text-neutral-700">
              {SITE.address.line1}
              <br />
              {SITE.address.line2}, {SITE.address.city}
              <br />
              <span className="text-neutral-500">{SITE.hours}</span>
            </address>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
                Request a quote
              </Link>
              <Link href="/contact" className={buttonClasses({ variant: 'outline' })}>
                Directions and hours
              </Link>
            </div>
          </div>

          {/* Real installations, dealing themselves. Beco's own projects, not
              rendered rooms, which is the more valuable asset. */}
          <RoomStack products={products} />
        </div>
      </section>
    </main>
  );
}
