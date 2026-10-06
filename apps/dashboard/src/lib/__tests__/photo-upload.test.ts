import { describe, expect, it } from 'vitest';
import { MAX_PHOTO_BYTES, photoUploadProblem } from '../photo-upload';

const file = (bytes: number, type: string, name = 'slab.jpg') =>
  new File([new Uint8Array(bytes)], name, { type });

describe('photoUploadProblem', () => {
  it('lets a JPEG, PNG, WebP or HEIC of a sane size through', () => {
    expect(photoUploadProblem(file(1024, 'image/jpeg'))).toBeNull();
    expect(photoUploadProblem(file(1024, 'image/png'))).toBeNull();
    expect(photoUploadProblem(file(1024, 'image/webp'))).toBeNull();
    expect(photoUploadProblem(file(1024, 'image/heic'))).toBeNull();
  });

  it('lets a file with no declared type through, since some phones send HEIC that way', () => {
    expect(photoUploadProblem(file(1024, ''))).toBeNull();
  });

  it('turns away nothing at all, an empty file and a plain string', () => {
    expect(photoUploadProblem(null)).toBe('Choose a photograph first.');
    expect(photoUploadProblem('slab.jpg')).toBe('Choose a photograph first.');
    expect(photoUploadProblem(file(0, 'image/jpeg'))).toBe('Choose a photograph first.');
  });

  it('turns away a file over the limit by its size, before any processing', () => {
    expect(photoUploadProblem(file(MAX_PHOTO_BYTES + 1, 'image/jpeg'))).toMatch(/larger than 12MB/);
    expect(photoUploadProblem(file(MAX_PHOTO_BYTES, 'image/jpeg'))).toBeNull();
  });

  it('turns away a declared non-image type', () => {
    expect(photoUploadProblem(file(1024, 'application/pdf', 'quote.pdf'))).toBe('Use a JPEG, PNG or WebP photograph.');
    expect(photoUploadProblem(file(1024, 'text/html', 'x.html'))).toBe('Use a JPEG, PNG or WebP photograph.');
  });
});
