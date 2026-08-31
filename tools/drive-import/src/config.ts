/**
 * Import pipeline configuration.
 *
 * Derivative formats and widths are configurable rather than hardcoded,
 * because the tradeoff is a real one and may change.
 *
 * DEFAULT: WebP only, three widths. AVIF gains roughly 20 percent over WebP
 * but encodes markedly slower, and with sources reaching 44MB that dominates
 * import time. WebP support is universal. See docs/REVIEW.md 3.3.
 *
 * Set IMAGE_FORMATS=webp,avif and IMAGE_WIDTHS=400,800,1200,1600 to restore
 * the fuller set once import time is a background job rather than a critical
 * path.
 */
export interface ImageConfig {
  formats: ReadonlyArray<'webp' | 'avif'>;
  widths: readonly number[];
  quality: number;
  /** Tiny inline placeholder so nothing reflows while an image loads. */
  blurWidth: number;
}

const parseFormats = (v: string | undefined): ImageConfig['formats'] =>
  (v ?? 'webp').split(',').map((s) => s.trim()).filter((s): s is 'webp' | 'avif' =>
    s === 'webp' || s === 'avif',
  );

const parseWidths = (v: string | undefined): number[] =>
  (v ?? '400,800,1600').split(',').map((s) => Number(s.trim())).filter((n) => n > 0);

export const imageConfig: ImageConfig = {
  formats: parseFormats(process.env.IMAGE_FORMATS),
  widths: parseWidths(process.env.IMAGE_WIDTHS),
  quality: Number(process.env.IMAGE_QUALITY ?? 78),
  blurWidth: 20,
};

/** Size budgets from docs/PLAN.md, enforced rather than hoped for. */
export const SIZE_BUDGETS = {
  /** A product card image. */
  cardBytes: 60 * 1024,
  /** A hero or full width image. */
  heroBytes: 150 * 1024,
} as const;
