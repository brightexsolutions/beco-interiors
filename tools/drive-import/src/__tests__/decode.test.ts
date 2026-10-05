import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { heicCommand, HeicUnsupportedError, isHeic, toDecodable } from '../decode';

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

describe('heicCommand', () => {
  it('uses sips on macOS and heif-convert everywhere else', () => {
    expect(heicCommand('darwin', '/t/in.heic', '/t/out.png')).toEqual(['sips', ['-s', 'format', 'png', '/t/in.heic', '--out', '/t/out.png']]);
    expect(heicCommand('linux', '/t/in.heic', '/t/out.png')).toEqual(['heif-convert', ['/t/in.heic', '/t/out.png']]);
  });
});

describe('toDecodable', () => {
  // A real HEIC, 927 bytes: a gold block on white, made with heif-enc.
  const heic = readFileSync(new URL('./fixtures/gold-on-white.heic', import.meta.url));

  it('passes anything that is not HEIC straight through, without running a converter', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    let ran = false;
    expect(toDecodable(jpeg, 'a.jpg', () => { ran = true; })).toBe(jpeg);
    expect(ran).toBe(false);
  });

  it('turns a real HEIC into a PNG Sharp reads, on Linux, through heif-convert', async () => {
    // CI and the import workflow install libheif, so this runs for real there.
    const png = toDecodable(heic, 'gold-on-white.heic', undefined, 'linux');
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe('png');
    expect({ width: meta.width, height: meta.height }).toEqual({ width: 96, height: 64 });
  });

  it('says what to install when the converter is missing, rather than spawn ENOENT', () => {
    const missing = () => {
      throw Object.assign(new Error('spawn heif-convert ENOENT'), { code: 'ENOENT' });
    };
    expect(() => toDecodable(heic, 'IMG_1193.HEIC', missing, 'linux')).toThrow(HeicUnsupportedError);
    expect(() => toDecodable(heic, 'IMG_1193.HEIC', missing, 'linux')).toThrow(/libheif-plugin-libde265/);
  });

  it('passes any other converter failure on as it is', () => {
    const broken = () => {
      throw Object.assign(new Error('decoder error'), { code: 1 });
    };
    expect(() => toDecodable(heic, 'IMG_1193.HEIC', broken, 'linux')).toThrow('decoder error');
  });

  it('refuses a converter that ran but wrote nothing', () => {
    expect(() => toDecodable(heic, 'IMG_1193.HEIC', () => {}, 'linux')).toThrow(/produced no image/);
  });
});
