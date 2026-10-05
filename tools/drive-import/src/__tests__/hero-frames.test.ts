import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { cutHeroFrame, HERO_FRAME_BUDGET, HERO_FRAMES, isHeroSlug, resolveHeroSource } from '../hero-frames';

/**
 * Noise is the hardest thing to compress, so a source that fits after noise
 * fits after any real room photograph of the same size.
 */
const noisy = async (width: number, height: number) => {
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 2654435761) >>> 24;
  return sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
};

const flat = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 180, g: 170, b: 160 } } }).jpeg().toBuffer();

describe('cutHeroFrame', { timeout: 30_000 }, () => {
  it('cuts a landscape source into both frames at their exact sizes, as WebP, under budget', async () => {
    const source = await flat(4000, 2667);
    for (const name of ['wide', 'tall'] as const) {
      const frame = await cutHeroFrame(source, name);
      const meta = await sharp(frame.body).metadata();
      expect(meta.format).toBe('webp');
      expect({ width: meta.width, height: meta.height }).toEqual(HERO_FRAMES[name]);
      expect(frame.bytes).toBe(frame.body.byteLength);
      expect(frame.bytes).toBeLessThanOrEqual(HERO_FRAME_BUDGET);
    }
  });

  it('keeps the top quality when the photograph is easy to compress', async () => {
    const frame = await cutHeroFrame(await flat(2000, 2000), 'wide');
    expect(frame.quality).toBe(80);
  });

  it('steps quality down for a busy photograph rather than going over', async () => {
    const source = await noisy(640, 360);
    const generous = await cutHeroFrame(source, 'wide', 'centre', 10 * 1024 * 1024);
    const tight = await cutHeroFrame(source, 'wide', 'centre', Math.floor(generous.bytes * 0.8));
    expect(tight.quality).toBeLessThan(generous.quality);
    expect(tight.bytes).toBeLessThanOrEqual(Math.floor(generous.bytes * 0.8));
  });

  it('refuses a frame it cannot fit, rather than shipping one over budget', async () => {
    await expect(cutHeroFrame(await noisy(640, 360), 'tall', 'attention', 1024)).rejects.toThrow(/does not fit 1024 bytes/);
  });

  it('upscales a small source to fill the frame, since the hero has no letterbox', async () => {
    const frame = await cutHeroFrame(await flat(800, 600), 'wide', 'west');
    const meta = await sharp(frame.body).metadata();
    expect({ width: meta.width, height: meta.height }).toEqual(HERO_FRAMES.wide);
  });
});

describe('resolveHeroSource', () => {
  it('expands a Pexels id to the full size photo URL', () => {
    expect(resolveHeroSource('pexels:4800189')).toEqual({
      kind: 'url',
      location: 'https://images.pexels.com/photos/4800189/pexels-photo-4800189.jpeg?w=3000',
    });
  });

  it('fetches any other http address as given', () => {
    expect(resolveHeroSource('https://example.com/room.jpg')).toEqual({ kind: 'url', location: 'https://example.com/room.jpg' });
  });

  it('reads anything else as a local file, including a malformed Pexels id', () => {
    expect(resolveHeroSource('./room.jpg')).toEqual({ kind: 'file', location: './room.jpg' });
    expect(resolveHeroSource('pexels:abc')).toEqual({ kind: 'file', location: 'pexels:abc' });
  });
});

describe('isHeroSlug', () => {
  it('accepts kebab-case and rejects anything that could escape the folder', () => {
    expect(isHeroSlug('living-room')).toBe(true);
    for (const bad of ['Living-room', '../kitchen', 'kitchen/', 'kitchen-', '', 'a b']) expect(isHeroSlug(bad)).toBe(false);
  });
});
