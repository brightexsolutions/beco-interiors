import Image from 'next/image';
import Link from 'next/link';
import { ProductCard, Reveal, CountUp, CutoutReveal, buttonClasses } from '@beco/ui';
import { PinnedHero, type HeroSlab } from '@/components/pinned-hero';
import { SlabRail } from '@/components/slab-rail';
import { SlabToSurface } from '@/components/slab-to-surface';
import { RoomStack } from '@/components/room-stack';
import { CompletedInteriors } from '@/components/completed-interiors';
import { ShowroomFilm } from '@/components/showroom-film';
import {
  getPublishedProducts, getCategoriesWithProducts, primaryImage,
  type CatalogueProduct, blurProps,
} from '@/lib/products';
import { SITE } from '@/lib/site';

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
  const [products, categories] = await Promise.all([
    getPublishedProducts(),
    getCategoriesWithProducts(),
  ]);

  // Four slabs for the hero, taken from products that actually have a slab
  // shot, so the hero can never fall back to a photograph of a stand.
  const slabs: HeroSlab[] = products
    .filter((p) => p.images?.some((i) => i.role === 'slab'))
    .slice(0, 4)
    .map((p) => {
      const img = p.images.find((i) => i.role === 'slab')!;
      return {
        name: p.name, slug: p.slug, src: img.path, alt: img.alt,
        category: p.category?.name ?? 'Sintered stone',
        width: img.width, height: img.height, blur: img.blur,
        // Beco's own first sentence for this stone, so the hero's lede can
        // change with the slab instead of one generic sentence for all four.
        blurb: p.short_description ?? null,
      };
    });

  const featured = products.slice(0, 8);
  const application = products.find((p) => p.images?.some((i) => i.role === 'application'));
  // The signature section needs BOTH roles. Seven stones have a bookmatch
  // shot today; the one with the most room photography leads.
  const signature = products
    .filter((p) => p.images?.some((i) => i.role === 'bookmatch')
                && p.images?.some((i) => i.role === 'application'))
    .sort((a, b) =>
      b.images.filter((i) => i.role === 'application').length -
      a.images.filter((i) => i.role === 'application').length)[0];
  const applicationImage = application?.images.find((i) => i.role === 'application');

  return (
    <main>
      {slabs.length > 0 ? <PinnedHero slabs={slabs} thickness="12mm" /> : null}

      {/* --- Stat band. Counts up once on entry, then still. Label above
              figure, on a hairline, so it reads as a specification rather
              than as three numbers floating in a lot of air. --- */}
      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-[1380px] px-6">
          <dl className="grid divide-y divide-neutral-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Stat value={products.length} label="Colours on the floor today" suffix="" />
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
              See all {products.length} colours
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
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                How it works
              </p>
            </div>
            <h2 className="mt-4 max-w-[16ch] font-display text-4xl leading-[1.1] text-charcoal sm:text-5xl">
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
              <Link href="/gallery" className={buttonClasses({ variant: 'outline' })}>
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
      <SlabRail products={products.slice(8, 16)} />

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
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '08:00',
        closes: '18:00',
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
