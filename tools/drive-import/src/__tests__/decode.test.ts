import { describe, expect, it } from 'vitest';
import { isHeic } from '../decode';

/**
 * Detection is by BYTES, not by filename.
 *
 * Extension matching was tried first and failed silently: the path carried
 * through the pipeline is not always the leaf file, so `isHeic` returned false
 * for every real HEIC and 124 photographs were skipped on three consecutive
 * runs while the code looked correct.
 */
const box = (brand: string) => {
  const b = Buffer.alloc(16);
  b.write('ftyp', 4, 'ascii');
  b.write(brand, 8, 'ascii');
  return b;
};

describe('isHeic', () => {
  it.each(['heic', 'heix', 'hevc', 'mif1', 'msf1'])('recognises the %s brand', (brand) => {
    expect(isHeic(box(brand))).toBe(true);
  });

  it('is case insensitive about the brand', () => {
    expect(isHeic(box('HEIC'))).toBe(true);
  });

  it('says no to a JPEG', () => {
    expect(isHeic(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(false);
  });

  it('says no to a PNG', () => {
    expect(isHeic(Buffer.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 0]))).toBe(false);
  });

  it('says no to an MP4, which shares the ftyp box but not the brand', () => {
    expect(isHeic(box('isom'))).toBe(false);
  });

  it('does not read past the end of a short buffer', () => {
    expect(isHeic(Buffer.alloc(4))).toBe(false);
  });
});
