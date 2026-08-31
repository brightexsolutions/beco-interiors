import sharp from 'sharp';
import { imageConfig, SIZE_BUDGETS } from './config';

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
  width: number;
  format: string;
  body: Buffer;
  bytes: number;
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

export const processImage = async (source: Buffer): Promise<ProcessedImage> => {
  const image = sharp(source, SHARP_OPTS);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const derivatives: Derivative[] = [];
  const warnings: string[] = [];

  for (const target of imageConfig.widths) {
    // Never upscale. A 400px source stays 400px rather than being blown up.
    const w = Math.min(target, width || target);
    for (const format of imageConfig.formats) {
      const pipeline = sharp(source, SHARP_OPTS)
        .rotate()                       // honour EXIF orientation
        .resize({ width: w, withoutEnlargement: true });
      // Stone veining is high entropy detail and compresses badly, so a flat
      // quality produced a 1600px slab at 805KB against a 150KB budget.
      // Quality falls as width rises, which is where the bytes actually are.
      const q = qualityForWidth(w);
      const body =
        format === 'avif'
          ? await pipeline.avif({ quality: q, effort: 4 }).toBuffer()
          : await pipeline.webp({ quality: q, effort: 5 }).toBuffer();
      derivatives.push({ width: w, format, body, bytes: body.byteLength });
    }
  }

  const card = derivatives.find((d) => d.width === Math.min(...imageConfig.widths));
  if (card && card.bytes > SIZE_BUDGETS.cardBytes) {
    warnings.push(
      `card image is ${(card.bytes / 1024).toFixed(0)}KB, over the ` +
        `${SIZE_BUDGETS.cardBytes / 1024}KB budget`,
    );
  }
  const hero = derivatives.find((d) => d.width === Math.max(...imageConfig.widths));
  if (hero && hero.bytes > SIZE_BUDGETS.heroBytes) {
    warnings.push(
      `hero image is ${(hero.bytes / 1024).toFixed(0)}KB, over the ` +
        `${SIZE_BUDGETS.heroBytes / 1024}KB budget`,
    );
  }

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
