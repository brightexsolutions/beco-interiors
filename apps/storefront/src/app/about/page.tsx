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
import { SITE, SITE_SHOTS, SHOWROOM_FILM } from '@/lib/site';

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

        <div className="beco-clip beco-hero-content-top relative mx-auto w-full max-w-[1380px] px-8 sm:px-10 lg:px-14 pb-16 sm:pb-20 lg:pb-24">
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
      <section className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14 py-16 sm:py-20 lg:py-24">
        <Reveal className="beco-clip text-center">
          {/* Centred rather than left set: left aligned inside a section as
              wide as 1380px put most of a short pull quote's own row in
              empty space on anything past a laptop, reported directly as
              looking unbalanced on a wide screen. Set as an actual quote
              now, on request, the same big opening mark ClientShowcase's
              own testimonials use rather than a plain paragraph: this is
              Beco's own positioning line, and reading as a quote is what it
              is. The rule below it is dropped along with the change, no
              longer needed once the quote mark itself is what separates
              this from the body copy underneath. */}
          <div className="beco-wipe relative mx-auto max-w-[70ch]">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 select-none font-display text-[4.5rem] leading-none text-warm-red/15 sm:text-[5.5rem]"
            >
              &ldquo;
            </span>
            <blockquote className="relative mx-auto max-w-[58ch] font-display text-3xl italic leading-[1.15] text-charcoal sm:text-4xl lg:max-w-[70ch]">
              Creating spaces through thoughtful materials, intelligent solutions and exceptional
              service.
            </blockquote>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-x-16 gap-y-14 pt-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
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
              editorial list rather than four cards with icons in circles.
              Tinted, on request: three plain white sections ran in a row
              from the statement above through to the showroom video, and
              this is the one of the three with real air around it to take
              a tone change without competing with a photograph. --- */}
      <section className="bg-neutral-50 py-16 sm:py-22 lg:py-30">
        <div className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14">
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
        </div>
      </section>

      {/* --- The showroom's own footage, elsewhere always a small side column
              beside an address block, given one dedicated moment here
              instead: video in view, the sixth effect in D31's vocabulary,
              and the one this page did not otherwise use.

              Redone on direct feedback that the centred heading over a
              boxed media block, the previous shape, "did not communicate
              anything" and needed real design: that stacked, centred
              layout is close to the exact generic pattern the design rules
              warn against by name. Rebuilt asymmetric instead, text beside
              the frame rather than above it, the same device the
              statement section higher up this page already uses for its
              own layered photograph, so the page reads as one hand rather
              than two different treatments.

              `beco-showroom-video`, landscape and purpose shot, replaced
              the portrait phone clips this used to be built around. Wider
              now and given the majority column, not full width: it reads
              as a held photograph of a moment rather than a video player
              filling the screen. The glow, stronger than its first pass,
              is the frame's own cinematic cue: a soft blurred halo in the
              footage's own dark tone, bleeding out past the frame's own
              edge the way a real screen throws light in a dim room. --- */}
      {SHOWROOM_FILM ? (
        <section className="bg-neutral-950 py-16 sm:py-22 lg:py-30">
          <div className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14">
            <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
              <div className="beco-clip">
                <div className="beco-wipe">
                  <div className="flex items-center gap-4">
                    <span aria-hidden className="h-px w-8 bg-warm-red" />
                    <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      Inside the showroom
                    </p>
                  </div>
                  <h2 className="mt-4 max-w-[14ch] font-display text-4xl leading-[1.08] text-high-vis-white sm:text-5xl">
                    A walk through, before you visit.
                  </h2>
                  <p className="mt-5 max-w-[36ch] text-base leading-[1.65] text-neutral-400 lg:text-lg">
                    The full sintered stone range, hung and lit at Urban Square, before you have
                    even booked a visit.
                  </p>
                </div>
              </div>

              <Reveal delay={140} className="relative w-full">
                {/* The glow, behind the frame and larger than it, blurred
                    heavily so it reads as ambient light rather than a
                    shape. aria-hidden and z-below: pure atmosphere,
                    nothing a reader or a screen reader needs to resolve. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-10 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,rgba(200,170,120,0.4),transparent)] blur-3xl sm:-inset-16"
                />
                <div className="relative overflow-hidden bg-neutral-900 shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
                  <ShowroomFilm className="aspect-[16/9] w-full object-cover" />
                </div>
                <p className="beco-plate mt-4 font-ui text-xs uppercase tracking-[0.16em] text-neutral-500">
                  Urban Square, Enterprise Road
                </p>
              </Reveal>
            </div>
          </div>
        </section>
      ) : null}

      {/* --- Real projects, proof rather than more description. The same
              component Home uses, with its own line rather than Home's word
              for word, since a reader who lands here from Home should not
              read the identical sentence twice. Sits directly after the
              showroom video on purpose now: a real photograph grid between
              two giant-type moments, not beside another one. --- */}
      <CompletedInteriors
        products={products}
        siteShots={SITE_SHOTS}
        eyebrow="Proof, not renders"
        heading="This is what the range becomes."
        body="The stone on the shop floor at Urban Square is the same stone in these rooms. Nothing here is generated."
      />

      {/* --- Where the material goes. A photograph with the room type knocked
              out of it in outline, one real photograph of that actual room
              behind each word, so "KITCHENS" shows a kitchen rather than
              whichever Beco installation happened to be next in line.
              RotatingStatement owns the crossfade itself, see its own note
              on the two honest ways to pair a word with a photograph.

              Moved to sit after Real projects rather than directly against
              the showroom video, reported directly once the video itself
              gained its own giant centred watermark: two enormous
              type-over-media moments back to back read as the same effect
              repeated rather than two different ones, which the six effect
              vocabulary in D31 rules out. A real photograph grid now sits
              between them instead. --- */}
      <section aria-label="Where our materials go" className="relative overflow-hidden bg-charcoal">
        <div className="relative h-[46vh] min-h-[20rem] w-full sm:h-[58vh]">
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <h2 className="w-full text-center font-display text-[15vw] leading-none tracking-[0.02em] text-high-vis-white sm:text-[12vw]">
              <RotatingStatement words={ROTATING_WORDS} images={rotatingImages} />
            </h2>
          </div>
        </div>
        <p className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14 pb-14 pt-8 text-center font-ui text-sm uppercase tracking-[0.16em] text-neutral-500">
          Supplied, cut and installed across the city
        </p>
      </section>

      {/* --- How a project actually runs, added on request: the page named
              what Beco sells and showed proof it works, but never said what
              working with them is actually like, real content sitting
              unused in docs/BECO-COMPANY-PROFILE.md's own "The client
              journey". The full seven steps there run to a paragraph each;
              condensed to one sentence apiece here, the same discipline the
              home page's own numbered Process list already holds to, so
              this reads as the fuller, relationship-wide version of that
              narrower "how the quote tool works" list rather than a repeat
              of it. Two columns rather than one long column, the only
              numbered list on the site with enough steps to want it. No
              hairline rule under a step, on the same request that removed
              them from Process: the numeral and the air around it carry the
              rhythm instead. Tinted, on request, the second of the two
              white sections either side of it that otherwise ran together
              with the team section below. */}
      <section className="bg-neutral-50 py-16 sm:py-22 lg:py-30">
        <div className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14">
        <div className="beco-clip">
          <div className="beco-wipe">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                How it works
              </p>
            </div>
            <h2 className="mt-4 max-w-[20ch] font-display text-4xl leading-[1.08] tracking-[-0.015em] text-charcoal sm:text-5xl">
              A project, start to finish.
            </h2>
            <p className="mt-5 max-w-[60ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
              Closing a sale is the beginning of delivering on it, not the end of the
              relationship. This is the same path every project takes, whether it is one vanity
              or a whole building.
            </p>
          </div>
        </div>

        <ol className="mt-14 grid gap-x-16 gap-y-10 lg:grid-cols-2">
          {[
            ['Discovery', 'Every project starts with a conversation: what is being built, the application, and what you actually need from it.'],
            ['Consultation and selection', 'Real samples, side by side: colours, textures, finishes and thicknesses, weighed against your space and your budget.'],
            ['Measurement and assessment', 'Where fabrication or installation is involved, a proper measurement or site visit comes before a quotation, not after.'],
            ['Quotation', 'An itemised quote covering material, fabrication, installation and delivery, clear enough that you know exactly what you are agreeing to.'],
            ['Decision and closing', 'Once you are ready, we confirm the selection, the payment terms and a realistic timeline for production and installation.'],
            ['Production, delivery and installation', 'For sintered stone and wall panels we install, the finished result is checked against the same specification the quote promised.'],
            ['Completion', 'A project ends well when you were listened to and properly looked after the whole way through, not just sold to.'],
          ].map(([title, body], i) => (
            <Reveal as="li" key={title} delay={(i % 4) * 60}>
              <div className="grid gap-4 sm:grid-cols-[4.5rem_1fr] sm:gap-6">
                <span aria-hidden className="font-display text-3xl leading-none text-neutral-300 sm:text-4xl">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-display text-xl leading-tight text-charcoal">{title}</h3>
                  <p className="mt-2 max-w-[42ch] text-sm leading-[1.6] text-neutral-700">{body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
        </div>
      </section>

      {/* --- The team, requested by Brown 14 September, placed here on
              purpose: identity, then values, then the range, then proof it
              is real, and only then who you would actually be talking to.
              Showroom and address close the page, since "here is how to
              reach them" belongs after they have been introduced, not
              before.

              NOT `/team`. That page reads real, published `users` rows for
              a stated fraud-prevention purpose, "check that the person you
              are dealing with is actually from Beco", and a check
              constraint refuses `is_public` on any role but `beco_sales` so
              a director can never land there even by mistake. Putting
              placeholder names into that system would put fiction inside
              the exact page a buyer uses to verify a real transaction. This
              is a different, editorial section instead, plain content
              rather than an authenticated account, clearly placeholder
              until Beco supplies real names, titles and photographs.

              Irene Oketch is real, given by name as Head of Brand and
              Marketing; the three agents beside her are placeholders
              standing in the shape a sales team card takes, not claims
              about who specifically works the counter. Every photo slot is
              the same charcoal name plate `/team` itself uses for a real
              agent with no photograph yet, since none of these have one
              either. Standard section padding now that "How it works" sits
              directly above it: the earlier special top padding compensated
              for sitting right under the RotatingStatement band with no
              section of its own between them, which is no longer the case.

              The intro paragraph below draws on the profile's own "Our
              team" section: a growing team with different responsibilities
              but one shared objective, named here in the same order the
              source document gives them, leadership through installation,
              since only individual sales roles were otherwise represented
              on this page despite fabrication and installation being
              claimed as a real service elsewhere on it. --- */}
      <section className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14 py-16 sm:py-22 lg:py-30">
        <div className="beco-clip">
          <div className="beco-wipe">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                The team
              </p>
            </div>
            <h2 className="mt-4 max-w-[18ch] font-display text-4xl leading-[1.08] tracking-[-0.015em] text-charcoal sm:text-5xl">
              Who you would actually be talking to.
            </h2>
            <p className="mt-5 max-w-[62ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
              A growing team with different responsibilities and one shared objective: a smooth,
              professional experience from the first conversation to handover.
            </p>
          </div>
        </div>

        {/* Redesigned off a plain definition list, reported directly as
            looking too basic beside how considered the rest of the page
            is: the same soft, raised card the home page's own "Why Beco"
            row uses, a short red rule standing in for an icon rather than
            one in a circle, since there is no individual photograph to
            give one of these abstract role categories a card of its own. */}
        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {[
            ['Leadership and management', 'Strategic direction, operations, marketing, sales and the client experience overall.'],
            ['The sales team', 'Works directly with clients, designers and contractors to understand a project and recommend what actually fits it.'],
            ['Field sales agents', 'Take that same conversation out to sites, designers and businesses beyond the showroom floor.'],
            ['Technical and installation teams', 'Bring an approved selection to life: measurement, fabrication, finishing and installation.'],
          ].map(([role, body], i) => (
            <Reveal key={role} delay={(i % 4) * 60} as="li" className="h-full">
              <div className="h-full bg-high-vis-white p-8 shadow-[0_1px_2px_rgba(16,24,32,0.05),0_16px_32px_-16px_rgba(16,24,32,0.12)]">
                <span aria-hidden className="block h-px w-8 bg-warm-red" />
                <h3 className="mt-5 font-display text-xl leading-tight text-charcoal">{role}</h3>
                <p className="mt-3 max-w-[46ch] text-sm leading-[1.6] text-neutral-700">{body}</p>
              </div>
            </Reveal>
          ))}
        </ul>

        <p className="mt-12 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Who you would meet today
        </p>

        {/* Redesigned off a uniform four-up grid, on request: Irene is a
            real, named, senior hire and the three sales seats beside her
            are not, so a row of four visually identical plates overstated
            the second group and undersold the first. Irene now gets a
            featured card of her own weight, the same "one large tile
            against smaller ones" rule the home page's own range section
            already uses, and the three open seats sit together as a
            clearly related, visually lighter set rather than pretending to
            be three distinct people. Each seat's plate carries its role,
            "Sales, Urban Square", never an invented name standing in for
            one, the same honesty the previous "Sales agent" name plate
            was reaching for but undercut by putting a fake-sounding label
            in the exact display font and position a real name takes. */}
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <article className="flex h-full flex-col">
              <div className="beco-clip relative aspect-[4/5] w-full overflow-hidden bg-charcoal lg:aspect-auto lg:min-h-[24rem]">
                <div className="beco-wipe absolute inset-0 flex flex-col justify-end p-7 sm:p-8">
                  <span aria-hidden className="mb-4 block h-px w-8 bg-warm-red" />
                  <p className="font-display text-4xl leading-[1.05] text-high-vis-white sm:text-5xl">
                    Irene Oketch
                  </p>
                </div>
                <span aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15" />
              </div>
              <p className="mt-5 font-ui text-sm font-semibold uppercase tracking-[0.1em] text-charcoal">
                Head of Brand and Marketing
              </p>
            </article>
          </Reveal>

          <div className="lg:col-span-7">
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              The sales team
            </p>
            <div className="mt-5 grid h-[calc(100%-2rem)] gap-6 sm:grid-cols-3">
              {[
                'Sales, Urban Square',
                'Sales, Urban Square',
                'Sales, field',
              ].map((seat, i) => (
                // PLACEHOLDER: standing in for real sales agents pending
                // real names, titles and photographs from Beco. Not the
                // same three fictional accounts supabase/seed.sql uses for
                // local and staging sign-in, kept deliberately distinct so
                // this content is never mistaken for real, published
                // `/team` data.
                <Reveal key={`${seat}-${i}`} delay={(i + 1) * 60} className="h-full">
                  <article className="flex h-full flex-col">
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 lg:aspect-auto lg:min-h-[13rem]">
                      <div className="absolute inset-0 flex items-end p-5">
                        <p className="font-display text-xl leading-tight text-neutral-500">
                          {seat}
                        </p>
                      </div>
                      <span aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/10" />
                    </div>
                    <p className="mt-3 font-ui text-xs font-semibold uppercase tracking-[0.1em] text-neutral-400">
                      Sales person
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- The showroom, against real installations. --- */}
      <section className="border-y border-neutral-200 bg-neutral-50">
        <div className="mx-auto grid max-w-[1380px] items-center gap-16 px-8 sm:px-10 lg:px-14 py-16 sm:py-22 lg:grid-cols-[1fr_24rem] lg:gap-20 lg:py-30">
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
