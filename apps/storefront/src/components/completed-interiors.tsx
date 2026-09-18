import Image from 'next/image';
import Link from 'next/link';
import { HoverGallery } from '@beco/ui';
// No Reveal import: this section's cards assemble via beco-wipe/beco-plate, the
// same physical language as the gallery, rather than the site's default fade.
import { blurProps, type CatalogueProduct } from '@/lib/products';
import type { ProductImage } from '@beco/types';

/**
 * Completed interiors, at three depths.
 *
 * The one section on the page built entirely from rooms rather than from
 * material, and the answer to the question a specifier is actually asking:
 * what does this look like once it is in.
 *
 * The effect is parallax at depth, per D31, and this is the section that
 * earns it. Five photographs in an offset grid, each drifting at one of three
 * rates, so the group reads as sitting at three distances rather than on one
 * flat plane. The frames never move and only the images inside them do, so
 * none of it costs layout.
 *
 * Each card ASSEMBLES on entry, the same physical language as the gallery
 * rather than the site's default fade and rise: the frame is drawn first and
 * stays put, the photograph wipes up into it from behind its own bottom edge,
 * and the caption rises out from under it a beat later. This section used to
 * lean on `Reveal` alone, which reads as basic beside the gallery's wipe and
 * the hero's orbit, for a section whose whole job is proving the range looks
 * considered once it is installed.
 *
 * Every room here is a real Beco installation. The competitor's equivalent
 * rooms are AI generated, which makes real projects the more valuable asset
 * and the reason to give them a section of their own.
 */
// Only what this card actually reads off an image: a site shot has no real
// `ProductImage` row behind it (role, sort, and the rest of the catalogue
// columns), only a path and the display fields next/image needs.
type ShotImage = Pick<ProductImage, 'path' | 'alt' | 'width' | 'height'> & { blur?: string };
type Shot = {
  /** Every real photograph of this same room, first shown, the rest
      reachable by hovering on a device that can, the same rule a product
      card's own photographs already follow. Almost always length 1: most
      rooms in `SITE_SHOTS` still have only one real photograph. */
  images: ShotImage[];
  name: string;
  href: string | null;
};

/**
 * A real, delivered project photograph, captioned by room or application
 * rather than by the stone in it: "Kitchen", not "Cyprus Light Grey". This
 * is what separates this section from a specimen shot of the same stone.
 *
 * There were exactly two of these at first, `SANDSTONE BEIGE, KAREN VANITY`
 * and `CYPRUS GREY, KAREN KITCHEN` from the SITE PHOTOS folder in Drive: the
 * only two files in it that named both a stone and a room rather than
 * arriving as a bare camera filename. Reported directly, twice, as still
 * showing stone names instead of rooms; that was the fix, using the real
 * photographs that actually existed rather than inventing a caption for one
 * that did not. The rest of the folder's roughly 75 bare camera filenames
 * were later reviewed by eye, room by room, for the ones genuinely worth
 * publishing; see the full account in `SITE_SHOTS`, `site.ts`.
 * `productSlug`, when the stone in the shot is catalogued, links the card
 * through to it the same way a product-derived shot already does; left
 * unset, the card still names the room honestly, just unlinked. See
 * `LAYOUT` below: this section only ever shows four cards, one per distinct
 * room, so `siteShots` is grouped by `room` and capped to `LAYOUT.length`
 * distinct rooms before it reaches the grid. A room with more than one real
 * photograph, several of these now do, becomes one card that cycles through
 * all of them rather than one card per photograph, the same distinction the
 * gallery page's own room section draws.
 */
export interface SiteShot {
  image: { path: string; alt: string; width: number; height: number; blur?: string };
  room: string;
  productSlug?: string;
}

/** Frame, span and depth for each position in the offset grid. */
const LAYOUT = [
  { span: 'lg:col-span-7', frame: 'aspect-[4/3]', depth: 'beco-depth-1', offset: '' },
  { span: 'lg:col-span-5', frame: 'aspect-[3/4]', depth: 'beco-depth-3', offset: 'lg:mt-20' },
  { span: 'lg:col-span-4', frame: 'aspect-[3/4]', depth: 'beco-depth-2', offset: 'lg:-mt-8' },
  { span: 'lg:col-span-8', frame: 'aspect-[16/10]', depth: 'beco-depth-1', offset: 'lg:mt-16' },
] as const;

