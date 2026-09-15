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
  /** Corners agree AND the subject stands apart from them. Cutouts need this. */
  uniformBackground: boolean;
  /** How far the centre differs from the backdrop. Near zero means no subject. */
  subjectContrast: number;
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

  // Sample the four corners against the centre. A clean backdrop means the
  // corners agree with each other AND differ from the middle, which is what
  // makes background removal quick rather than manual. See D33.
  //
  // CAREFUL: `sharp().stats()` reads the INPUT image and silently ignores a
  // preceding `.extract()`. The crop must be materialised with `.toBuffer()`
  // first, or every region returns identical numbers and the check quietly
  // measures nothing. This cost an hour to find.
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  let uniformBackground = false;
  let subjectContrast = 0;

  if (w > 200 && h > 200) {
    const box = Math.max(48, Math.floor(Math.min(w, h) * 0.08));
    const mean = async (left: number, top: number) => {
      const crop = await sharp(source, opts)
        .extract({ left, top, width: box, height: box })
        .toBuffer();
      const s = await sharp(crop).stats();
      return s.channels.reduce((a, c) => a + c.mean, 0) / s.channels.length;
    };
    const [tl, tr, bl, br, centre] = await Promise.all([
      mean(0, 0),
      mean(w - box, 0),
      mean(0, h - box),
      mean(w - box, h - box),
      mean(Math.floor((w - box) / 2), Math.floor((h - box) / 2)),
    ]);
    const corners = [tl, tr, bl, br];
    const cornerSpread = Math.max(...corners) - Math.min(...corners);
    const backdrop = corners.reduce((a, v) => a + v, 0) / 4;
    subjectContrast = Math.abs(backdrop - centre);
    // Corners agree with each other, and the subject stands apart from them.
    uniformBackground = cornerSpread < 20 && subjectContrast > 20;
  }

  return {
    entropy: stats.entropy,
    lightness,
    averageHex: hex(r, g, b),
    dominantHex: hex(stats.dominant.r, stats.dominant.g, stats.dominant.b),
    uniformBackground,
    subjectContrast,
    warnings,
  };
};
