import sharp from 'sharp';

const WIDTHS = [400, 800, 1600] as const;
const QUALITY_FLOOR = 45;
const SHARP_OPTS = { failOn: 'none' as const, limitInputPixels: 2_000_000_000 };

export const PRODUCT_IMAGE_WIDTHS = WIDTHS;

const qualityForWidth = (width: number): number => {
  if (width >= 1600) return 62;
  if (width >= 800) return 72;
  return 76;
};

const budgetForWidth = (width: number): number => {
  if (width <= 400) return 60 * 1024;
  if (width >= 1600) return 450 * 1024;
  return 150 * 1024;
};

export interface ProcessedProductPhoto {
  width: number;
  height: number;
  blurDataUrl: string;
  derivatives: { width: number; body: Buffer }[];
}

const encodeWebp = async (source: Buffer, targetWidth: number, budget: number): Promise<Buffer> => {
  let last: Buffer | null = null;
  const ladder: number[] = [];
  for (let q = qualityForWidth(targetWidth); q > QUALITY_FLOOR; q -= 6) ladder.push(q);
  ladder.push(QUALITY_FLOOR);
  for (const quality of ladder) {
    last = await sharp(source, SHARP_OPTS)
      .rotate()
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer();
    if (last.byteLength <= budget) return last;
  }
  return last!;
};

export async function processProductPhoto(source: Buffer): Promise<ProcessedProductPhoto> {
  try {
    const meta = await sharp(source, SHARP_OPTS).rotate().metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) {
      throw new Error('That file is not a photograph we can read.');
    }

    const derivatives: { width: number; body: Buffer }[] = [];
    for (const target of WIDTHS) {
      const actual = Math.min(target, width);
      const body = await encodeWebp(source, actual, budgetForWidth(target));
      derivatives.push({ width: target, body });
    }

    const blur = await sharp(source, SHARP_OPTS).rotate().resize({ width: 20 }).webp({ quality: 40 }).toBuffer();
    return {
      width,
      height,
      blurDataUrl: `data:image/webp;base64,${blur.toString('base64')}`,
      derivatives,
    };
  } catch (error) {
    if (error instanceof Error && /not a photograph/i.test(error.message)) throw error;
    throw new Error('That file is not a photograph we can read.');
  }
}
