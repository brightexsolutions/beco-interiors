import { describe, expect, it, vi } from 'vitest';
import { PHOTO_LONG_EDGE } from '@beco/validation';
import {
  HeicDecodeError,
  fitWithin,
  isHeicFile,
  photoInputProblem,
  prepareImage,
  type Decoded,
  type ImageCodecs,
} from '../image-prepare';

const file = (bytes: number, type: string, name = 'slab.jpg') => new File([new Uint8Array(bytes)], name, { type });

const codecs = (over: Partial<ImageCodecs> & { width?: number; height?: number; encodedBytes?: number } = {}): ImageCodecs => {
  const width = over.width ?? 4000;
  const height = over.height ?? 3000;
  const decoded: Decoded = { width, height, draw: vi.fn(), close: vi.fn() };
  return {
    heicToJpeg: over.heicToJpeg ?? vi.fn(async () => new Blob([new Uint8Array(900_000)], { type: 'image/jpeg' })),
    decode: over.decode ?? vi.fn(async () => decoded),
    encode: over.encode ?? vi.fn(async () => new Blob([new Uint8Array(over.encodedBytes ?? 600_000)], { type: 'image/jpeg' })),
  };
};

describe('photoInputProblem', () => {
  it('turns away nothing, an empty file, a non image and anything over 40MB, naming the file', () => {
    expect(photoInputProblem(null)).toBe('Choose a photograph first.');
    expect(photoInputProblem(file(0, 'image/jpeg'))).toBe('Choose a photograph first.');
    expect(photoInputProblem(file(10, 'application/pdf', 'price-list.pdf'))).toBe('price-list.pdf is not a photograph.');
    expect(photoInputProblem(file(41 * 1024 * 1024, 'image/jpeg', 'huge.jpg'))).toMatch(/huge\.jpg is 41\.0MB, over the 40MB/);
    expect(photoInputProblem(file(9_500_000, 'image/jpeg'))).toBeNull();
    expect(photoInputProblem(file(9_500_000, '', 'IMG_0001.HEIC'))).toBeNull();
  });
});

describe('isHeicFile and fitWithin', () => {
  it('spots a HEIC by type or by name', () => {
    expect(isHeicFile(file(1, 'image/heic'))).toBe(true);
    expect(isHeicFile(file(1, 'image/heif'))).toBe(true);
    expect(isHeicFile(file(1, '', 'IMG_4197.HEIC'))).toBe(true);
    expect(isHeicFile(file(1, 'image/jpeg', 'IMG_4197.jpg'))).toBe(false);
  });

  it('caps the long edge and keeps the aspect, never enlarging', () => {
    expect(fitWithin(4000, 3000, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(fitWithin(3000, 4000, 2400)).toEqual({ width: 1800, height: 2400 });
    expect(fitWithin(1200, 800, 2400)).toEqual({ width: 1200, height: 800 });
  });
});

describe('prepareImage', () => {
  it('scales a big phone JPEG to the long edge, re-encodes it and says it changed', async () => {
    const c = codecs();
    const phases: string[] = [];
    const result = await prepareImage(file(9_500_000, 'image/jpeg', 'IMG_1.jpg'), { codecs: c, onPhase: (p) => phases.push(p) });
    expect(result.changed).toBe(true);
    expect(result.width).toBe(PHOTO_LONG_EDGE);
    expect(result.height).toBe(1800);
    expect(result.file.name).toBe('IMG_1.jpg');
    expect(result.file.type).toBe('image/jpeg');
    expect(result.file.size).toBe(600_000);
    expect(c.encode).toHaveBeenCalledWith(expect.anything(), 2400, 1800, expect.any(Number));
    expect(phases).toEqual(['decoding', 'resizing']);
  });

  it('leaves a small JPEG alone', async () => {
    const c = codecs({ width: 1600, height: 1200 });
    const original = file(400_000, 'image/jpeg', 'small.jpg');
    const result = await prepareImage(original, { codecs: c });
    expect(result.changed).toBe(false);
    expect(result.file).toBe(original);
    expect(c.encode).not.toHaveBeenCalled();
  });

  it('re-encodes a heavy file even when its edges fit, and keeps the original when that made it bigger', async () => {
    const heavy = file(3_000_000, 'image/png', 'flat.png');
    const smaller = await prepareImage(heavy, { codecs: codecs({ width: 2000, height: 1500, encodedBytes: 700_000 }) });
    expect(smaller.changed).toBe(true);
    expect(smaller.file.type).toBe('image/jpeg');
    const bigger = await prepareImage(heavy, { codecs: codecs({ width: 2000, height: 1500, encodedBytes: 3_500_000 }) });
    expect(bigger.changed).toBe(false);
    expect(bigger.file).toBe(heavy);
  });

  it('decodes an iPhone HEIC through the converter first and always hands back a JPEG', async () => {
    const c = codecs({ width: 1000, height: 800 });
    const result = await prepareImage(file(5_000_000, 'image/heic', 'IMG_4197.HEIC'), { codecs: c });
    expect(c.heicToJpeg).toHaveBeenCalled();
    expect(result.changed).toBe(true);
    expect(result.file.name).toBe('IMG_4197.jpg');
    expect(result.file.type).toBe('image/jpeg');
  });

  it('says plainly when a HEIC cannot be read, with the way out', async () => {
    const c = codecs({
      heicToJpeg: vi.fn(async () => {
        throw new Error('libheif: unsupported');
      }),
    });
    await expect(prepareImage(file(5_000_000, 'image/heic', 'IMG_9.HEIC'), { codecs: c })).rejects.toBeInstanceOf(HeicDecodeError);
    await expect(prepareImage(file(5_000_000, 'image/heic', 'IMG_9.HEIC'), { codecs: c })).rejects.toThrow(/Could not read IMG_9\.HEIC.*Most Compatible/);
  });

  it('passes a file the browser cannot decode through untouched, for the server to judge', async () => {
    const c = codecs({
      decode: vi.fn(async () => {
        throw new Error('decode failed');
      }),
    });
    const original = file(100, 'image/webp', 'odd.webp');
    const result = await prepareImage(original, { codecs: c });
    expect(result.file).toBe(original);
    expect(result.changed).toBe(false);
  });
});
