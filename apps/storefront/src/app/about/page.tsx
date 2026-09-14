import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { buttonClasses, Reveal } from '@beco/ui';
import { RoomStack } from '@/components/room-stack';
import { RotatingStatement } from '@/components/rotating-statement';
import { ShowroomFilm } from '@/components/showroom-film';
import { CompletedInteriors } from '@/components/completed-interiors';
import {
  getPublishedProducts, getCategoryTree, blurProps, primaryImage, orderedImages,
} from '@/lib/products';
import { SITE, SHOWROOM_FILM } from '@/lib/site';

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
 * Each pillar carries a photograph now: a real installation shot where one
 * exists, and Lighting and Panels, which have no photography yet, get the
 * same charcoal name plate the shop's range tiles use rather than an
 * invented stock image.
 *
 * Redesigned 14 September on direct feedback that the page "does not look
 * the part": the statement of intent was text against a blank column, and
 * the pillars were a thin row of small thumbnails, both reading as a spec
 * sheet rather than the editorial, photograph led page a premium interior
 * brand's About page should be. Two sections gained real photography rather
 * than more copy, and two are genuinely new: the showroom's own footage,
 * elsewhere always a small side column, gets one dedicated moment, and
 * `CompletedInteriors`, built for the home page, runs a second time here
 * with its own line rather than repeating Home's word for word.
 *
 * What did NOT carry over from the brief that prompted this: an icon in a
 * square for every service, a stat band claiming years in business, and
 * client testimonials. The first is the exact pattern the design rules
 * name and rule out. The second would be invented: the brand guideline
 * itself, not a summary of it, calls Beco "a new entrant into the market
 * newly launched", which is the opposite of a founding year to boast about,
 * see docs/CONTENT-AUDIT.md. The third has no real quotes to publish yet.
 * The guideline's own photography direction, "hero the location" with wide
 * interior context rather than a tight product crop, and authentic real
 * installations over anything generated, is why every new photograph below
 * is an `application` shot, a real room, not a slab or a material close up.
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
  // The opening photograph: a real Beco installation, wide, and upright. Some
  // rooms rescued from the mis-organised DELFONE folder carry a broken EXIF
  // orientation and render on their side, so the pick is guarded twice: a
  // ratio band that only a genuine landscape interior passes, and a
  // preference for stones that were photographed in their own clean folders.
  const goodRoom = (i: { role: string; width: number; height: number }) =>
    i.role === 'application' && i.width / i.height >= 1.3 && i.width / i.height <= 2;
  const HERO_ORDER = ['bianco-fendi', 'statuario', 'calcatta-gold', 'beverly-gold', 'amber-jade'];
  const aboutHero =
    HERO_ORDER.map(
      (slug) =>
        (products.find((p) => p.slug === slug)?.images ?? [])
          .filter(goodRoom)
          .sort((a, b) => b.width - a.width)[0],
    ).find(Boolean) ??
    products
      .flatMap((p) => p.images ?? [])
      .filter(goodRoom)
      .sort((a, b) => b.width - a.width)[0] ??
    primaryImage(products[0]!);

  // Two more real, wide interior shots for the statement section's layered
  // pair, distinct from the hero's own pick above. Held to the same
  // `goodRoom` band as the hero, per the guideline's own photography
  // direction: wide interior context, never a tight product crop.
  const wideRooms = products
    .flatMap((p) => p.images ?? [])
    .filter((i) => goodRoom(i) && i.path !== aboutHero?.path)
    .sort((a, b) => b.width - a.width);
  const statementPrimary = wideRooms[0];
  const statementAccent = wideRooms[1];

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

  // The rotating statement's words and photographs. These are room types,
  // not places Beco has photographed, on direct instruction: "NAIROBI" came
  // off the list, and each remaining word gets a real photograph of that
  // actual room rather than one of Beco's own application shots reused out
  // of order. Nothing in the catalogue tags a photograph by room type, so
  // reaching for a real kitchen, bathroom, office or showroom photograph
  // sourced and licensed for free commercial use is what keeps the pairing
  // honest, the same reasoning the component's own note explains further.
  const ROTATING_WORDS = ['KITCHENS', 'BATHROOMS', 'OFFICES', 'SHOWROOMS'];
  const rotatingImages = [
    { path: '/rooms/kitchen.webp' },
    { path: '/rooms/bathroom.webp' },
    { path: '/rooms/office.webp' },
    { path: '/rooms/showroom.webp' },
  ];

  return (
    <main>
      {/* --- The opening. A finished Beco room fills the frame and the type
              sits over it at the foot, the same charcoal-photograph
              construction the home hero and the /shop and /contact openings
              use. No fixed viewport height any more, reported directly as
              too much of a screen for a secondary page: it now sizes to its
              own content and padding, the same as Contact's own hero,
              rather than the full-bleed drama the home page's hero earns by
              being the first thing anyone sees on the site. The photograph
              settles out of a slight scale on entry, then drifts slowly.
              Everything collapses to a still frame under reduced motion. --- */}
      <section className="beco-hero-bleed relative isolate overflow-hidden bg-charcoal text-high-vis-white">
        <div className="beco-zoom absolute inset-0">
          {aboutHero ? (
            <div className="beco-drift-slow absolute inset-0">
              <Image
                src={aboutHero.path}
                alt={aboutHero.alt}
                fill
                priority
                sizes="100vw"
                {...blurProps(aboutHero)}
                className="object-cover"
              />
            </div>
          ) : null}
          {/* Legibility, from the site's own charcoal token, weighted to the
              bottom and the left where the type sits. Lighter than before, so
              the room still reads as a room. Never a flat black wash. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/45 to-transparent"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-charcoal/60 via-charcoal/10 to-transparent"
          />
        </div>

        <div className="beco-clip beco-hero-content-top relative mx-auto w-full max-w-[1380px] px-6 sm:px-8 lg:px-12 pb-16 sm:pb-20 lg:pb-24">
          <div className="beco-wipe flex items-center gap-4">
            <span aria-hidden className="h-px w-10 bg-warm-red" />
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.22em] text-neutral-300">
              About Beco Interiors
            </p>
          </div>
          <h1 className="beco-wipe mt-5 max-w-[15ch] font-display text-5xl leading-[1.02] tracking-[-0.02em] sm:text-6xl">
            New here. Stocked already.
          </h1>
          <Reveal delay={140} className="mt-5 max-w-[46ch]">
            <p className="text-base leading-[1.6] text-neutral-200 sm:text-lg">
              A Kenyan interior solutions company. The materials you specify, stocked in Nairobi
              and priced the day you ask.
            </p>
          </Reveal>
          <Reveal delay={220} className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
              Request a quote
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center font-ui text-sm font-semibold uppercase tracking-[0.12em] text-high-vis-white underline-offset-8 hover:underline"
            >
              Visit the showroom
            </Link>
          </Reveal>
        </div>
      </section>

      {/* --- The statement of intent, on white, straight after the photograph.
              Beco's own positioning line, now given a real photograph beside
              it rather than a blank column: a layered pair, one wide room
              shot and a second overlapping it toward the text, the same
              editorial device a photograph led About page uses instead of
              running text the full width of the page. Both real, both
              `application` shots, per the guideline's own photography
              direction. --- */}
      <section className="mx-auto max-w-[1380px] px-6 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-24">
        <Reveal className="beco-clip text-center">
          {/* Centred rather than left set: left aligned inside a section as
              wide as 1380px put most of a short pull quote's own row in
              empty space on anything past a laptop, reported directly as
              looking unbalanced on a wide screen. */}
          <p className="beco-wipe mx-auto max-w-[26ch] font-display text-3xl leading-[1.15] text-charcoal sm:text-4xl lg:max-w-[30ch]">
            Creating spaces through thoughtful materials, intelligent solutions and exceptional
            service.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-x-16 gap-y-14 border-t border-neutral-200 pt-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
          <div className="space-y-6">
            <Reveal>
              <p className="max-w-[54ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
                Great interiors are not simply about how a space looks. They are about how it
                feels, how it functions, and how well every element works together. So we bring
                quality products, practical solutions and a seamless client experience together,
                from the first conversation to project completion.
              </p>
            </Reveal>
            <Reveal delay={80}>
              <p className="max-w-[54ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
                We would rather understand what a project is trying to achieve and then guide the
                choice, than sell the most expensive option in the room. It is an experience, not
                just a product.
              </p>
            </Reveal>
          </div>

          {statementPrimary ? (
            <Reveal delay={140} className="relative mx-auto w-full max-w-[26rem] pb-10 pl-10 lg:mx-0">
              <div className="beco-clip relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
                <div className="beco-wipe absolute inset-0">
                  <Image
                    src={statementPrimary.path}
                    alt={statementPrimary.alt}
                    fill
                    sizes="(max-width: 1024px) 80vw, 26rem"
                    {...blurProps(statementPrimary)}
                    className="object-cover"
                  />
                </div>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                />
              </div>
              {statementAccent ? (
                <div className="beco-clip absolute bottom-0 left-0 aspect-[4/3] w-2/3 overflow-hidden bg-neutral-100 shadow-[0_20px_48px_rgba(16,24,32,0.18)]">
                  <div className="beco-wipe absolute inset-0" style={{ animationDelay: '160ms' }}>
                    <Image
                      src={statementAccent.path}
                      alt={statementAccent.alt}
                      fill
                      sizes="(max-width: 1024px) 55vw, 18rem"
                      {...blurProps(statementAccent)}
                      className="object-cover"
                    />
                  </div>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                  />
                </div>
              ) : null}
            </Reveal>
          ) : null}
        </div>
      </section>

      {/* --- What we sell. The guideline's own four pillars, as a numbered
              editorial list rather than four cards with icons in circles. --- */}
      <section className="mx-auto max-w-[1380px] px-6 sm:px-8 lg:px-12 pb-16 sm:pb-22 lg:pb-30">
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

        {/* An asymmetric grid rather than a uniform row of four, the same
            variable-span technique CompletedInteriors already uses further
            down the page: large tile, small tile, small tile, large tile,
            mirrored so the eye does not read it as four identical boxes.
            Every tile fills with a real installation shot where one exists.
            Lighting and Panels, which do not yet, keep the same charcoal
            name plate the shop's range tiles use, at full tile size now
            rather than a thumbnail, so the two without photography still
            read as a considered choice rather than a gap in the row. */}
        <div className="mt-14 grid gap-6 lg:grid-cols-12 lg:gap-8">
          {PILLARS.map((pillar, i) => {
            const shot = shotForGroup(pillar.groupSlug);
            const large = i === 0 || i === 3;
            return (
              <Reveal key={pillar.title} delay={i * 70} className={large ? 'lg:col-span-7' : 'lg:col-span-5'}>
                <Link href={pillar.href} className="group block h-full">
                  <div
                    className={`beco-clip relative aspect-[4/3] w-full overflow-hidden bg-charcoal ${large ? 'lg:aspect-[16/10]' : 'lg:aspect-[4/3]'}`}
                  >
                    {shot ? (
                      <>
                        <div className="beco-wipe absolute inset-0" style={{ animationDelay: `${(i % 2) * 130}ms` }}>
                          <Image
                            src={shot.path}
                            alt=""
                            fill
                            sizes={large ? '(max-width: 1024px) 100vw, 55vw' : '(max-width: 1024px) 100vw, 38vw'}
                            {...blurProps(shot)}
                            className="object-cover transition-transform duration-500 ease-brand group-hover:scale-[1.03]"
                          />
                        </div>
                        <div
                          aria-hidden
                          className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/15 to-transparent"
                        />
                      </>
                    ) : null}
                    <div className="relative flex h-full flex-col justify-end p-6 sm:p-8">
                      <span
                        aria-hidden
                        className={`font-display text-3xl leading-none ${shot ? 'text-high-vis-white/50' : 'text-neutral-600'}`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="mt-3 font-display text-2xl leading-tight text-high-vis-white sm:text-3xl">
                        {pillar.title}
                        <span
                          aria-hidden
                          className="ml-3 inline-block h-px w-0 bg-warm-red align-middle transition-all duration-500 ease-brand group-hover:w-8"
                        />
                      </h3>
                      <p className={`mt-2 max-w-[38ch] text-sm leading-[1.6] sm:text-base ${shot ? 'text-neutral-200' : 'text-neutral-400'}`}>
                        {pillar.body}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                    />
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* --- The showroom's own footage, elsewhere always a small side column
              beside an address block, given one dedicated moment here
              instead: video in view, the sixth effect in D31's vocabulary,
              and the one this page did not otherwise use. The footage is
              genuinely portrait, phone shot at Urban Square, so the frame
              stays portrait rather than force it into a wide band that
              would crop most of it away: honest to what the file actually
              is rather than distorting it, in the same spirit as the
              guideline's own instruction to keep photography authentic. */}
      {SHOWROOM_FILM ? (
        <section className="bg-neutral-950 py-16 sm:py-22 lg:py-30">
          <div className="mx-auto max-w-[1380px] px-6 sm:px-8 lg:px-12">
            <div className="beco-clip mx-auto max-w-[36rem] text-center">
              <div className="beco-wipe">
                <div className="flex items-center justify-center gap-4">
                  <span aria-hidden className="h-px w-8 bg-warm-red" />
                  <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Inside the showroom
                  </p>
                </div>
                <h2 className="mt-4 font-display text-4xl leading-[1.08] text-high-vis-white sm:text-5xl">
                  A walk through, before you visit.
                </h2>
              </div>
            </div>
            <Reveal delay={140} className="mx-auto mt-12 w-full max-w-[22rem]">
              <div className="relative overflow-hidden bg-neutral-900 shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
                <ShowroomFilm className="aspect-[9/16] w-full object-cover" />
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* --- Where the material goes. A photograph with the room type knocked
              out of it in outline, one real photograph of that actual room
              behind each word, so "KITCHENS" shows a kitchen rather than
              whichever Beco installation happened to be next in line.
              RotatingStatement owns the crossfade itself, see its own note
              on the two honest ways to pair a word with a photograph. --- */}
      <section aria-label="Where our materials go" className="relative overflow-hidden bg-charcoal">
        <div className="relative h-[46vh] min-h-[20rem] w-full sm:h-[58vh]">
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <h2 className="w-full text-center font-display text-[15vw] leading-none tracking-[0.02em] text-high-vis-white sm:text-[12vw]">
              <RotatingStatement words={ROTATING_WORDS} images={rotatingImages} />
            </h2>
          </div>
        </div>
        <p className="mx-auto max-w-[1380px] px-6 sm:px-8 lg:px-12 pb-14 pt-8 text-center font-ui text-sm uppercase tracking-[0.16em] text-neutral-500">
          Supplied, cut and installed across the city
        </p>
      </section>

      {/* --- Real projects, proof rather than more description. The same
              component Home uses, with its own line rather than Home's word
              for word, since a reader who lands here from Home should not
              read the identical sentence twice. --- */}
      <CompletedInteriors
        products={products}
        eyebrow="Proof, not renders"
        heading="This is what the range becomes."
        body="The stone on the shop floor at Urban Square is the same stone in these rooms. Nothing here is generated."
      />

      {/* --- The showroom, against real installations. --- */}
      <section className="border-y border-neutral-200 bg-neutral-50">
        <div className="mx-auto grid max-w-[1380px] items-center gap-16 px-6 sm:px-8 lg:px-12 py-16 sm:py-22 lg:grid-cols-[1fr_24rem] lg:gap-20 lg:py-30">
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
