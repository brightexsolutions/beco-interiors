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

/**
 * Size budgets, enforced rather than hoped for.
 *
 * MEASURED, not assumed. The plan carried two numbers, a 60KB card and a
 * 150KB hero, written before anyone had encoded real sintered stone. Against
 * the actual catalogue the 1600px rendition lands between 318KB and 641KB at
 * the quality floor, because a 44MB scan of heavily veined stone at 150KB and
 * 1600px is roughly 0.06 bits per pixel and simply bands.
 *
 * So the budget is set by what each rendition is FOR, which is what the plan
 * meant by "hero" in the first place:
 *
 *  - 400px  is the product card. 60KB, and every stone now meets it.
 *  - 800px  is the LCP element on a phone, which is where the plan's LCP
 *           budget is measured. 150KB, the original hero number, unchanged.
 *  - 1600px is desktop retina and gallery detail. It is never the LCP element
 *           on the measured device, and everything but the first is lazy
 *           loaded, so it gets a budget of its own rather than an unmeetable
 *           one that would be permanently in breach and therefore ignored.
 *
 * See docs/DECISIONS.md D46.
 */
export const SIZE_BUDGETS = {
  /** A product card image. */
  cardBytes: 60 * 1024,
  /** The LCP rendition on a phone, which is the device the budget is measured on. */
  heroBytes: 150 * 1024,
  /** Desktop retina and gallery detail. Never the measured LCP element. */
  detailBytes: 450 * 1024,
} as const;

/**
 * The byte budget a given rendition has to come in under.
 *
 * Weight is driven by ENTROPY, not by width, and stone veining varies
 * enormously: at a flat quality, Beverly Gold came out at 72KB and Bvlgari at
 * 613KB from the same settings and the same target width. So the encoder is
 * told what it may spend and finds the quality that fits, rather than being
 * given a quality and hoping.
 */
export const budgetForWidth = (w: number): number => {
  const widths = [...imageConfig.widths].sort((a, b) => a - b);
  const smallest = widths[0] ?? 400;
  const largest = widths[widths.length - 1] ?? 1600;
  if (w <= smallest) return SIZE_BUDGETS.cardBytes;
  if (w >= largest) return SIZE_BUDGETS.detailBytes;
  return SIZE_BUDGETS.heroBytes;
};

export const QUALITY_FLOOR = 45;
