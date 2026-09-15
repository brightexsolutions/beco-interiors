import sharp from 'sharp';
import { budgetForWidth, imageConfig, QUALITY_FLOOR } from './config';

/**
 * Shared Sharp options.
 *
 * `failOn: 'none'` because supplier files are occasionally slightly malformed
 * and a truncated marker should not abort a whole run.
 *
 * `limitInputPixels` is raised from Sharp's 268MP default, which rejected a
 * real slab scan in this catalogue. Raised rather than disabled: the guard
 * exists to stop a decompression bomb, and 2 gigapixels is far above any
 * legitimate photograph while still being a bound.
 */
const SHARP_OPTS = { failOn: 'none', limitInputPixels: 2_000_000_000 } as const;

/**
 * Derivatives, generated ONCE at import. Never per request.
 *
 * Sources reach 44MB. Getting one to a sub 60KB card image is the single
 * biggest performance lever in the build, which is why the budgets below are
 * checked rather than hoped for.
 */
export interface Derivative {
  /** The CANONICAL width this derivative answers for, used in its filename. */
  width: number;
  /** What the image actually is. Smaller when the source could not fill it. */
  actualWidth: number;
  format: string;
  body: Buffer;
  bytes: number;
  /** What it took to fit the budget. Recorded so a drop in quality is visible. */
  quality: number;
}

export interface ProcessedImage {
  /** Intrinsic dimensions, so nothing reflows while loading. */
  width: number;
  height: number;
  /** Tiny inline placeholder. */
  blurDataUrl: string;
  derivatives: Derivative[];
  warnings: string[];
}

/**
 * Larger renditions carry more pixels, so they can afford lower quality per
 * pixel and still look better than a smaller one. Measured against the real
 * catalogue rather than guessed.
 */
const qualityForWidth = (w: number): number => {
  if (w >= 1600) return 62;
  if (w >= 1200) return 68;
  if (w >= 800) return 72;
  return 76;
};

/**
 * Encodes down to a byte budget rather than to a fixed quality.
 *
 * Starts at the quality a rendition of this width deserves and steps down
 * only as far as it must, so an easy image keeps its quality and a heavily
 * veined one pays for its detail. Stops at QUALITY_FLOOR whether or not the
 * budget was met, and says so, because silently shipping a banded slab is
 * worse than shipping a heavy one.
 *
 * This costs a handful of extra encodes per image, which is affordable
 * precisely because it happens once at import and never per request.
 */
const encodeWithinBudget = async (
  source: Buffer,
  targetWidth: number,
  format: 'webp' | 'avif',
  budget: number,
): Promise<{ body: Buffer; quality: number; withinBudget: boolean }> => {
  let last: { body: Buffer; quality: number } | null = null;

  // Steps of 6 down to the floor, and the floor itself is always tried:
  // stepping 62, 56, 50 and stopping leaves quality 45 never attempted, so
  // the floor would be a number in the config that nothing ever reached.
  const ladder: number[] = [];
  for (let q = qualityForWidth(targetWidth); q > QUALITY_FLOOR; q -= 6) ladder.push(q);
  ladder.push(QUALITY_FLOOR);

  for (const q of ladder) {
    const pipeline = sharp(source, SHARP_OPTS)
      .rotate()
      .resize({ width: targetWidth, withoutEnlargement: true });
    const body =
      format === 'avif'
        ? await pipeline.avif({ quality: q, effort: 4 }).toBuffer()
        : await pipeline.webp({ quality: q, effort: 5 }).toBuffer();
    last = { body, quality: q };
    if (body.byteLength <= budget) return { ...last, withinBudget: true };
  }

  // Never null: the loop always runs at least once, because every starting
  // quality is above the floor.
  return { ...last!, withinBudget: false };
};

export const processImage = async (source: Buffer): Promise<ProcessedImage> => {
  const image = sharp(source, SHARP_OPTS);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const derivatives: Derivative[] = [];
  const warnings: string[] = [];

  for (const target of imageConfig.widths) {
    // Never upscale: a narrow source stays its own size rather than being
    // blown up. But the FILENAME still uses the canonical target width, or a
    // loader asking for -1600.webp gets a 404 whenever a source happened to
    // be narrower. Six of 113 real images hit exactly that.
    const w = Math.min(target, width || target);
    const budget = budgetForWidth(target);
    for (const format of imageConfig.formats) {
      const { body, quality, withinBudget } = await encodeWithinBudget(source, w, format, budget);
      if (!withinBudget) {
        warnings.push(
          `${target}px ${format} is ${(body.byteLength / 1024).toFixed(0)}KB at quality ` +
            `${quality}, over its ${(budget / 1024).toFixed(0)}KB budget even at the quality ` +
            'floor. The source is unusually detailed. Worth a look before launch.',
        );
      }
      derivatives.push({
        width: target,        // canonical, for the key
        actualWidth: w,       // truthful, for the srcset descriptor
        format,
        body,
        bytes: body.byteLength,
        quality,
      });
    }
  }

  // A source too small to fill the largest requested width will look soft on
  // a product page, so it is worth saying rather than silently upscaling.
  const largest = Math.max(...imageConfig.widths);
  if (width && width < largest) {
    warnings.push(
      `source is only ${width}px wide, below the ${largest}px target, so the largest ` +
        'rendition is upscaled by the browser and will look soft. Worth reshooting.',
    );
  }

  // The per rendition check above already reports anything that could not be
  // brought under budget, and reports it with the quality it took to try. A
  // second pass here would say the same thing twice in the run report.

  const blur = await sharp(source, SHARP_OPTS)
    .rotate()
    .resize({ width: imageConfig.blurWidth })
    .webp({ quality: 40 })
    .toBuffer();

  return {
    width,
    height,
    blurDataUrl: `data:image/webp;base64,${blur.toString('base64')}`,
    derivatives,
    warnings,
  };
};
