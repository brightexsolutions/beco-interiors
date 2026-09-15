import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { assessQuality } from '../quality';

/**
 * Regression test for a bug that shipped: `sharp().stats()` reads the INPUT
 * image and silently ignores a preceding `.extract()`, so every corner sample
 * returned identical numbers and the background check measured nothing.
 *
 * These fixtures are generated rather than loaded, so the test needs no
 * network and no real photograph.
 */
const solid = (r: number, g: number, b: number, size = 400) =>
  sharp({ create: { width: size, height: size, channels: 3, background: { r, g, b } } })
    .jpeg().toBuffer();

/** A dark subject on a light backdrop, which is the hardware shot pattern. */
const subjectOnBackdrop = async () => {
  const bg = await solid(235, 235, 235, 400);
  const fg = await solid(30, 30, 30, 160);
  return sharp(bg)
    .composite([{ input: fg, top: 120, left: 120 }])
    .jpeg()
    .toBuffer();
};

describe('assessQuality', () => {
  it('detects a clean backdrop with a distinct subject', async () => {
    const q = await assessQuality(await subjectOnBackdrop(), 'test');
    expect(q.uniformBackground).toBe(true);
    // The bug made this 0 for every image. It must see real separation.
    expect(q.subjectContrast).toBeGreaterThan(20);
  });

  it('does NOT call a flat image a clean backdrop, because there is no subject', async () => {
    const q = await assessQuality(await solid(235, 235, 235), 'flat');
    expect(q.subjectContrast).toBeLessThan(5);
    expect(q.uniformBackground).toBe(false);
  });

  it('flags a blank image, which is the real Pure White defect', async () => {
    const q = await assessQuality(await solid(255, 255, 255), 'pure-white/slab');
    expect(q.warnings.join(' ')).toContain('almost no detail');
    expect(q.entropy).toBeLessThan(1.5);
  });

  it('reports lightness that tracks the product name', async () => {
    expect((await assessQuality(await solid(20, 20, 20), 'x')).lightness).toBeLessThan(15);
    expect((await assessQuality(await solid(240, 240, 240), 'x')).lightness).toBeGreaterThan(90);
  });
});
