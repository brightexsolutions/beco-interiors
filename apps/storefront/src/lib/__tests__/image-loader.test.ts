import { describe, expect, it } from 'vitest';
import imageLoader, { isCatalogueKey } from '../image-loader';

/**
 * A custom loader is GLOBAL. Next routes every next/image through it, so it
 * has to tell a catalogue key from a file that is already a real URL.
 *
 * It did not, and the logo was rewritten to `/logo-mark.png-400.webp`. The
 * header and footer both shipped a broken image, which is the most visible
 * possible failure and still passed every test that existed.
 */
describe('imageLoader', () => {
  it('turns a catalogue key into the nearest derivative', () => {
    expect(imageLoader({ src: '12mm/amber-jade/slab-0', width: 700 }))
      .toBe('/12mm/amber-jade/slab-0-800.webp');
  });

  it('never asks for a width larger than the largest derivative', () => {
    expect(imageLoader({ src: 'a/b/slab-0', width: 4000 })).toBe('/a/b/slab-0-1600.webp');
  });

  it('rounds up, so an image is never upscaled by the browser', () => {
    expect(imageLoader({ src: 'a/b/slab-0', width: 401 })).toBe('/a/b/slab-0-800.webp');
  });

  it.each([
    ['/logo-mark.png', 'a local public asset'],
    ['/logo-lockup-white.png', 'the footer lockup'],
    ['https://cdn.example.com/x.jpg', 'an absolute URL'],
    ['data:image/webp;base64,AAAA', 'an inline data URI'],
  ])('passes %s through untouched, because it is %s', (src) => {
    expect(imageLoader({ src, width: 400 })).toBe(src);
  });

  it('recognises what is and is not a catalogue key', () => {
    expect(isCatalogueKey('12mm/amber-jade/slab-0')).toBe(true);
    expect(isCatalogueKey('/logo-mark.png')).toBe(false);
    expect(isCatalogueKey('logo.png')).toBe(false);
  });
});
