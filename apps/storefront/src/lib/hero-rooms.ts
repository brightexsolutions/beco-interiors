/**
 * The home hero's rooms, D120: finished work, not product shots. Each is one
 * of our own installations from `SITE_SHOTS`, cut twice from the same source
 * photograph so the frame fits the screen rather than the screen cropping a
 * portrait photo blind: a 16:9 band for desktop and a 3:4 frame for phones.
 *
 * Static on purpose, the D92 reasoning: the first thing anyone sees cannot
 * depend on a catalogue that `pnpm db:reset` empties. Each room names the
 * material we supplied in it and the range that material comes from; the
 * home page links the caption to that range only while it has stock.
 *
 * The crops live in `public/hero/rooms/`, cut with sharp from
 * `public/site-photos/` at WebP q72 (desktop) and q70 (phone). Every file is
 * held under the 150KB hero image budget, and a test checks that on disk.
 * To add a room: cut both frames the same way, add a row, and keep the order
 * so no two rooms of the same kind sit next to each other.
 */
export interface HeroRoomFrame {
  path: string;
  width: number;
  height: number;
}

export interface HeroRoom {
  slug: string;
  /** The room, as a reader would name it. */
  room: string;
  /** What we supplied in it, in a few words. */
  material: string;
  /** The range that material comes from, a `RANGE_GROUPS` slug. */
  rangeSlug: string;
  alt: string;
  wide: HeroRoomFrame;
  tall: HeroRoomFrame;
}

const frames = (slug: string) => ({
  wide: { path: `/hero/rooms/${slug}-wide.webp`, width: 1600, height: 900 },
  tall: { path: `/hero/rooms/${slug}-tall.webp`, width: 900, height: 1200 },
});

export const HERO_ROOMS: readonly HeroRoom[] = [
  {
    slug: 'kitchen',
    room: 'Kitchen',
    material: 'Sintered stone island, fluted face',
    rangeSlug: 'sintered-stone',
    alt: 'A stone kitchen island with a fluted panel face, set in a wide open plan kitchen',
    ...frames('kitchen'),
  },
  {
    slug: 'bathroom',
    room: 'Bathroom',
    material: 'Veined stone double vanity',
    rangeSlug: 'sintered-stone',
    alt: 'A double vanity counter in veined stone, with two vessel basins under backlit mirrors',
    ...frames('bathroom'),
  },
  {
    slug: 'living-room',
    room: 'Living room',
    material: 'Fluted timber wall panels',
    rangeSlug: 'wall-panels',
    alt: 'A living room feature wall in fluted timber panel, with a floating console beneath',
    ...frames('living-room'),
  },
  {
    slug: 'reception',
    room: 'Reception',
    material: 'Curved stone reception desk',
    rangeSlug: 'sintered-stone',
    alt: 'A curved stone reception desk in an office lobby',
    ...frames('reception'),
  },
  {
    slug: 'bar',
    room: 'Bar',
    material: 'Travertine look stone counter',
    rangeSlug: 'sintered-stone',
    alt: 'An L shaped bar counter in travertine look stone',
    ...frames('bar'),
  },
];
