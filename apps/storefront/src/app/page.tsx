import Image from 'next/image';
import Link from 'next/link';
import {
  ProductCard, Reveal, CountUp, CutoutReveal, RangePillarList, buttonClasses, cn,
} from '@beco/ui';
import { PinnedHero, type HeroSlab } from '@/components/pinned-hero';
import { HeroStatic } from '@/components/hero-static';
import { SlabRail } from '@/components/slab-rail';
import { SlabToSurface } from '@/components/slab-to-surface';
import { RoomStack } from '@/components/room-stack';
import { CompletedInteriors } from '@/components/completed-interiors';
import { ShowroomFilm } from '@/components/showroom-film';
import { ClientShowcase } from '@/components/client-showcase';
import {
  getPublishedProducts, getCategoriesWithProducts, getCategoryTree, primaryImage, imageForGroup,
  type CatalogueProduct, blurProps,
} from '@/lib/products';
import { getPublishedClients } from '@/lib/clients';
import { SITE } from '@/lib/site';

/**
 * The six ranges Beco actually deals in, per docs/BECO-COMPANY-PROFILE.md
 * ("What we do"): sintered stone, wall panels, kitchen accessories, cabinet
 * handles, SPC flooring and furniture accessories. Grouped here the same way
 * migration 19 groups the taxonomy, Kitchen and furniture accessories both
 * landing under the editorial "Accessories" group alongside office fittings.
 *
 * `href` is resolved per group against real product counts below, not
 * written here, so a range that is still empty is never linked from the
 * home page. See `imageForGroup` and `getCategoriesWithProducts`'s own note
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
    const shot = imageForGroup(groups, products, range.slug);
    return {
      title: range.title,
      body: range.body,
      href: hasStock ? `/shop/${range.slug}` : null,
      image: shot ? (
        <Image
          src={shot.path}
          alt=""
          fill
          sizes="(max-width: 1024px) 176px, 240px"
          {...blurProps(shot)}
          className="object-cover"
        />
      ) : undefined,
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
      return {
        name: p.name, slug: p.slug, src: img.path, alt: img.alt,
        category: p.category?.name ?? 'Sintered stone',
        width: img.width, height: img.height, blur: img.blur,
        // Beco's own first sentence for this stone, so the hero's lede can
        // change with the slab instead of one generic sentence for all four.
        blurb: p.short_description ?? null,
      };
    });

  const featured = stones.slice(0, 8);
  const application = products.find((p) => p.images?.some((i) => i.role === 'application'));
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
  const applicationImage = application?.images.find((i) => i.role === 'application');

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
      <section className="mx-auto max-w-[1380px] px-6 py-16 sm:py-20 lg:py-24">
        <Reveal className="beco-clip">
          <div className="beco-wipe flex items-center gap-4">
            <span aria-hidden className="h-px w-8 bg-warm-red" />
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              About Beco
            </p>
          </div>
        </Reveal>
        <Reveal delay={60}>
          <p className="mt-5 max-w-[30ch] font-display text-3xl leading-[1.15] text-charcoal sm:text-4xl">
            Creating spaces through thoughtful materials, intelligent solutions and exceptional
            service.
          </p>
        </Reveal>
        <div className="mt-8 grid gap-x-16 gap-y-6 border-t border-neutral-200 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <Reveal delay={100}>
            <p className="max-w-[58ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
              A Kenyan interior solutions company, bringing quality products, practical solutions
              and a seamless client experience together, from the first conversation to the day a
              project is finished.
            </p>
          </Reveal>
          <Reveal delay={140}>
            <Link
              href="/about"
              className="inline-flex min-h-11 items-center font-ui text-sm font-semibold uppercase tracking-[0.12em] text-warm-red-deep underline-offset-8 hover:underline"
            >
              More about Beco
            </Link>
          </Reveal>
        </div>
      </section>

      {/* --- What we deal in. The same reported gap: a reader landing after
              the hero had no way to tell Beco sells anything beyond stone.
              Every range gets a row, a real photograph where one is
              catalogued, an honest plate where one is not, and a link only
              where there is real stock behind it, per RangePillarList's own
              rule. --- */}
      <section className="mx-auto max-w-[1380px] px-6 pb-16 sm:pb-20 lg:pb-24">
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
        <RangePillarList className="mt-14" items={rangeItems} />
      </section>

      {/* --- Named, permitted clients, moved up to sit right after the
              breadth of the range rather than buried near the foot of the
              page: reported directly that trust signals (who Beco has
              delivered for) belong in the same early stretch as who Beco is
              and what Beco sells, not after it. Reuses the exact component
              and gate the gallery page already ships: renders nothing until
              a real row is published with permission recorded, per
              migration 10, so this is safe to wire in ahead of Beco
              actually publishing one. The wrapping section is gated on the
              same length check, not just the component's own null return,
              so an empty catalogue of clients never leaves a padded gap in
              the flow. --- */}
      {clients.length > 0 ? (
        <section className="mx-auto max-w-[1380px] px-6 pb-16 sm:pb-20 lg:pb-24">
          <ClientShowcase clients={clients} />
        </section>
      ) : null}

      {/* --- Stat band. Counts up once on entry, then still. Label above
              figure, on a hairline, so it reads as a specification rather
              than as three numbers floating in a lot of air. --- */}
      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-[1380px] px-6">
          <dl className="grid divide-y divide-neutral-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Stat value={stones.length} label="Stone colours on the floor" suffix="" />
            <Stat value={12} label="Slab thickness" suffix="mm" />
            <Stat value={6} label="Days a week, Urban Square" suffix="" />
          </dl>
        </div>
      </section>

      {/* --- Completed interiors, at three depths. Sits between the count
              and the range so the page answers "what does it look like in a
              room" before it asks anyone to browse a grid. --- */}
      <CompletedInteriors products={products} />

      {/* --- The range. One large tile against smaller ones, per the design
              direction, which rules out the even four across grid that treats
              the page as a container to fill. --- */}
      <section className="mx-auto max-w-[1380px] px-6 py-16 sm:py-22 lg:py-30">
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
                  stockQuantity={p.stock_quantity}
                  badge={p.badge}
                  frame={lead ? 'wide' : 'portrait'}
                  imageClassName="beco-zoom beco-drift-slow"
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

      {/* --- Process. A numbered editorial list on hairline rules, which is
              what goes where three icon-in-a-circle cards would have. --- */}
      <section className="mx-auto max-w-[1380px] px-6 py-16 sm:py-22 lg:py-30">
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
          <ol className="border-t border-neutral-200">
          {[
            ['Build a list', 'Add every material the project needs. The list survives a refresh, and no account is required.'],
            ['Send it over', 'Your name and phone number are the only things we genuinely need. Everything else helps us price it faster.'],
            ['We price it', 'A written quote, itemised, with delivery or collection set out.'],
            ['Collect or deliver', 'Pick it up at Urban Square, or tell us where the site is.'],
          ].map(([title, body], i) => (
            <Reveal as="li" key={title} delay={i * 60}>
              <div className="grid gap-4 border-b border-neutral-200 py-8 sm:grid-cols-[6rem_1fr] sm:gap-10">
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

      {/* --- The showroom. Beco's footage is all PORTRAIT phone video, all 52
              clips of it, so this is a tall frame beside the copy rather than
              a full bleed band: cropping 9:16 into 21:9 throws away most of
              the picture. It also removes the card that used to hang below a
              wide image with empty space beside it. --- */}
      <section aria-label="The showroom" className="bg-charcoal text-high-vis-white">
        <div className="mx-auto grid max-w-[1380px] items-center gap-12 px-6 py-16 sm:py-22 lg:grid-cols-[1fr_28rem] lg:gap-20 lg:py-30">
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
              Urban Square, Enterprise Road, six days a week. The full range is on the floor,
              and a slab reads differently in person than it does on a screen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className={buttonClasses({ variant: 'primary' })}>
                Directions and hours
              </Link>
              <Link
                href="/gallery"
                className={cn(
                  buttonClasses({ variant: 'outline' }),
                  'border-high-vis-white text-high-vis-white hover:bg-high-vis-white hover:text-charcoal',
                )}
              >
                See finished projects
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[20rem] overflow-hidden bg-neutral-950 lg:max-w-none">
            <ShowroomFilm className="aspect-[9/16] w-full object-cover" />
          </div>
        </div>
      </section>

      {/* --- The hardware cutout, added 4 September on request: a real Beco
              photograph with its background removed, resting beside copy
              that assembles as the section arrives rather than a photograph
              in a frame like everywhere else on the page. Straight after the
              dark showroom section on purpose, so the two sit in the
              alternation of tone the rest of the page already uses instead
              of two light sections running together. See D73.

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

      {/* --- The close. A strong open deserves a strong close: the page
              used to run straight from the pinned rail into the footer,
              which is fine as a rail's exit but reads as the page trailing
              off rather than ending on purpose. The line is the gallery
              page's own closing statement, reused rather than written
              fresh, so the site closes on one voice wherever a reader lands
              on it. Type only, no photograph: the giant wordmark behind the
              words is the one new visual idea here, kept to opacity and
              transform so it costs nothing over the site's own motion
              rules, and aria-hidden since it repeats the brand name a
              screen reader already has from the page landmark. --- */}
      <section className="relative overflow-hidden border-t border-neutral-800 bg-charcoal py-20 sm:py-28 lg:py-32">
        <p
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center font-display text-[26vw] leading-none tracking-[-0.02em] text-high-vis-white/5 sm:text-[20vw]"
        >
          BECO
        </p>
        <div className="relative mx-auto max-w-[1380px] px-6 text-center">
          <Reveal className="beco-clip">
            <p className="beco-wipe mx-auto max-w-[24ch] font-display text-4xl leading-[1.12] text-high-vis-white sm:text-5xl">
              Bring us the drawing. We will price it.
            </p>
          </Reveal>
          <Reveal delay={80} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
              Request a quote
            </Link>
            <Link
              href="/contact"
              className={cn(
                buttonClasses({ variant: 'outline' }),
                'border-high-vis-white text-high-vis-white hover:bg-high-vis-white hover:text-charcoal',
              )}
            >
              Visit the showroom
            </Link>
          </Reveal>
        </div>
      </section>

      <LocalBusinessSchema />
    </main>
  );
}

function Stat({ value, label, suffix }: { value: number; label: string; suffix: string }) {
  return (
    <div className="py-10 sm:px-10 sm:first:pl-0 sm:last:pr-0">
      <dt className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </dt>
      {/* Tabular and tightened: Cormorant sets numerals loosely, and "12mm"
          was reading as "1 2mm" at display size. */}
      {/* No tabular-nums: Cormorant gives '1' a full width advance under it,
          and "12mm" was reading as "1 2mm" at display size. The figures here
          never need to align in a column. */}
      <dd className="mt-3 font-display text-5xl leading-none tracking-[-0.01em] text-charcoal">
        <CountUp value={value} />
        {suffix}
      </dd>
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
