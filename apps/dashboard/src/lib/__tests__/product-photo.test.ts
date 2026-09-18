import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { processProductPhoto } from '../product-photo';

describe('processProductPhoto', () => {
  it('writes 400, 800 and 1600 webp derivatives plus a blur placeholder', async () => {
    const source = await sharp({
      create: { width: 200, height: 120, channels: 3, background: { r: 180, g: 160, b: 140 } },
    })
      .jpeg()
      .toBuffer();
    const processed = await processProductPhoto(source);
    expect(processed.width).toBe(200);
    expect(processed.height).toBe(120);
    expect(processed.blurDataUrl.startsWith('data:image/webp;base64,')).toBe(true);
    expect(processed.derivatives.map((row) => row.width)).toEqual([400, 800, 1600]);
    for (const derivative of processed.derivatives) {
      expect(derivative.body.byteLength).toBeGreaterThan(32);
    }
  });

  it('refuses a buffer that is not a photograph', async () => {
    await expect(processProductPhoto(Buffer.from('not an image'))).rejects.toThrow(/not a photograph/i);
  });
});
