import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { buttonClasses, Reveal } from '@beco/ui';
import { PageHeader } from '@/components/page-header';
import { RoomStack } from '@/components/room-stack';
import { RotatingStatement } from '@/components/rotating-statement';
import { StoneSlider } from '@/components/stone-slider';
import {
  getPublishedProducts, getCategoryTree, blurProps, primaryImage, orderedImages,
  stoneSlidesFrom,
} from '@/lib/products';
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
 *
 * Each pillar carries a photograph on the right now: a real installation
 * shot where one exists, and Lighting and Panels, which have no photography
 * yet, get the same charcoal name plate the shop's range tiles use rather
 * than an invented stock image. The row used to be text alone against a wide
 * empty column, which read as unfinished rather than as restraint.
 */
const PILLARS = [
  {
    title: 'Sintered stone',
    body: 'Large format slabs for worktops, feature walls, vanities and flooring. Heat, scratch and stain resistant.',
    // Matches the range group's slug, per D52, so the row is real
    // navigation rather than a list that happens to describe one.
    href: '/shop/sintered-stone',
    groupSlug: 'sintered-stone',
  },
  {
    title: 'Lighting',
    body: 'Decorative and architectural fittings, specified alongside the surfaces they sit in.',
    href: '/shop/lighting',
    groupSlug: 'lighting',
  },
  {
    title: 'Panels',
    body: 'Wall panelling and cladding systems for interiors that need to go up quickly and cleanly.',
    href: '/shop/wall-panels',
    groupSlug: 'wall-panels',
  },
  {
    title: 'Accessories',
    body: 'Handles, hinges, legs and the hardware that finishes a piece of joinery properly.',
    href: '/shop/accessories',
    groupSlug: 'accessories',
  },
] as const;

