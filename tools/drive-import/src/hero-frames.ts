import sharp from 'sharp';

/**
 * Cuts one room photograph into the two frames `CinematicHero` serves, D120:
 * a 16:9 frame for desktop and a 3:4 frame for phones, each a WebP under the
 * 150KB hero budget in CLAUDE.md.
 *
 * Lives beside the Drive importer because that is where Sharp already is,
 * not because these are products. The frames are committed under
 * `apps/storefront/public/hero/rooms/` and named in `HERO_ROOMS`, whose own
 * test stats every file against the same budget.
 */
export const HERO_FRAMES = {
  wide: { width: 1600, height: 900 },
  tall: { width: 900, height: 1200 },
} as const;

export type HeroFrameName = keyof typeof HERO_FRAMES;

export const HERO_FRAME_BUDGET = 150 * 1024;

/** Below this a room photograph starts to band in its shadows. */
const QUALITY_FLOOR = 50;

/**
 * Where the crop keeps its weight. `attention` lets Sharp find the busiest
 * region, which is usually the material; a gravity such as `west` pins it
 * when the counter or wall sits to one side of a wide source.
 */
export type HeroCropPosition = 'attention' | 'entropy' | 'centre' | 'north' | 'south' | 'east' | 'west';

export interface HeroFrame {
  body: Buffer;
  bytes: number;
  quality: number;
}

const positionFor = (p: HeroCropPosition) =>
  p === 'attention' ? sharp.strategy.attention : p === 'entropy' ? sharp.strategy.entropy : p;

/**
 * Steps quality down from 80 in fives, floor included, until the frame
 * fits. Throws rather than ship one over budget, because the hero is the
 * LCP image and a heavy one costs every first visit. The crop is held as a
 * lossless PNG between attempts so each encode starts from clean pixels.
 */
export const cutHeroFrame = async (
  source: Buffer,
  frame: HeroFrameName,
  position: HeroCropPosition = 'attention',
  budget: number = HERO_FRAME_BUDGET,
): Promise<HeroFrame> => {
  const { width, height } = HERO_FRAMES[frame];
  const cropped = await sharp(source, { failOn: 'none' })
    .rotate()
    .resize({ width, height, fit: 'cover', position: positionFor(position) })
    .png({ compressionLevel: 0 })
    .toBuffer();

  for (let quality = 80; quality >= QUALITY_FLOOR; quality -= 5) {
    const body = await sharp(cropped).webp({ quality, effort: 6 }).toBuffer();
    if (body.byteLength <= budget) return { body, bytes: body.byteLength, quality };
  }
  throw new Error(`The ${frame} frame does not fit ${budget} bytes even at quality ${QUALITY_FLOOR}`);
};

/**
 * Turns the source argument into something to read. `pexels:4800189` is the
 * shorthand for a Pexels photo id, fetched at 3000px wide so both frames
 * crop from far more pixels than they keep. Anything starting with http is
 * fetched as given, and anything else is a local file path.
 */
export const resolveHeroSource = (arg: string): { kind: 'url' | 'file'; location: string } => {
  const pexels = /^pexels:(\d+)$/.exec(arg);
  if (pexels) {
    const id = pexels[1];
    return { kind: 'url', location: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?w=3000` };
  }
  if (/^https?:\/\//.test(arg)) return { kind: 'url', location: arg };
  return { kind: 'file', location: arg };
};

/** Room slugs become file names in `public/`, so they are held to kebab-case. */
export const isHeroSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
