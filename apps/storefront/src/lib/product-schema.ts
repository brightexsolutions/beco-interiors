import { displayAvailability } from '@beco/ui';
import { absoluteCatalogueUrl } from '@/lib/image-loader';
import { SITE_URL } from '@/lib/seo';
import { SITE } from '@/lib/site';

/**
 * The product page's JSON-LD, D156.
 *
 * Google's merchant listing needs an `Offer` with a price above zero, and a
 * product snippet needs an `Offer` with a price as well. A price on request
 * product has neither, and Search Console reported every such page as a
 * critical "Missing field price (in offers)" from the first crawl after
 * launch. An `Offer` with no price is not a listing with the price left
 * out, it is an invalid listing, and a `Product` with no `Offer` at all is
 * the same error on the product snippets report instead. So a product
 * carries the `Product` entity only when it carries a price, and every
 * product carries its `BreadcrumbList`.
 */
export interface ProductSchemaInput {
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  /** The hero image's catalogue key, made absolute here. */
  image: string | null;
  price: number | null;
  priceDisplayMode: 'fixed' | 'poa';
  availability: 'in_stock' | 'pre_order' | 'poa';
  stockQuantity?: number | null;
  category: { name: string; slug: string } | null;
}

const AVAILABILITY = {
  in_stock: 'https://schema.org/InStock',
  pre_order: 'https://schema.org/PreOrder',
  // POA is genuinely "ask us", not "we do not have it". LimitedAvailability
  // is the honest mapping; InStock with no price would be a lie to a
  // crawler, and OutOfStock would be a lie to a customer. Only reached by
  // a priced product whose availability is still POA.
  poa: 'https://schema.org/LimitedAvailability',
  out_of_stock: 'https://schema.org/OutOfStock',
} as const;

export const productUrl = (slug: string): string => `${SITE_URL}/product/${slug}`;

/** True when the product has a price Google will accept: fixed, and above zero. */
export const hasListablePrice = (p: Pick<ProductSchemaInput, 'price' | 'priceDisplayMode'>): boolean =>
  p.priceDisplayMode === 'fixed' && p.price != null && p.price > 0;

/** The `Product` entity with its `Offer`, or null for a product with no price. */
export const productJsonLd = (p: ProductSchemaInput): Record<string, unknown> | null => {
  if (!hasListablePrice(p)) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    ...(p.sku ? { sku: p.sku } : {}),
    ...(p.description ? { description: p.description } : {}),
    // An absolute derivative, not the bare key: `new URL(key, origin)` gave
    // a URL with no width and no extension, which is a 404.
    ...(p.image ? { image: [absoluteCatalogueUrl(p.image, 1600, SITE_URL)] } : {}),
    brand: { '@type': 'Brand', name: SITE.name },
    ...(p.category ? { category: p.category.name } : {}),
    offers: {
      '@type': 'Offer',
      url: productUrl(p.slug),
      price: p.price,
      priceCurrency: 'KES',
      availability: AVAILABILITY[displayAvailability(p.availability, p.stockQuantity)],
      seller: { '@type': 'Organization', name: SITE.name },
    },
  };
};

/** Home, Shop, the category when there is one, then the product. */
export const breadcrumbJsonLd = (p: Pick<ProductSchemaInput, 'name' | 'slug' | 'category'>): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
    ...(p.category
      ? [{ '@type': 'ListItem', position: 3, name: p.category.name, item: `${SITE_URL}/shop/${p.category.slug}` }]
      : []),
    { '@type': 'ListItem', position: p.category ? 4 : 3, name: p.name, item: productUrl(p.slug) },
  ],
});