export default async function AboutPage() {
  const [products, groups] = await Promise.all([getPublishedProducts(), getCategoryTree()]);
  const hero = products.find((p) => p.images?.some((i) => i.role === 'application'));
  const heroImage = hero?.images.find((i) => i.role === 'application') ?? primaryImage(products[0]!);

  // One real photograph per pillar, matched through the group tree rather
  // than a hand maintained list of category slugs, so it stays correct if a
  // range moves groups. A pillar with no photography yet, Lighting and
  // Panels today, gets a charcoal plate in the markup below instead of a
  // guessed stock image.
  const shotForGroup = (slug: string) => {
    const group = groups.find((g) => g.slug === slug);
    if (!group) return undefined;
    const inGroup = new Set([group.slug, ...group.children.map((c) => c.slug)]);
    for (const p of products) {
      if (!p.category || !inGroup.has(p.category.slug)) continue;
      const shot = orderedImages(p).find((img) => img.role === 'application') ?? primaryImage(p);
      if (shot) return shot;
    }
    return undefined;
  };

  // The rotating statement's photographs. One real application shot per
  // product, cycled if there are fewer products with one than there are
  // words, so the array is always exactly the words' length and the two
  // never fall out of step. See the component's own note on why these are
  // NOT claimed to depict the specific room named above them: nothing in the
  // catalogue tags a photograph by room type, and inventing that label per
  // photo is the kind of claim this project checks before publishing rather
  // than assumes.
  const ROTATING_WORDS = ['NAIROBI', 'KITCHENS', 'BATHROOMS', 'OFFICES', 'SHOWROOMS'];
  const applicationPool = products
    .map((p) => orderedImages(p).find((img) => img.role === 'application'))
    .filter((img): img is NonNullable<typeof img> => img !== undefined);
  const rotatingImages = applicationPool.length > 0
    ? ROTATING_WORDS.map((_, i) => applicationPool[i % applicationPool.length]!)
    : undefined;

  // The opening header's own companion image, reported directly against the
  // blank column beside the title on a wide screen. Real slab photographs,
  // not application shots: this sits beside "New here. Stocked already."
  // and the slab itself, not a room built from it, is what backs that up.
  const stoneSlides = stoneSlidesFrom(products);

  return (
    <main>
      <div className="mx-auto max-w-[1380px] px-6 py-16 sm:py-20 lg:py-24">
        {/* Grid rather than PageHeader's own built-in aside slot: that slot
            bottom-aligns a short caption against the heading, which is the
            right call for the one-line stat the gallery and team pages put
            there, but pushed the heading itself down to match a 360px tall
            image instead. Top aligned here, so the slider actually fills the
            blank column reported directly beside the title on a wide screen,
            rather than shifting the text to chase it. */}
        <div className="mb-16 grid gap-x-12 gap-y-10 lg:grid-cols-[1fr_18rem] lg:items-start">
          <PageHeader
            eyebrow="About Beco Interiors"
            title="New here. Stocked already."
            lede={
              <>
                Beco Interiors is new to the East African market. What matters to a project is
                not how long we have been trading. It is whether the material is in Nairobi when
                you need it, and whether someone can price it today.
              </>
            }
          />
          {stoneSlides.length > 1 ? (
            <StoneSlider slides={stoneSlides} className="hidden lg:block" />
          ) : null}
        </div>

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
          {PILLARS.map((pillar, i) => {
            const shot = shotForGroup(pillar.groupSlug);
            return (
              <Reveal as="li" key={pillar.title} delay={i * 60}>
                <Link
                  href={pillar.href}
                  className="group grid items-center gap-6 border-b border-neutral-200 py-8 sm:grid-cols-[6rem_1fr_11rem] sm:gap-10 lg:grid-cols-[6rem_1fr_15rem]"
                >
                  <span aria-hidden className="font-display text-4xl leading-none text-neutral-300 sm:text-5xl">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-display text-2xl leading-tight text-charcoal">
                      {pillar.title}
                      <span
                        aria-hidden
                        className="ml-3 inline-block h-px w-0 bg-warm-red align-middle transition-all duration-500 ease-brand group-hover:w-8"
                      />
                    </h3>
                    <p className="mt-2 max-w-[58ch] text-base leading-[1.65] text-neutral-700">
                      {pillar.body}
                    </p>
                  </div>
                  {/* The photograph, or a charcoal plate naming the range if
                      it has none yet. Filling the white space to the right of
                      the copy with a real installation rather than leaving it
                      as air, and giving the row somewhere for the eye to land
                      per stone rather than only per line of text. */}
                  <div className="relative hidden aspect-[4/3] w-full overflow-hidden bg-charcoal transition-transform duration-500 ease-brand group-hover:scale-[1.03] sm:block">
                    {shot ? (
                      <Image
                        src={shot.path}
                        alt=""
                        fill
                        sizes="(max-width: 1024px) 176px, 240px"
                        {...blurProps(shot)}
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-end p-4">
                        <p className="font-display text-xl leading-tight text-high-vis-white/70">
                          {pillar.title}
                        </p>
                      </div>
                    )}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                    />
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </ol>
      </section>

      {/* --- Where the material goes. A photograph with the room type knocked
              out of it in outline, cycling through what Beco actually
              supplies, and the PHOTOGRAPH now cycles with it rather than
              sitting on one static image for the whole sequence: it used to
              show the exact same picture behind "KITCHENS" and "OFFICES",
              which reads as unfinished once you notice. RotatingStatement
              owns the crossfade itself, see its own note on why these are
              not captioned as literally being the room named above them. --- */}
      {rotatingImages ? (
        <section aria-label="Where our materials go" className="relative overflow-hidden bg-charcoal">
          <div className="relative h-[46vh] min-h-[20rem] w-full sm:h-[58vh]">
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <h2 className="w-full text-center font-display text-[15vw] leading-none tracking-[0.02em] text-high-vis-white sm:text-[12vw]">
                <RotatingStatement words={ROTATING_WORDS} images={rotatingImages} />
              </h2>
            </div>
          </div>
          <p className="mx-auto max-w-[1380px] px-6 pb-14 pt-8 text-center font-ui text-sm uppercase tracking-[0.16em] text-neutral-500">
            Supplied, cut and installed across the city
          </p>
        </section>
      ) : null}

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
