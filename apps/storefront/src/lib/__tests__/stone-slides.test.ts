import { describe, expect, it } from 'vitest';
import { stoneSlidesFrom, type CatalogueProduct } from '../products';
import type { ProductImage } from '@beco/types';

const image = (role: ProductImage['role'], path = '/x.jpg'): ProductImage => ({
  role, path, alt: 'A slab', width: 1600, height: 3200, sort: 0,
});

const product = (slug: string, name: string, images: ProductImage[]): CatalogueProduct => ({
  id: slug, slug, name, images,
  price: null, compare_at_price: null, price_display_mode: 'poa',
  availability: 'poa', face_type: null, unit: null, badge: null,
});

describe('stoneSlidesFrom', () => {
  it('picks each product\'s slab shot, and only that role', () => {
    const products = [
      product('a', 'Amber Jade', [image('application'), image('slab', '/a-slab.jpg')]),
      product('b', 'Pure White', [image('slab', '/b-slab.jpg'), image('bookmatch')]),
    ];
    const slides = stoneSlidesFrom(products);
    expect(slides.map((s) => s.image.path)).toEqual(['/a-slab.jpg', '/b-slab.jpg']);
    expect(slides.map((s) => s.name)).toEqual(['Amber Jade', 'Pure White']);
  });

  it('skips a product with no slab shot rather than substituting another role', () => {
    const products = [
      product('a', 'Amber Jade', [image('application')]),
      product('b', 'Pure White', [image('slab')]),
    ];
    const slides = stoneSlidesFrom(products);
    expect(slides).toHaveLength(1);
    expect(slides[0]!.name).toBe('Pure White');
  });

  it('caps at the given limit, five by default', () => {
    const products = ['a', 'b', 'c', 'd', 'e', 'f'].map((slug) =>
      product(slug, slug, [image('slab')]),
    );
    expect(stoneSlidesFrom(products)).toHaveLength(5);
    expect(stoneSlidesFrom(products, 2)).toHaveLength(2);
  });

  it('returns an empty list rather than throwing when nothing qualifies', () => {
    expect(stoneSlidesFrom([])).toEqual([]);
  });
});
