/**
 * The six ranges Beco actually deals in, per docs/BECO-COMPANY-PROFILE.md
 * ("What we do"): sintered stone, wall panels, kitchen accessories, cabinet
 * handles, SPC flooring and furniture accessories. Grouped here the same way
 * migration 19 groups the taxonomy, kitchen and furniture accessories both
 * landing under the editorial "Accessories" group alongside office fittings.
 *
 * Moved out of the home page, D92, so the cinematic hero and the "What we
 * deal in" section read from one list rather than two that could drift.
 *
 * `href` is resolved per group against real product counts where this is
 * used, not written here, so a range that is still empty is never linked
 * from a high traffic page.
 */
export const RANGE_GROUPS = [
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

export interface RangeHeroImage {
  path: string;
  alt: string;
  width: number;
  height: number;
}

/**
 * One hero-worthy photograph per range, per D92. Hardcoded rather than
 * pulled from `products` at request time on Brown's explicit instruction:
 * the home hero used to draw on `imageForGroup` against the live catalogue,
 * and `pnpm db:reset` leaves that catalogue with no images at all until
 * `pnpm drive:import` runs again, twenty minutes nobody does by reflex.
 * Checked live against this machine's own local database while this was
 * being written: every sintered stone product currently has zero images for
 * exactly that reason. A hero this important cannot depend on that.
 *
 * Files live in `apps/storefront/public/hero/`, committed to git, the same
 * pattern `SITE_SHOTS`, `SHOWROOM_FILM` and `GALLERY_FILM` in `./site.ts`
 * already use for design-critical imagery that is not itself a product
 * record.
 *
 * Sintered stone and wall panels reuse Beco's own real photography, already
 * committed as `SITE_SHOTS` entries. Lighting, SPC flooring, hardware and
 * accessories have no static Beco room shot yet, so each is a real, checked
 * Pexels photograph, Pexels License (free for commercial use, no
 * attribution legally required, credited here anyway for traceability),
 * downloaded from a verified photo page rather than a guessed URL. Replace
 * any of these four the moment Beco has real room photography for that
 * range: nothing else on the site depends on these constants beyond
 * `HERO_RANGE_IMAGES` itself.
 */
export const HERO_RANGE_IMAGES: Record<string, RangeHeroImage> = {
  // Swapped from `karen-kitchen-cyprus-grey.webp` on direct feedback against
  // the running hero, live: the Cyprus Grey shot read as a flatter, more
  // ordinary counter than the lead, LCP slide deserves. This one carries
  // warm under-cabinet lighting and a glossier, more directional stone
  // surface, both real Beco photography from the same `SITE_SHOTS` set.
  'sintered-stone': {
    path: '/site-photos/kitchen-fluted-island.webp',
    alt: 'A stone kitchen island with a fluted panel face, set in a wide open plan kitchen',
    width: 1600, height: 2133,
  },
  'wall-panels': {
    path: '/site-photos/living-room-slat-wall.webp',
    alt: 'A living room feature wall in fluted timber panel, with a floating console beneath',
    width: 1600, height: 2133,
  },
  // Source: Pexels, "Modern ceiling lamp with Edison bulbs" by Alexander
  // Popadin (pexels.com/@irrabagon), photo id 37164339. Downloaded from
  // pexels.com/photo/modern-ceiling-lamp-with-edison-bulbs-focused-37164339/.
  lighting: {
    path: '/hero/lighting-pexels-irrabagon.webp',
    alt: 'A sculptural modern ceiling fitting with exposed filament bulbs',
    width: 1067, height: 1600,
  },
  // Source: Pexels, "Modern open-concept living room and kitchen" by Curtis
  // Adams (pexels.com/@curtis-adams-1694007), photo id 36906952. Downloaded
  // from pexels.com/photo/modern-open-concept-living-room-and-kitchen-36906952/.
  flooring: {
    path: '/hero/flooring-pexels-curtis-adams.webp',
    alt: 'A wide plank wood look floor running through an open plan living and kitchen space',
    width: 1600, height: 1067,
  },
  // Source: Pexels, "Modern black cabinet handles in kitchen" by Alla
  // Nadtochii (pexels.com/@alla-nadtochii-631992140), photo id 39443630.
  // Downloaded from
  // pexels.com/photo/close-up-of-modern-black-cabinet-handles-in-kitchen-39443630/.
  hardware: {
    path: '/hero/hardware-pexels-alla-nadtochii.webp',
    alt: 'Matte black bar handles on white kitchen cabinetry',
    width: 1205, height: 1600,
  },
  // Source: Pexels, "Empty walk-in closet" by Max Vakhtbovych
  // (pexels.com/@artbovich), photo id 7587738. Downloaded from
  // pexels.com/photo/an-empty-walk-in-closet-7587738/.
  accessories: {
    path: '/hero/accessories-pexels-artbovich.webp',
    alt: 'A bright, minimalist walk-in storage system with open shelving',
    width: 1600, height: 1068,
  },
};