export function CompletedInteriors({
  products,
  siteShots = [],
  eyebrow = 'Completed interiors',
  heading = 'Once it is in, it stops being a sample.',
  body = 'Real projects, photographed on site. A slab tells you the veining. A room tells you '
    + 'whether it works.',
}: {
  products: CatalogueProduct[];
  /** Real, room-captioned photographs, filled first. See `SiteShot`'s own
      note on why there are only two of these today. */
  siteShots?: SiteShot[];
  /** Overridable so a second call site, About, can carry its own line rather
      than repeating Home's word for word. */
  eyebrow?: string;
  heading?: string;
  body?: string;
}) {
  // Real, room-captioned photographs first, grouped by room so a room with
  // several real photographs becomes one card that cycles through all of
  // them rather than one card per photograph, then one application shot per
  // remaining product so the section still shows different stones rather
  // than repeating one room. Capped at LAYOUT.length distinct rooms: this
  // section only ever fills the four fixed grid slots below.
  const byRoom = new Map<string, typeof siteShots>();
  for (const s of siteShots) {
    const existing = byRoom.get(s.room);
    if (existing) existing.push(s); else byRoom.set(s.room, [s]);
  }
  const shots: Shot[] = [...byRoom.entries()].slice(0, LAYOUT.length).map(([room, group]) => ({
    images: group.map((g) => g.image),
    name: room,
    href: (() => {
      const linked = group.find((g) => g.productSlug);
      return linked ? `/product/${linked.productSlug}` : null;
    })(),
  }));
  for (const product of products) {
    if (shots.length === LAYOUT.length) break;
    const room = product.images?.find((i) => i.role === 'application');
    if (room) shots.push({ images: [room], name: product.name, href: `/product/${product.slug}` });
  }
  if (shots.length < 2) return null;

  return (
    <section className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14 py-16 sm:py-22 lg:py-30">
      <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-6">
        <div className="beco-clip">
          <div className="beco-wipe">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                {eyebrow}
              </p>
            </div>
            <h2 className="mt-4 max-w-[15ch] font-display text-4xl leading-[1.06] tracking-[-0.015em] text-charcoal sm:text-5xl">
              {heading}
            </h2>
          </div>
        </div>
        <p className="max-w-[42ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
          {body}
        </p>
      </div>

      <div className="mt-16 grid gap-x-8 gap-y-12 lg:grid-cols-12 lg:gap-x-10">
        {shots.map((shot, i) => {
          const { span, frame, depth, offset } = LAYOUT[i]!;
          const frameEl = (
            <>
              {/* The frame is drawn first and never moves, so nothing here
                  can shift layout. beco-clip is what the wipe rises from
                  behind, and the depth class stays on this same element so
                  the parallax still reads the photograph as a direct
                  descendant. */}
              <div
                className={`beco-clip relative w-full overflow-hidden bg-neutral-100 ${frame}`}
              >
                <div
                  className={`beco-wipe absolute inset-0 ${depth}`}
                  // Staggered by column rather than by index, so a wide
                  // card and the narrower one beside it settle a beat apart
                  // instead of in lockstep.
                  style={{ animationDelay: `${(i % 2) * 130}ms` }}
                >
                  {shot.images.length > 1 ? (
                    <HoverGallery
                      className="absolute inset-0"
                      frames={shot.images.map((img) => (
                        <Image
                          key={img.path}
                          src={img.path}
                          alt={img.alt}
                          fill
                          sizes="(max-width: 1024px) 100vw, 55vw"
                          {...blurProps(img)}
                          className="object-cover"
                        />
                      ))}
                    />
                  ) : (
                    <Image
                      src={shot.images[0]!.path}
                      alt={shot.images[0]!.alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 55vw"
                      {...blurProps(shot.images[0]!)}
                      className="object-cover"
                    />
                  )}
                </div>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                />
              </div>
              <div className="beco-plate mt-4 flex items-baseline justify-between gap-4">
                <p className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-charcoal">
                  {shot.name}
                  {shot.images.length > 1 ? (
                    <span className="ml-3 font-normal normal-case tracking-normal text-neutral-500">
                      hover for more
                    </span>
                  ) : null}
                  {shot.href ? (
                    <span
                      aria-hidden
                      className="ml-3 inline-block h-px w-0 align-middle bg-warm-red transition-all duration-500 ease-brand group-hover:w-8"
                    />
                  ) : null}
                </p>
                <p className="shrink-0 font-ui text-sm text-neutral-500">
                  {String(i + 1).padStart(2, '0')}
                </p>
              </div>
            </>
          );
          return (
            <div key={`${shot.name}-${i}`} className={`${span} ${offset}`}>
              {shot.href ? (
                <Link href={shot.href} className="group block">
                  {frameEl}
                </Link>
              ) : (
                // A real room shot with no catalogued stone behind it yet:
                // named honestly, not linked to a product page that does
                // not exist for it.
                <div>{frameEl}</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
