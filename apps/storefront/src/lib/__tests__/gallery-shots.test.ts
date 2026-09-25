import { describe, expect, it } from 'vitest';
import { interleave, shotsForProduct, type GalleryShotImage } from '../products';

const img = (path: string): GalleryShotImage => ({
  path, alt: path, width: 1600, height: 1200,
});

describe('shotsForProduct', () => {
  it('puts each shot first among its own siblings, so hover never jumps away from what is on screen', () => {
    const shots = shotsForProduct([img('a'), img('b'), img('c')], 'Amber Jade', 'amber-jade');
    expect(shots[0]!.siblings.map((s) => s.path)).toEqual(['a', 'b', 'c']);
    expect(shots[1]!.siblings.map((s) => s.path)).toEqual(['b', 'a', 'c']);
    expect(shots[2]!.siblings.map((s) => s.path)).toEqual(['c', 'a', 'b']);
  });

  it('carries the product identity onto every shot', () => {
    const shots = shotsForProduct([img('a'), img('b')], 'Amber Jade', 'amber-jade');
    for (const shot of shots) {
      expect(shot.productName).toBe('Amber Jade');
      expect(shot.productSlug).toBe('amber-jade');
    }
  });

  it('caps siblings at four, so a card is never a slideshow', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f'].map(img);
    const shots = shotsForProduct(many, 'Delfone 12mm', 'delfone-12mm');
    for (const shot of shots) expect(shot.siblings.length).toBeLessThanOrEqual(4);
  });

  it('gives a single shot exactly itself as its only sibling', () => {
    const shots = shotsForProduct([img('a')], 'Pure White', 'pure-white');
    expect(shots[0]!.siblings.map((s) => s.path)).toEqual(['a']);
  });

  it('returns nothing for a product with no application shots', () => {
    expect(shotsForProduct([], 'Knobs', 'knobs')).toEqual([]);
  });

  it('never borrows a sibling from a different product, by construction', () => {
    // shotsForProduct is called once per product in getGalleryShots, so its
    // input is always one product's own images. Proving the shape here is
    // what makes that call site trustworthy without a database round trip.
    const shots = shotsForProduct([img('a'), img('b')], 'Amber Jade', 'amber-jade');
    const paths = new Set(['a', 'b']);
    for (const shot of shots) {
      for (const sibling of shot.siblings) expect(paths.has(sibling.path)).toBe(true);
    }
  });
});

describe('interleave', () => {
  it('takes one from each list before taking a second from any', () => {
    expect(interleave([[1, 2], [10, 20], [100]])).toEqual([1, 10, 100, 2, 20]);
  });

  it('handles lists of very different lengths without dropping anything', () => {
    const long = Array.from({ length: 5 }, (_, i) => i);
    expect(interleave([long, [99]])).toEqual([0, 99, 1, 2, 3, 4]);
  });

  it('returns nothing for no lists, or for only empty ones', () => {
    expect(interleave([])).toEqual([]);
    expect(interleave([[], []])).toEqual([]);
  });
});
