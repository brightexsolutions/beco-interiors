import sharp from 'sharp';

/**
 * Automated image quality checks.
 *
 * Nobody reviews 125 photographs by eye and catches a blank one. This found a
 * real defect on the first run: Pure White's slab shot is effectively a blank
 * white rectangle, 3KB where a normal slab is 260KB, entropy 0.09 where the
 * rest sit near 5. Its application shots are fine, so it is that one file.
 *
 * These are cheap, since Sharp already decodes every image anyway.
 */

export interface Quality {
  /** Shannon entropy. Low means flat, featureless, probably blank or blown out. */
  entropy: number;
  /** 0 to 100. Tracks the product name usefully: Precious Black reads 28. */
  lightness: number;
  /** Average colour, for a swatch or a colour filter. */
  averageHex: string;
  dominantHex: string;
  /** Corner variance. Low means a clean backdrop, which cutouts need. See D33. */
  uniformBackground: boolean;
  warnings: string[];
}

const hex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/**
 * Below this an image is flat enough to be blank, blown out, or a solid fill.
 * Real stone photography sits near 5. Pure White's slab measured 0.09.
 */
const MIN_ENTROPY = 1.5;

export const assessQuality = async (source: Buffer, label: string): Promise<Quality> => {
  const opts = { failOn: 'none', limitInputPixels: 2_000_000_000 } as const;
  const img = sharp(source, opts);
  const [stats, meta] = await Promise.all([img.stats(), img.metadata()]);
  const [r, g, b] = stats.channels.map((c) => c.mean) as [number, number, number];
  const lightness = ((r + g + b) / 3 / 255) * 100;
  const warnings: string[] = [];

  if (stats.entropy < MIN_ENTROPY) {
    warnings.push(
      `${label}: almost no detail (entropy ${stats.entropy.toFixed(2)}, normal is around 5). ` +
        'The image is likely blank, blown out, or a solid fill. It will look broken on a ' +
        'product card and needs reshooting.',
    );
  }
  if (lightness > 98) {
    warnings.push(`${label}: almost pure white (${lightness.toFixed(0)}% lightness). Overexposed?`);
  }
  if (lightness < 4) {
    warnings.push(`${label}: almost pure black (${lightness.toFixed(0)}% lightness). Underexposed?`);
  }

  // Sample the four corners. A clean backdrop varies little across them, which
  // is what makes background removal quick rather than manual.
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  let uniformBackground = false;
  if (w > 60 && h > 60) {
    const patch = async (left: number, top: number) =>
      (await sharp(source, opts).extract({ left, top, width: 24, height: 24 }).stats())
        .channels.map((c) => c.mean);
    const corners = (await Promise.all([
      patch(0, 0), patch(w - 24, 0), patch(0, h - 24), patch(w - 24, h - 24),
    ])).flat();
    uniformBackground = Math.max(...corners) - Math.min(...corners) < 25;
  }

  return {
    entropy: stats.entropy,
    lightness,
    averageHex: hex(r, g, b),
    dominantHex: hex(stats.dominant.r, stats.dominant.g, stats.dominant.b),
    uniformBackground,
    warnings,
  };
};
