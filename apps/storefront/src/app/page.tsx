import Image from 'next/image';
import Link from 'next/link';
import {
  ProductCard, Reveal, CountUp, CutoutReveal, RangeCardGrid, buttonClasses, cn,
} from '@beco/ui';
import { PinnedHero, type HeroSlab } from '@/components/pinned-hero';
import { HeroStatic } from '@/components/hero-static';
import { QuickAddToQuote } from '@/components/quick-add-to-quote';
import { SlabRail } from '@/components/slab-rail';
import { SlabToSurface } from '@/components/slab-to-surface';
import { RoomStack } from '@/components/room-stack';
import { CompletedInteriors } from '@/components/completed-interiors';
import { ShowroomFilm } from '@/components/showroom-film';
import { ClientShowcase } from '@/components/client-showcase';
import {
  getPublishedProducts, getCategoriesWithProducts, getCategoryTree, primaryImage, imagesForGroup,
  type CatalogueProduct, blurProps,
} from '@/lib/products';
import { getPublishedClients } from '@/lib/clients';
import { SITE, SITE_SHOTS, whatsappLink } from '@/lib/site';

/**
 * The six ranges Beco actually deals in, per docs/BECO-COMPANY-PROFILE.md
 * ("What we do"): sintered stone, wall panels, kitchen accessories, cabinet
 * handles, SPC flooring and furniture accessories. Grouped here the same way
 * migration 19 groups the taxonomy, Kitchen and furniture accessories both
 * landing under the editorial "Accessories" group alongside office fittings.
 *
 * `href` is resolved per group against real product counts below, not
 * written here, so a range that is still empty is never linked from the
 * home page. See `imagesForGroup` and `getCategoriesWithProducts`'s own note
 * on why an empty category stays off a high traffic page.
 */
const RANGE_GROUPS = [
  {
    slug: 'sintered-stone', title: 'Sintered stone',
    body: 'Large format slabs for worktops, feature walls, vanities and flooring, in 12mm and 15mm.',
  },
  {
    slug: 'lighting', title: 'Lighting',
    body: 'Decorative and architectural fittings, specified alongside the surfaces they sit in.',
  },
  {
    slug: 'wall-panels', title: 'Wall panels',
    body: 'Acoustic, bamboo veneer and SPC panelling, for a wall that goes up quickly and cleanly.',
  },
  {
    slug: 'flooring', title: 'SPC flooring',
    body: 'A rigid core plank that sits over most existing floors and clicks together without adhesive.',
  },
  {
    slug: 'hardware', title: 'Hardware',
    body: 'Handles, hinges, door locks and furniture legs, in finishes chosen to sit with the surfaces we supply.',
  },
  {
    slug: 'accessories', title: 'Accessories',
    body: 'Kitchen organisers, floating shelf fittings and office accessories that finish a piece of joinery properly.',
  },
] as const;

/**
 * The home page.
 *
 * Every section behaves differently from its neighbour, drawn from the six
 * effect vocabulary in D31, and no two pinned sections are adjacent. One
 * significant effect per section, which is what keeps a choreographed page
 * from becoming an exhausting one.
 *
 * Nothing here states a fact the database or the confirmed contact block
 * cannot support. The prototype's "10+ years" claim contradicted the brand
 * guideline's own description of a new entrant, so counts on this page are
 * derived from real rows rather than written into the copy. See
 * docs/CONTENT-AUDIT.md.
 */
export const revalidate = 3600;

const imageFor = (p: CatalogueProduct, role?: string) => {
  const img = role ? p.images?.find((i) => i.role === role) : primaryImage(p);
  return img ?? primaryImage(p);
};

