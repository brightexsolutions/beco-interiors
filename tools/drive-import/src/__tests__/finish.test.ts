import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { finishOfPixel, readFinish, rgbToLab } from '../finish';

/**
 * Synthetic photographs: a backdrop with blocks of colour on it, so each
 * case states exactly what the subject is and what it should read as.
 */
const photo = async (
  backdrop: string,
  blocks: Array<{ colour: string; left: number; top: number; width: number; height: number }>,
) =>
  sharp({ create: { width: 400, height: 400, channels: 3, background: backdrop } })
    .composite(
      await Promise.all(
        blocks.map(async (b) => ({
          input: await sharp({ create: { width: b.width, height: b.height, channels: 3, background: b.colour } }).png().toBuffer(),
          left: b.left,
          top: b.top,
        })),
      ),
    )
    .jpeg({ quality: 92 })
    .toBuffer();

const centred = (backdrop: string, colour: string) => photo(backdrop, [{ colour, left: 100, top: 100, width: 200, height: 200 }]);

describe('rgbToLab', () => {
  it('puts white at L 100 and black at L 0, both neutral', () => {
    const white = rgbToLab(255, 255, 255);
    const black = rgbToLab(0, 0, 0);
    expect(white[0]).toBeCloseTo(100, 0);
    expect(black[0]).toBeCloseTo(0, 0);
    for (const v of [white[1], white[2], black[1], black[2]]) expect(Math.abs(v)).toBeLessThan(0.5);
  });
});

describe('finishOfPixel', () => {
  it('splits neutrals by lightness and colours by hue', () => {
    expect(finishOfPixel(rgbToLab(20, 20, 20))).toBe('black');
    expect(finishOfPixel(rgbToLab(160, 160, 165))).toBe('silver');
    expect(finishOfPixel(rgbToLab(248, 248, 248))).toBe('white');
    expect(finishOfPixel(rgbToLab(0xc9, 0xa2, 0x27))).toBe('gold');
    expect(finishOfPixel(rgbToLab(0x6b, 0x4f, 0x2a))).toBe('bronze');
    expect(finishOfPixel(rgbToLab(0xb8, 0x73, 0x33))).toBe('copper');
  });

  it('abstains on a colour no hardware finish comes in', () => {
    expect(finishOfPixel(rgbToLab(30, 80, 200))).toBeNull();
    expect(finishOfPixel(rgbToLab(40, 160, 60))).toBeNull();
  });
});

describe('readFinish', { timeout: 20_000 }, () => {
  it.each([
    ['black', '#ffffff', '#1a1a1a'],
    ['silver', '#ffffff', '#a4a6aa'],
    ['gold', '#f4f4f4', '#c9a227'],
    ['bronze', '#ffffff', '#6b4f2a'],
    ['copper', '#ffffff', '#b87333'],
    ['white', '#555555', '#fafafa'],
  ])('reads a %s piece on a plain backdrop', async (finish, backdrop, colour) => {
    const reading = await readFinish(await centred(backdrop, colour));
    expect(reading.finish).toBe(finish);
    expect(reading.share).toBeGreaterThan(0.9);
    expect(reading.subject).toBeGreaterThan(0.2);
  });

  it('reads the piece, not the backdrop, on a dark counter as well as a white sheet', async () => {
    expect((await readFinish(await centred('#2b2b2b', '#c9a227'))).finish).toBe('gold');
  });

  it('goes with the clear majority on a two tone piece', async () => {
    const twoTone = await photo('#ffffff', [
      { colour: '#1a1a1a', left: 100, top: 100, width: 200, height: 140 },
      { colour: '#c9a227', left: 100, top: 240, width: 200, height: 60 },
    ]);
    expect((await readFinish(twoTone)).finish).toBe('black');
  });

  it('refuses to guess when no finish has a majority', async () => {
    const mixed = await photo('#ffffff', [
      { colour: '#1a1a1a', left: 60, top: 100, width: 90, height: 200 },
      { colour: '#c9a227', left: 155, top: 100, width: 90, height: 200 },
      { colour: '#b87333', left: 250, top: 100, width: 90, height: 200 },
    ]);
    const reading = await readFinish(mixed);
    expect(reading.finish).toBeNull();
    expect(reading.share).toBeLessThan(0.45);
  });

  it('returns no finish for an empty frame', async () => {
    const reading = await readFinish(await centred('#ffffff', '#ffffff'));
    expect(reading).toEqual({ finish: null, share: 0, subject: 0 });
  });

  it('returns no finish for a piece in a colour Beco does not stock', async () => {
    expect((await readFinish(await centred('#ffffff', '#1e50c8'))).finish).toBeNull();
  });
});
