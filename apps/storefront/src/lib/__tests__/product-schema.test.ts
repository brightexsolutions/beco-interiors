import { describe, expect, it } from 'vitest';
import { breadcrumbJsonLd, hasListablePrice, productJsonLd, productUrl } from '../product-schema';

const base = {
  name: '15mm Sintered Stone 4199',
  slug: '15mm-sintered-stone-4199',
  sku: null,
  description: null,
  image: '15mm-sintered-stones/15mm-sintered-stone-4199/slab-0',
  price: 18500,
  priceDisplayMode: 'fixed' as const,
  availability: 'in_stock' as const,
  stockQuantity: null,
  category: { name: '15mm Sintered Stones', slug: '15mm-sintered-stones' },
};

describe('productJsonLd, D156', () => {
  it('offers a priced product with its price, currency and availability', () => {
    const schema = productJsonLd(base) as { offers: Record<string, unknown>; image: string[] };
    expect(schema).toMatchObject({
      '@type': 'Product',
      name: base.name,
      brand: { '@type': 'Brand', name: 'Beco Interiors' },
      category: '15mm Sintered Stones',
    });
    expect(schema.offers).toMatchObject({
      '@type': 'Offer',
      url: 'https://www.beco.co.ke/product/15mm-sintered-stone-4199',
      price: 18500,
      priceCurrency: 'KES',
      availability: 'https://schema.org/InStock',
    });
    // An absolute derivative with a width and an extension, never the bare key.
    expect(schema.image[0]).toMatch(/^https:\/\/www\.beco\.co\.ke\/.*slab-0-1600\.webp$/);
  });

  it('emits no Product entity for a price on request product', () => {
    // Search Console, 8 October 2026: every POA page was a critical
    // "Missing field price (in offers)". An Offer with no price is not a
    // listing, and a Product with no Offer is the same error on the other
    // report, so the entity goes, not just the field.
    expect(productJsonLd({ ...base, price: null, priceDisplayMode: 'poa' })).toBeNull();
    expect(productJsonLd({ ...base, price: 18500, priceDisplayMode: 'poa' })).toBeNull();
  });

  it('treats a zero price as no price: a listing needs a price above zero', () => {
    expect(productJsonLd({ ...base, price: 0 })).toBeNull();
    expect(hasListablePrice({ price: 0, priceDisplayMode: 'fixed' })).toBe(false);
    expect(hasListablePrice({ price: 1, priceDisplayMode: 'fixed' })).toBe(true);
  });

  it('says OutOfStock when the stock count is zero, whatever the availability flag', () => {
    const schema = productJsonLd({ ...base, stockQuantity: 0 }) as { offers: { availability: string } };
    expect(schema.offers.availability).toBe('https://schema.org/OutOfStock');
  });

  it('leaves out sku, description, image and category when there are none', () => {
    const schema = productJsonLd({ ...base, image: null, category: null }) as Record<string, unknown>;
    expect(schema).not.toHaveProperty('sku');
    expect(schema).not.toHaveProperty('description');
    expect(schema).not.toHaveProperty('image');
    expect(schema).not.toHaveProperty('category');
  });
});

describe('breadcrumbJsonLd', () => {
  it('runs Home, Shop, the category, the product, for every product including POA', () => {
    const crumbs = breadcrumbJsonLd({ name: base.name, slug: base.slug, category: base.category }) as { itemListElement: { position: number; item: string }[] };
    expect(crumbs.itemListElement.map((c) => c.position)).toEqual([1, 2, 3, 4]);
    expect(crumbs.itemListElement[2]?.item).toBe('https://www.beco.co.ke/shop/15mm-sintered-stones');
    expect(crumbs.itemListElement[3]?.item).toBe(productUrl(base.slug));
  });

  it('skips the category step when the product has no category', () => {
    const crumbs = breadcrumbJsonLd({ name: base.name, slug: base.slug, category: null }) as { itemListElement: { position: number; name: string }[] };
    expect(crumbs.itemListElement.map((c) => c.position)).toEqual([1, 2, 3]);
    expect(crumbs.itemListElement[2]?.name).toBe(base.name);
  });
});
