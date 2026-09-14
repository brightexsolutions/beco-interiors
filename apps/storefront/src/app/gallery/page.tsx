import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { buttonClasses, HoverGallery } from '@beco/ui';
import { AmbientVideoSection } from '@/components/ambient-video-section';
import { ClientShowcase } from '@/components/client-showcase';
import { PageHeader } from '@/components/page-header';
import { getGalleryShots, projectTypeFacets, blurProps } from '@/lib/products';
import { getPublishedClients } from '@/lib/clients';
import type { ProjectType } from '@beco/types';

export const revalidate = 3600;

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<Search> },
): Promise<Metadata> {
  const params = await searchParams;
  const filtered = Boolean(one(params.type));

  return {
    title: 'Project gallery',
    description:
      'Real interiors finished with Beco materials in Nairobi. Sintered stone worktops, feature walls, vanities and flooring, photographed on site.',
    // D29 again: a type filtered view canonicalises to /gallery and carries
    // noindex, the same reasoning as the shop's facets.
    alternates: { canonical: '/gallery' },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * The project gallery.
 *
 * Every photograph is a real installation. That matters commercially as well
 * as ethically: the nearest competitor's equivalent rooms are AI generated, so
 * real Kenyan projects are a positioning advantage rather than a box to tick.
 *
 * Shots are interleaved across products by `getGalleryShots`, so no single
 * stone dominates the first screen. Delfone alone has ten photographs.
 *
 * The rhythm is a repeating four step grid rather than an even four across,
 * and each frame drifts at one of three depths, so a long page of rooms has
 * some structure to it instead of being a contact sheet.
 *
 * MOTION, dialled up here on request: the gallery gets a stronger entrance
 * than the site's default reveal, because it is the one page whose entire
 * content is photographs and a plain fade underplays them.
 *
 * Each item ASSEMBLES rather than appearing. The frame and its hairline edge
 * are drawn first and stay put, the photograph wipes up into that frame from
 * behind its own bottom edge, and the caption plate rises out from under it a
 * beat later. It is the same physical language as the rail cards, which is
 * why it does not read as a new effect bolted onto this page.
 *
 * The wipe sits on a WRAPPER, not on the image. The image already carries the
 * depth parallax, and two animations on one element's transform fight rather
 * than compose, so the entrance and the drift are deliberately kept on
 * separate elements.
 *
 * All of it lives inside `prefers-reduced-motion: no-preference` in motion.css,
 * including `.beco-clip`, so a reduced-motion reader gets the finished grid
 * with nothing hidden and nothing clipped.
 *
 * Opens on the showroom film, full bleed and full height, before any
 * photograph. A page whose whole point is "here is what a finished room
 * looks like" earns a moving opening more than a static one does, and it is
 * the one page on the site with nowhere better for that section to live.
 */
const SPAN = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7'] as const;
const FRAME = ['aspect-[4/3]', 'aspect-[3/4]', 'aspect-[4/5]', 'aspect-[16/10]'] as const;
const DEPTH = ['beco-depth-1', 'beco-depth-3', 'beco-depth-2', 'beco-depth-1'] as const;

export default async function GalleryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const type = one(params.type) as ProjectType | '';

  const [allShots, clients] = await Promise.all([getGalleryShots(), getPublishedClients()]);
  // Gated on real data existing at all, the same rule the facet helper's own
  // tests enforce: at launch nothing is classified yet, so this renders
  // nothing rather than a control that filters to an empty grid. Beco has
  // not yet said which real photo is which, see docs/milestones/M4-HANDOVER.md.
  const facets = projectTypeFacets(allShots);
  const shots = type ? allShots.filter((shot) => shot.projectType === type) : allShots;

  // One tile per real installation, not one per photograph of it. Every
  // application shot of a product produced its own entry here, each
  // carrying the SAME set of siblings starting from a different frame, so a
  // product with ten real photographs, Delfone once had exactly that,
  // produced ten near-duplicate tiles of the same room rather than ten
  // distinct projects. Reported directly as reading like "images rendered"
  // rather than a set of finished work. Kept at whichever photo the
  // interleave placed first for a product, then sorted so the most fully
  // documented installations, several real angles rather than one lucky
  // shot, lead the grid: the strongest proof of craft this data actually has
  // without inventing a residential or commercial split nothing has
  // classified yet.
  const seenProduct = new Set<string>();
  const projects = shots
    .filter((shot) => {
      if (seenProduct.has(shot.productSlug)) return false;
      seenProduct.add(shot.productSlug);
      return true;
    })
    .sort((a, b) => b.siblings.length - a.siblings.length);

  return (
    <main>
      {/* No eyebrow: the original, "Filmed in the showroom", was true when
          this section played Beco's own footage and became a false claim of
          location the moment D69 put licensed stock behind it instead.
          Removed rather than replaced with something vaguer that dances
          around the same lie. */}
      <AmbientVideoSection
        title="What a finished room looks like."
        cta={{ label: 'Visit the showroom', href: '/contact' }}
      />

      {/* pt smaller than pb, deliberately: the video section right above
          already closes on its own caption, padded to its own bottom edge,
          so the full py-16..24 rhythm every other section opens on stacked
          a second helping of empty space on top of that and read as a gap
          rather than a considered break between sections. */}
      <div className="mx-auto max-w-[1380px] px-6 sm:px-8 lg:px-12 pb-16 pt-10 sm:pb-20 sm:pt-12 lg:pb-24 lg:pt-14">
        <PageHeader
          className="mb-16"
          eyebrow="Project gallery"
          title="Finished, and in use."
          aside={
            allShots.length > 0 ? (
              <p className="font-ui text-sm text-neutral-500">
                {projects.length} real {projects.length === 1 ? 'installation' : 'installations'}
              </p>
            ) : undefined
          }
          lede="Real interiors in Nairobi, photographed on site. A slab tells you the veining. A room tells you whether it works."
        />

        {facets.length > 0 ? (
          <div className="mb-10 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by project type">
            <Link
              href="/gallery"
              className={`rounded-full border px-4 py-2 font-ui text-sm font-medium transition-colors ${
                type === '' ? 'border-charcoal bg-charcoal text-white' : 'border-neutral-300 text-neutral-700 hover:border-charcoal'
              }`}
              aria-current={type === '' ? 'true' : undefined}
            >
              All projects
            </Link>
            {facets.map((facet) => (
              <Link
                key={facet.value}
                href={`/gallery?type=${facet.value}`}
                className={`rounded-full border px-4 py-2 font-ui text-sm font-medium transition-colors ${
                  type === facet.value
                    ? 'border-charcoal bg-charcoal text-white'
                    : 'border-neutral-300 text-neutral-700 hover:border-charcoal'
                }`}
                aria-current={type === facet.value ? 'true' : undefined}
              >
                {facet.label}
                <span className={type === facet.value ? 'ml-2 text-neutral-300' : 'ml-2 text-neutral-400'}>
                  {facet.count}
                </span>
              </Link>
            ))}
          </div>
        ) : null}

        {allShots.length === 0 ? (
          <p className="max-w-[52ch] text-base text-neutral-700">
            We are photographing our installations now. In the meantime the showroom has the full
            range on the floor.
          </p>
        ) : shots.length === 0 ? (
          <p className="max-w-[52ch] text-base text-neutral-700">
            No {type} projects photographed yet. <Link href="/gallery" className="underline underline-offset-2">See every project</Link> instead.
          </p>
        ) : (
          <div className="grid gap-x-8 gap-y-12 lg:grid-cols-12 lg:gap-x-10">
            {projects.map((shot, i) => (
              <div key={shot.productSlug} className={SPAN[i % SPAN.length]}>
                <Link href={`/product/${shot.productSlug}`} className="group block">
                  {/* The frame is drawn first and never moves, so nothing here
                    can shift layout. beco-clip is what the wipe rises from
                    behind. */}
                  <div
                    className={`beco-clip relative w-full bg-neutral-100 ${FRAME[i % FRAME.length]}`}
                  >
                    <div
                      className={`beco-wipe absolute inset-0 ${DEPTH[i % DEPTH.length]}`}
                      // Staggered across the row, so a pair arriving together
                      // assembles one after the other rather than in lockstep.
                      style={{ animationDelay: `${(i % 2) * 110}ms` }}
                    >
                      {shot.siblings.length > 1 ? (
                        // Other real photographs of this SAME installation,
                        // cycled on hover, this one shown first so nothing
                        // jumps the moment the pointer arrives. Never a
                        // different product's photograph: the point is more
                        // of what you are already looking at.
                        <HoverGallery
                          className="absolute inset-0"
                          frames={shot.siblings.map((sibling) => (
                            <Image
                              key={sibling.path}
                              src={sibling.path}
                              alt={sibling.alt}
                              fill
                              sizes="(max-width: 1024px) 100vw, 55vw"
                              {...blurProps(sibling)}
                              className="object-cover"
                            />
                          ))}
                        />
                      ) : (
                        <Image
                          src={shot.path}
                          alt={shot.alt}
                          fill
                          sizes="(max-width: 1024px) 100vw, 55vw"
                          {...blurProps(shot)}
                          className="object-cover"
                        />
                      )}
                    </div>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                    />
                  </div>
                  <p className="beco-plate mt-4 font-ui text-sm font-semibold uppercase tracking-[0.14em] text-charcoal">
                    {shot.productName}
                    <span
                      aria-hidden
                      className="ml-3 inline-block h-px w-0 bg-warm-red align-middle transition-all duration-500 ease-brand group-hover:w-8"
                    />
                    {shot.siblings.length > 1 ? (
                      <span className="ml-3 font-normal normal-case tracking-normal text-neutral-500">
                        hover for more
                      </span>
                    ) : null}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        )}

        <ClientShowcase clients={clients} />

        <div className="mt-20 border-t border-neutral-200 pt-12">
          <p className="max-w-[26ch] font-display text-3xl leading-[1.12] text-charcoal sm:text-4xl">
            Bring us the drawing. We will price it.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
              Request a quote
            </Link>
            <Link href="/contact" className={buttonClasses({ variant: 'outline' })}>
              Visit the showroom
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