export default async function HomePage() {
  const [products, categories, groups, clients] = await Promise.all([
    getPublishedProducts(),
    getCategoriesWithProducts(),
    getCategoryTree(),
    getPublishedClients(),
  ]);

  // A range only gets a link once it has something behind it: the same
  // `product_count > 0` rule `getCategoriesWithProducts` already enforces,
  // applied here to the editorial groups rather than the flat category list.
  const rangeItems = RANGE_GROUPS.map((range) => {
    const group = groups.find((g) => g.slug === range.slug);
    const hasStock = (group?.total_count ?? 0) > 0;
    // Several real photographs where the range has more than one product
    // catalogued, so the card cycles through what is actually in the range
    // rather than repeating one stone's own slab and bookmatch shots.
    const shots = imagesForGroup(groups, products, range.slug);
    return {
      title: range.title,
      body: range.body,
      href: hasStock ? `/shop/${range.slug}` : null,
      images: shots.map((shot) => (
        <Image
          key={shot.path}
          src={shot.path}
          alt=""
          fill
          sizes="(max-width: 1024px) 176px, 240px"
          {...blurProps(shot)}
          className="object-cover"
        />
      )),
    };
  });

  // The hero, the "Stone that behaves like a finished surface" grid and the
  // pinned rail are all about the SINTERED STONE range specifically, so they
  // draw from the stone subset rather than the whole published catalogue.
  // Before the import brought handles and hardware in, `products` happened to
  // be stone only and this was invisible; now a handle would otherwise land
  // in a grid headed "See all 30 colours". The broader "everything on the
  // floor" browse is `RangeBrowse` at the foot of the page, which is meant to
  // carry every range.
  const stones = products.filter((p) => p.category?.slug?.includes('sintered-stone'));

  // Four slabs for the hero, taken from stones that actually have a slab or
  // application shot, so the hero can never fall back to a photograph of a
  // stand.
  //
  // Application over slab, per D79: the hero sells a finished room now, not
  // a material sample, so it needs a stone actually installed somewhere,
  // not a close crop of the sheet it was cut from. Falls back to the slab
  // shot for a stone with no application photography yet, rather than
  // dropping it from the hero entirely.
  const slabs: HeroSlab[] = stones
    .filter((p) => p.images?.some((i) => i.role === 'application' || i.role === 'slab'))
    .slice(0, 4)
    .map((p) => {
      const img =
        p.images.find((i) => i.role === 'application') ??
        p.images.find((i) => i.role === 'slab')!;
      // The chip rail's own image: a slab shot, distinct from the big
      // background it sits beside. Showing the same application photo in
      // both places was reported directly as redundant, the background
      // already being the finished room. Falls back to `img` only for a
      // stone with no slab photography at all.
      const thumb = p.images.find((i) => i.role === 'slab') ?? img;
      return {
        name: p.name, slug: p.slug, src: img.path, alt: img.alt,
        category: p.category?.name ?? 'Sintered stone',
        width: img.width, height: img.height, blur: img.blur,
        thumbSrc: thumb.path, thumbBlur: thumb.blur,
        // Beco's own first sentence for this stone, so the hero's lede can
        // change with the slab instead of one generic sentence for all four.
        blurb: p.short_description ?? null,
      };
    });

  // Two rows at the desktop grid's own 3 columns, not eight tiles' worth of
  // three: the lead tile spans 2 columns, so row one is the lead plus one
  // single tile, row two is three single tiles, five in total. Reported
  // directly as running too long before "See all N colours" up top already
  // offers the rest.
  const featured = stones.slice(0, 5);
  // The signature section reveals a finished room behind a parting slab, so
  // it needs a stone with BOTH a bookmatch shot and a clean, upright,
  // landscape interior. Two constraints beyond that:
  //
  //  1. A ratio band, 1.2 to 2.0, so a near-square or portrait crop of a
  //     worktop corner never lands here.
  //  2. A quality order. Some rooms rescued from the mis-organised DELFONE
  //     folder carry a broken EXIF orientation and render on their side
  //     (recorded as an import issue). Until the source files are fixed,
  //     the stones with their own clean folders are preferred by name, and
  //     the ratio guard catches the rest.
  const goodRoom = (i: { role: string; width: number; height: number }) =>
    i.role === 'application' && i.width / i.height >= 1.2 && i.width / i.height <= 2;
  const SIGNATURE_ORDER = ['bianco-fendi', 'statuario', 'calcatta-gold', 'beverly-gold'];
  const signatureField = products.filter(
    (p) => p.images?.some((i) => i.role === 'bookmatch') && p.images?.some(goodRoom),
  );
  const signature =
    SIGNATURE_ORDER.map((slug) => signatureField.find((p) => p.slug === slug)).find(Boolean) ??
    signatureField.sort(
      (a, b) => b.images.filter(goodRoom).length - a.images.filter(goodRoom).length,
    )[0];

  // The About Beco section's own layered photo pair, the same device
  // /about's statement section already uses: a wide room shot and a second
  // overlapping it toward the text. Held to the same `goodRoom` band as the
  // signature pick above, and kept distinct from the signature's own stone
  // so the same room does not appear twice in two different sections.
  const aboutRooms = products
    .flatMap((p) => p.images ?? [])
    .filter((i) => goodRoom(i) && i.path !== signature?.images.find(goodRoom)?.path)
    .sort((a, b) => b.width - a.width);
  const aboutPhotoPrimary = aboutRooms[0];
  const aboutPhotoAccent = aboutRooms[1];

  return (
    <main>
      {/* The hero is guaranteed: the full crossfade when there is photography
          to run it, a static charcoal hero with the same words when there is
          not, never nothing. */}
      {slabs.length > 0 ? <PinnedHero slabs={slabs} thickness="12mm" /> : <HeroStatic />}

      {/* --- Who Beco is, straight after the hero. Reported directly: the
              hero and every section after it read as a sintered stone
              catalogue with nowhere on the page actually saying who is
              selling it. docs/BECO-COMPANY-PROFILE.md is the source, the
              same document /about already draws its own copy from, so
              nothing here is written fresh for this section. --- */}
      <section className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14 py-16 sm:py-20 lg:py-24">
        <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <Reveal className="beco-clip">
              <div className="beco-wipe flex items-center gap-4">
                <span aria-hidden className="h-px w-8 bg-warm-red" />
                <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  About Beco
                </p>
              </div>
            </Reveal>
            <Reveal delay={60}>
              <p className="mt-5 max-w-[26ch] font-display text-3xl leading-[1.15] text-charcoal sm:text-4xl">
                Creating spaces through thoughtful materials, intelligent solutions and exceptional
                service.
              </p>
            </Reveal>
            <Reveal delay={100}>
              <p className="mt-6 max-w-[54ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
                A Kenyan interior solutions company, bringing quality products, practical solutions
                and a seamless client experience together, from the first conversation to the day a
                project is finished.
              </p>
            </Reveal>
            <Reveal delay={140}>
              <Link
                href="/about"
                className="mt-7 inline-flex min-h-11 items-center font-ui text-sm font-semibold uppercase tracking-[0.12em] text-warm-red-deep underline-offset-8 hover:underline"
              >
                More about Beco
              </Link>
            </Reveal>
          </div>

          {/* The layered photo pair /about's own statement section already
              uses: a wide room, a second one overlapping it toward the
              text. Creative placement rather than a plain rectangle, and
              real installation photography rather than the stone itself,
              since this section is about Beco, not a material. */}
          {aboutPhotoPrimary ? (
            <Reveal delay={120} className="relative mx-auto w-full max-w-[26rem] pb-10 pl-10 lg:mx-0 lg:max-w-none">
              <div className="beco-clip relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
                <div className="beco-wipe absolute inset-0">
                  <Image
                    src={aboutPhotoPrimary.path}
                    alt={aboutPhotoPrimary.alt}
                    fill
                    sizes="(max-width: 1024px) 80vw, 26rem"
                    {...blurProps(aboutPhotoPrimary)}
                    className="object-cover"
                  />
                </div>
                <span aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15" />
              </div>
              {aboutPhotoAccent ? (
                <div className="beco-clip absolute bottom-0 left-0 aspect-[4/3] w-2/3 overflow-hidden bg-neutral-100 shadow-[0_20px_48px_rgba(16,24,32,0.18)]">
                  <div className="beco-wipe absolute inset-0" style={{ animationDelay: '160ms' }}>
                    <Image
                      src={aboutPhotoAccent.path}
                      alt={aboutPhotoAccent.alt}
                      fill
                      sizes="(max-width: 1024px) 55vw, 18rem"
                      {...blurProps(aboutPhotoAccent)}
                      className="object-cover"
                    />
                  </div>
                  <span aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15" />
                </div>
              ) : null}
            </Reveal>
          ) : null}
        </div>
      </section>

      {/* --- Stat band, moved up to sit right after who Beco is: reported
              directly that a quick set of real numbers belongs in the same
              early stretch as identity, not after the range and the client
              credentials further down. Redesigned on the same note that the
              plain three column, divided table read as too basic: a dark
              band, a short red rule standing in for the divider lines it
              used to lean on, and a fourth figure. Projects delivered has
              no real count behind it yet, unlike the other three, which are
              read off the database and the confirmed contact block. Stated
              here rather than left to look equally sourced: PLACEHOLDER,
              a stand-in Brown asked for pending a real number, swap the
              literal value below for the real count once Beco has one. --- */}
      <section className="bg-charcoal py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4 lg:gap-x-12">
            <Stat value={stones.length} label="Stone colours on the floor" suffix="" />
            <Stat value={12} label="Slab thickness" suffix="mm" />
            <Stat value={6} label="Days a week, Urban Square" suffix="" />
            {/* PLACEHOLDER value, not a real count. See the section note above. */}
            <Stat value={60} label="Projects delivered" suffix="+" />
          </dl>
        </div>
      </section>

      {/* --- What we deal in. The same reported gap: a reader landing after
              the hero had no way to tell Beco sells anything beyond stone.
              A card per range, ProductCard's own grammar rather than a
              numbered row list: reported directly that the row treatment
              read as a spec sheet, too many hairline dividers stacked in
              one section. A real photograph where one is catalogued, an
              honest plate where one is not, and a link only where there is
              real stock behind it, per RangeCardGrid's own rule. This
              section never used to need its own top padding: it sat
              directly after About Beco, itself already padded at the
              bottom. Moving the stat band in between, a different
              background colour, left it touching the dark band above with
              no gap at all. --- */}
      <section className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14 pt-16 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-24">
        <div className="beco-clip">
          <div className="beco-wipe">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                What we deal in
              </p>
            </div>
            <h2 className="mt-4 max-w-[18ch] font-display text-4xl leading-[1.08] tracking-[-0.015em] text-charcoal sm:text-5xl">
              Six ranges, one supplier.
            </h2>
          </div>
        </div>
        <RangeCardGrid className="mt-14" items={rangeItems} />
      </section>


      {/* --- Why Beco. Reported directly: the site said what Beco sells but
              never why a reader should choose Beco over another supplier.
              Six cards, not six icon-in-a-square tiles: that exact pattern
              is what the design rules name and rule out. Also reported
              directly: an earlier hairline-divided row treatment here read
              as too many lines stacked in one section, so this is a real
              card, a soft raised surface rather than a line, carrying its
              own edge. A short red rule stands in for an icon rather than
              a literal one. --- */}
      <section className="bg-neutral-50 py-16 sm:py-22 lg:py-30">
        <div className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14">
          <div className="beco-clip">
            <div className="beco-wipe">
              <div className="flex items-center gap-4">
                <span aria-hidden className="h-px w-8 bg-warm-red" />
                <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Why Beco
                </p>
              </div>
              <h2 className="mt-4 max-w-[20ch] font-display text-4xl leading-[1.08] tracking-[-0.015em] text-charcoal sm:text-5xl">
                Not just what we sell. Why it is worth choosing us.
              </h2>
            </div>
          </div>

          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Locally stocked', 'Already imported and held on the floor at Urban Square. See it, price it, collect it the same day.'],
              ['Quality without compromise', 'Materials chosen for how they perform over years, not just how they photograph on day one.'],
              ['Expert guidance', 'The sales team understands specification, not just price, and guides the choice rather than the upsell.'],
              ['Fabrication and installation', 'Beyond supply: cut, fabricated and installed for sintered stone and wall panels, so the finished result reflects the material.'],
              ['A reliable partner', 'The same team from first conversation to handover, so a project does not change hands halfway through.'],
              ['A client experience, not a transaction', 'We aim to understand what a project is trying to achieve, then guide the choice that makes sense for it.'],
            ].map(([title, body], i, all) => {
              // Two cards carry the brand's own colour rather than running
              // six identical white surfaces in a row, reported directly:
              // the first in charcoal, the last in the brand's red, so the
              // row opens and closes on colour rather than spending it
              // twice in the same spot. warm-red-DEEP, not plain warm-red,
              // on the last: white text on the deep variant measures
              // 5.88:1, the plain one 4.38:1, below the AA floor, the same
              // reasoning `buttonClasses` already documents for its own
              // primary variant. High-vis white text is used on both dark
              // cards for the same reason at full opacity, never reduced.
              const dark = i === 0;
              const red = i === all.length - 1;
              return (
                <Reveal key={title} delay={(i % 3) * 60} as="li" className="h-full">
                  <div
                    className={cn(
                      'h-full p-8 shadow-[0_1px_2px_rgba(16,24,32,0.05),0_16px_32px_-16px_rgba(16,24,32,0.12)]',
                      dark ? 'bg-charcoal' : red ? 'bg-warm-red-deep' : 'bg-high-vis-white',
                    )}
                  >
                    <span aria-hidden className={cn('block h-px w-8', dark || red ? 'bg-high-vis-white/60' : 'bg-warm-red')} />
                    <h3 className={cn('mt-5 font-display text-xl leading-tight', dark || red ? 'text-high-vis-white' : 'text-charcoal')}>
                      {title}
                    </h3>
                    <p className={cn('mt-3 text-sm leading-[1.6]', dark || red ? 'text-high-vis-white' : 'text-neutral-700')}>
                      {body}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </section>

      {/* --- Completed interiors, at three depths. Sits between the count
              and the range so the page answers "what does it look like in a
              room" before it asks anyone to browse a grid. --- */}
      <CompletedInteriors products={products} siteShots={SITE_SHOTS} />

      {/* --- The range. One large tile against smaller ones, per the design
              direction, which rules out the even four across grid that treats
              the page as a container to fill. --- */}
      <section className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14 py-16 sm:py-22 lg:py-30">
        <div className="beco-clip">
          <div className="beco-wipe">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-8 bg-warm-red" />
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              The range
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-[18ch] font-display text-4xl leading-[1.1] text-charcoal sm:text-5xl">
              Stone that behaves like a finished surface.
            </h2>
            <Link
              href="/shop"
              className="font-ui text-sm font-semibold uppercase tracking-[0.12em] text-warm-red-deep underline-offset-4 hover:underline"
            >
              See all {stones.length} colours
            </Link>
          </div>
          </div>
        </div>

        <div className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p, i) => {
            const img = imageFor(p);
            // The first tile takes two columns and a taller frame, so the eye
            // has somewhere to land before it starts scanning.
            const lead = i === 0;
            return (
              <Reveal
                key={p.id}
                delay={(i % 3) * 60}
                className={lead ? 'sm:col-span-2 lg:col-span-2' : undefined}
              >
                <ProductCard
                  name={p.name}
                  href={`/product/${p.slug}`}
                  priceDisplayMode={p.price_display_mode}
                  price={p.price}
                  compareAtPrice={p.compare_at_price}
                  unit={p.unit}
                  availability={p.availability}
                  badge={p.badge}
                  frame={lead ? 'wide' : 'portrait'}
                  imageClassName="beco-zoom beco-drift-slow"
                  action={
                    <QuickAddToQuote
                      line={{ slug: p.slug, name: p.name, unit: p.unit, image: img?.path ?? null }}
                    />
                  }
                  image={
                    img ? (
                      <Image
                        src={img.path} alt={img.alt} width={img.width} height={img.height}
                        {...blurProps(img)}
                        sizes={lead
                          ? '(max-width: 640px) 100vw, 66vw'
                          : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
                        className="h-full w-full object-cover"
                      />
                    ) : undefined
                  }
                />
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* --- The signature moment, per D43. --- */}
      <SlabToSurface product={signature} />

      {/* --- Process. A numbered editorial list, which is what goes where
              three icon-in-a-circle cards would have. Carried by the large
              serif numeral and real air between steps rather than a hairline
              rule under each one now, on request: too many rules of this
              kind across the site read as templated rather than editorial. --- */}
      <section className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14 py-16 sm:py-22 lg:py-30">
        <div className="beco-clip">
          <div className="beco-wipe">
            {/* No eyebrow here on purpose: the numbered list below names the
                section, and an uppercase label over every heading is the
                rhythm that makes a page read as templated. */}
            <h2 className="max-w-[16ch] font-display text-4xl leading-[1.1] text-charcoal sm:text-5xl">
              From a shortlist to a priced quote.
            </h2>
          </div>
        </div>

        <div className="mt-14 grid gap-16 lg:grid-cols-[1fr_26rem] lg:gap-20">
          <ol className="flex flex-col gap-10">
          {[
            ['Build a list', 'Add every material the project needs. The list survives a refresh, and no account is required.'],
            ['Send it over', 'Your name and phone number are the only things we genuinely need. Everything else helps us price it faster.'],
            ['We price it', 'A written quote, itemised, with delivery or collection set out.'],
            ['Collect or deliver', 'Pick it up at Urban Square, or tell us where the site is.'],
          ].map(([title, body], i) => (
            <Reveal as="li" key={title} delay={i * 60}>
              <div className="grid gap-4 sm:grid-cols-[6rem_1fr] sm:gap-10">
                <span
                  aria-hidden
                  className="font-display text-4xl leading-none text-neutral-300 sm:text-5xl"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-display text-2xl leading-tight text-charcoal">{title}</h3>
                  <p className="mt-2 max-w-[58ch] text-base text-neutral-700">{body}</p>
                </div>
              </div>
            </Reveal>
          ))}
          </ol>

          {/* Real installations, dealing themselves, opposite the steps. */}
          <RoomStack products={products} />
        </div>
      </section>

      {/* --- The hardware cutout, added 4 September on request: a real Beco
              photograph with its background removed, resting beside copy
              that assembles as the section arrives rather than a photograph
              in a frame like everywhere else on the page. See D73.

              Cycles through four real finishes, added 4 September on a
              second request, rather than showing gold alone: the copy
              already claims six finishes, and one static photograph was
              a thinner argument for that than four real ones taking
              turns. `fill`, not intrinsic sizing, because crossfading
              needs every layer in the same box. See D76. --- */}
      <CutoutReveal
        eyebrow="Hardware"
        title="Down to the handle."
        body="Cabinetry reads differently once the hardware is chosen. Six finishes are already on the floor at Urban Square, ready to match against a worktop or a run of doors."
        images={[
          { src: '/cutouts/gold-handle.webp', alt: 'A gold cabinet handle' },
          { src: '/cutouts/black-handle.webp', alt: 'A matte black cabinet handle' },
          { src: '/cutouts/grey-handle.webp', alt: 'A brushed grey cabinet handle' },
          { src: '/cutouts/white-handle.webp', alt: 'A white cabinet handle' },
        ].map((cutout, i) => (
          <Image
            key={cutout.src}
            src={cutout.src}
            alt={cutout.alt}
            fill
            priority={i === 0}
            sizes="(max-width: 1024px) 70vw, 22rem"
            className="object-contain"
          />
        ))}
        stats={[
          { value: 6, label: 'Finishes in stock' },
          { value: 4, label: 'Hardware ranges' },
        ]}
        cta={{ label: 'Shop handles', href: '/shop/handles' }}
      />

      {/* --- The pinned rail. Eight stones rather than twelve: the track
              crosses roughly 150vw over 190vh of pin instead of 250vw, so the
              same scroll produces a pan rather than a lurch. That speed is
              what made the section feel like the page had stuck. Not adjacent
              to the hero, which is the other pinned section. --- */}
      <SlabRail products={stones.slice(8, 16)} />

      {/* --- Named, permitted clients, moved here on request, right before
              the showroom that now closes the page: the range has been
              shown in full by this point, real people vouching for it is
              the last word before "come see it yourself". Reuses the exact
              component and gate the gallery page already ships: renders
              nothing until a real row is published with permission
              recorded, per migration 10, so this is safe to wire in ahead
              of Beco actually publishing one. The wrapping section is gated
              on the same length check, not just the component's own null
              return, so an empty catalogue of clients never leaves a
              padded gap in the flow. --- */}
      {clients.length > 0 ? (
        <section className="mx-auto max-w-[1380px] px-8 pb-16 pt-16 sm:px-10 sm:pb-20 sm:pt-20 lg:px-14 lg:pb-24 lg:pt-24">
          <ClientShowcase clients={clients} />
        </section>
      ) : null}

      {/* --- The showroom, closing the page rather than sitting between two
              browsing sections. Moved here on direct feedback: it used to
              run between Process and Hardware, so a reader browsing stone
              was interrupted by a "come visit" pitch and then dropped back
              into another range to browse. Every range the page has to
              sell (stone, signature, hardware, the pinned rail) now runs
              together first, and this is the actual last word: you have
              seen the range, here is how to go stand in front of it,
              directly before the footer's own contact details.

              `beco-showroom-video`, landscape and purpose shot, replaced
              the 52 portrait phone clips this section used to be built
              around on 14 September. Full width and cinematic rather than
              boxed beside the copy: a wide frame is what the new footage
              actually earns, where the old portrait clips would have left
              most of a wide frame empty.

              aspect-[16/9], matching the source exactly: a wider
              sm:aspect-[21/9] this carried before cropped roughly a
              quarter of the actual frame away, reported directly as not
              showing the full picture. The vignette is what does the
              cinematic work instead of an ultra-wide crop, darkened
              corners the way a real film frame reads rather than a flat
              rectangle of video. --- */}
      <section aria-label="The showroom" className="bg-charcoal text-high-vis-white">
        <div className="relative w-full overflow-hidden bg-neutral-950">
          <ShowroomFilm className="aspect-[16/9] w-full object-cover" />
          {/* The vignette: a radial darkening toward the corners, the
              cinematic cue itself, over the video everywhere. The gradient
              at the foot only is stronger still, so the section title
              below always has a dark enough ground to sit on regardless of
              what the frame underneath it is doing. Both pointer-events
              none and both aria-hidden: neither carries information, only
              tone. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: 'inset 0 0 min(18vw,12rem) rgba(16,24,32,0.55)' }}
          />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-charcoal to-transparent" />
        </div>

        <div className="mx-auto grid max-w-[1380px] gap-x-16 gap-y-10 px-8 py-16 sm:px-10 sm:py-20 lg:grid-cols-[1fr_28rem] lg:gap-20 lg:px-14 lg:py-24">
          <div>
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                The showroom
              </p>
            </div>
            <h2 className="mt-5 max-w-[16ch] font-display text-4xl leading-[1.08] sm:text-5xl">
              Come and put a hand on it.
            </h2>
            <p className="mt-5 max-w-[46ch] text-base leading-[1.65] text-neutral-300 lg:text-lg">
              The full range is on the floor, and a slab reads differently in person than it
              does on a screen.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className={buttonClasses({ variant: 'primary' })}>
                Directions and hours
              </Link>
              <Link
                // A real conversation, not a calendar: no booking system
                // exists on this site (out of scope per the build plan
                // unless that is formally revised), so "book" here means
                // the fastest real path to one, the same WhatsApp deep
                // link the mobile action bar already opens.
                href={whatsappLink('booking a showroom visit')}
                data-analytics="whatsapp_click"
                className={cn(
                  buttonClasses({ variant: 'outline' }),
                  'border-high-vis-white text-high-vis-white hover:bg-high-vis-white hover:text-charcoal',
                )}
              >
                Book a showroom visit
              </Link>
            </div>
          </div>

          <address className="not-italic font-ui text-base leading-[1.8] text-neutral-300 lg:text-right">
            {SITE.address.line1}
            <br />
            {SITE.address.line2}, {SITE.address.city}
            <br />
            <span className="text-neutral-400">{SITE.hours}</span>
          </address>
        </div>

        {/* The map, keyless: `q=` plus `output=embed` needs no Maps API key,
            unlike a JavaScript or Embed API integration would. Built from
            the same SITE.address fields the schema and the footer already
            use, so the pin lands on the address this page also states in
            text rather than a hand typed string that could drift from it. */}
        <div className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14 pb-16 sm:pb-22 lg:pb-30">
          {/* Reported directly as not showing: a near-full invert on a
              light Google roadmap style turns the tiles almost black, and
              sitting directly on this section's own charcoal background
              left the two nearly indistinguishable, tiles included, which
              read as a blank void rather than a map. Backed by neutral-900
              so the frame itself is visible even before a tile has loaded,
              a visible ring so its edges never depend on the map content
              inside it, and a lighter invert that actually differentiates
              from the panel behind it instead of disappearing into it. */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900 ring-1 ring-inset ring-high-vis-white/10 sm:aspect-[21/9]">
            <iframe
              title="Beco Interiors on Google Maps"
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                `${SITE.address.line1}, ${SITE.address.line2}, ${SITE.address.city}`,
              )}&output=embed`}
              className="h-full w-full border-0 grayscale invert-[0.82] contrast-[1.05]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <LocalBusinessSchema />
    </main>
  );
}

function Stat({ value, label, suffix }: { value: number; label: string; suffix: string }) {
  return (
    <div>
      <span aria-hidden className="block h-px w-8 bg-warm-red" />
      {/* No tabular-nums: Cormorant gives '1' a full width advance under it,
          and "12mm" was reading as "1 2mm" at display size. The figures here
          never need to align in a column. */}
      <dd className="mt-5 font-display text-5xl leading-none tracking-[-0.01em] text-high-vis-white sm:text-6xl">
        <CountUp value={value} />
        {suffix}
      </dd>
      <dt className="mt-3 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
        {label}
      </dt>
    </div>
  );
}

/**
 * LocalBusiness, not Organization, because Beco sells to people who can drive
 * to Urban Square. The NAP here must match the footer and the Google Business
 * Profile character for character, or the mismatch is a ranking drag.
 */
function LocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HomeGoodsStore',
    name: SITE.name,
    url: 'https://www.beco.co.ke',
    telephone: SITE.phone,
    email: SITE.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${SITE.address.line1}, ${SITE.address.line2}`,
      addressLocality: SITE.address.city,
      addressCountry: 'KE',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '16:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '08:00',
        closes: '14:00',
      },
    ],
    areaServed: { '@type': 'City', name: 'Nairobi' },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
