import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { orientedSize, processImage } from '../images';

/**
 * A phone photograph is usually stored landscape with an EXIF flag saying
 * "turn me a quarter". The derivatives are rotated upright, so the recorded
 * dimensions have to be too, or a portrait room shot ships with a landscape
 * box and renders sideways in a ratio-guarded frame.
 */
const jpeg = (width: number, height: number, orientation?: number) => {
  const base = sharp({ create: { width, height, channels: 3, background: { r: 120, g: 110, b: 100 } } }).jpeg();
  return (orientation ? base.withMetadata({ orientation }) : base).toBuffer();
};

describe('orientedSize', () => {
  it('keeps stored dimensions for upright and half-turn orientations', () => {
    for (const orientation of [undefined, 1, 2, 3, 4]) {
      expect(orientedSize({ width: 60, height: 20, orientation })).toEqual({ width: 60, height: 20 });
    }
  });

  it('swaps them for every quarter-turn orientation, 5 to 8', () => {
    for (const orientation of [5, 6, 7, 8]) {
      expect(orientedSize({ width: 60, height: 20, orientation })).toEqual({ width: 20, height: 60 });
    }
  });

  it('reads missing dimensions as zero rather than NaN', () => {
    expect(orientedSize({})).toEqual({ width: 0, height: 0 });
  });
});

describe('processImage', () => {
  it('records a rotated phone photograph as portrait, matching its derivatives', async () => {
    const result = await processImage(await jpeg(60, 20, 6));
    expect(result.width).toBe(20);
    expect(result.height).toBe(60);
    const first = result.derivatives[0]!;
    const meta = await sharp(first.body).metadata();
    expect(meta.height! > meta.width!).toBe(true);
  });

  it('leaves an unflagged landscape image landscape', async () => {
    const result = await processImage(await jpeg(60, 20));
    expect(result).toMatchObject({ width: 60, height: 20 });
  });
});
