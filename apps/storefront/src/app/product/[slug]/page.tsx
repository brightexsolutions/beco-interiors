import type { Metadata } from 'next';
import { catalogueOgImage, pageMetadata, productDescription, productTitle, SITE_URL } from '@/lib/seo';
import { absoluteCatalogueUrl } from '@/lib/image-loader';
import Image from 'next/image';
import Link from 'next/link';
import { permanentRedirect } from 'next/navigation';
import {
  ProductGallery, PriceDisplay, AvailabilityBadge, buttonClasses, cn, displayAvailability,
  type GalleryImage, type GalleryRole,
} from '@beco/ui';
import { AddToQuote } from '@/components/add-to-quote';
import { ProductGrid } from '@/components/product-grid';
import {
  getProductBySlug, getCanonicalProductSlug, getProductSlugs, getRelatedProducts, primaryImage, blurProps,
  getCategoryWithTree,
} from '@/lib/products';
import { isStoneRange, specNote } from '@/lib/material';
import { SITE, whatsappLink } from '@/lib/site';
import { shopSearchFor } from '@/lib/legacy-redirects';

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getProductSlugs()).map((slug) => ({ slug }));
}

type Params = { params: Promise<{ slug: string }> };

async function loadProduct(slug: string) {
  const product = await getProductBySlug(slug);
  if (product) return product;
  const canonical = await getCanonicalProductSlug(slug);
  if (canonical) permanentRedirect(`/product/${canonical}`);
  // WooCommerce also lived at /product/<slug>, so an unknown slug is most
  // likely an old listing Google still holds. The shop searched for its words
  // keeps that visitor, and the 301 passes the page's standing on (D107).
  permanentRedirect(shopSearchFor(slug));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);

  return pageMetadata({
    // The override columns win, so Beco can tune a page without a deploy.
    title: product.meta_title ?? productTitle(product.name, product.category?.name),
    description:
      product.meta_description ??
      productDescription(product.name, product.category?.name, product.short_description),
    path: `/product/${product.slug}`,
    // The card is drawn from the product's own primary photograph, as a
    // JPEG: the catalogue derivatives are WebP, which WhatsApp will not show.
    image: catalogueOgImage(
      'product',
      product.slug,
      `${product.name}${product.category ? `, ${product.category.name}` : ''}, from Beco Interiors, Nairobi`,
    ),
  });
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  const images: GalleryImage[] = (product.images ?? []).map((img, i) => ({
    role: img.role as GalleryRole,
    alt: img.alt,
    node: (
      <Image
        src={img.path}
        alt={img.alt}
        fill
        // The first image is the LCP element on this page.
        priority={i === 0}
        sizes="(max-width: 1024px) 100vw, 55vw"
        {...blurProps(img)}
        className="object-cover"
      />
    ),
  }));

  const [related, place] = product.category
    ? await Promise.all([
        getRelatedProducts(product.category.slug, product.slug),
        getCategoryWithTree(product.category.slug),
      ])
    : [[], null];
  // Stone wording only where the range sits under Sintered Stone, so a hinge
  // is never called a slab. See lib/material.ts for why the tree decides.
  const stone = isStoneRange(place ? [place.category, ...place.ancestors] : []);
  const hero = primaryImage(product);
  const whatsappIntent = `I'm interested in ${product.name}${product.sku ? ` (${product.sku})` : ''}`;

  return (
    <main className="mx-auto max-w-[1380px] px-8 sm:px-24 lg:px-40 py-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex flex-wrap items-center gap-2 font-ui text-sm text-neutral-500">
          <li><Link href="/" className="hover:text-charcoal">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/shop" className="hover:text-charcoal">Shop</Link></li>
          {product.category ? (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/shop/${product.category.slug}`} className="hover:text-charcoal">
                  {product.category.name}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-charcoal">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(21rem,0.85fr)] lg:gap-14">
        <ProductGallery images={images} slab={stone} />

        <div className="lg:pt-4">
          <h1 className="font-display text-4xl leading-[1.05] text-charcoal sm:text-5xl">
            {product.name}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <PriceDisplay
              priceDisplayMode={product.price_display_mode}
              price={product.price}
              compareAtPrice={product.compare_at_price}
              unit={product.unit}
              vatInclusive
            />
            <AvailabilityBadge
              availability={product.availability}
              priceDisplayMode={product.price_display_mode}
              stockQuantity={product.stock_quantity}
            />
          </div>

          {product.short_description ? (
            <p className="mt-6 max-w-[62ch] text-base leading-[1.6] text-neutral-700">
              {product.short_description}
            </p>
          ) : null}

          <div className="mt-8">
            <AddToQuote
              line={{
                slug: product.slug,
                name: product.name,
                unit: product.unit,
                image: hero?.path ?? null,
              }}
            />
          </div>

          {/* Secondary and tertiary, ranked identically to every other
              surface per D26. Both carry the product, because these two leads
              leave the site into channels analytics cannot follow and the
              product is the only signal we get.

              Icon and one word on a phone: "Ask on WhatsApp" and a full
              international number each wrapped to two lines and left the pair
              ragged, which is a worse advertisement for care than no buttons
              at all. */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <a
              href={whatsappLink(whatsappIntent)}
              data-analytics="whatsapp_click"
              data-product={product.slug}
              className={cn(buttonClasses({ variant: 'outline' }), 'w-full gap-2 px-3')}
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.16c-.24.68-1.42 1.31-1.95 1.36-.5.05-.98.23-3.3-.69-2.77-1.09-4.54-3.92-4.68-4.1-.14-.18-1.12-1.49-1.12-2.84 0-1.35.71-2.02.96-2.29a1 1 0 0 1 .73-.34h.52c.17 0 .39-.06.61.47.23.55.78 1.9.85 2.04.07.14.12.3.02.48-.09.18-.14.3-.28.46-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.28.14.44.12.6-.07.16-.19.69-.81.88-1.09.18-.28.37-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.21.52.32.07.12.07.66-.17 1.34Z" />
              </svg>
              WhatsApp
            </a>
            <a
              href={SITE.phoneHref}
              data-analytics="call_click"
              data-product={product.slug}
              aria-label={`Call Beco on ${SITE.phone}`}
              className={cn(buttonClasses({ variant: 'outline' }), 'w-full gap-2 px-3')}
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current">
                <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z" />
              </svg>
              <span className="sm:hidden">Call</span>
              <span className="hidden sm:inline">{SITE.phone}</span>
            </a>
          </div>

          <dl className="mt-10 flex flex-col gap-1 rounded-card bg-neutral-50 px-6 font-ui text-base">
            {product.sku ? <Spec term="SKU" value={product.sku} /> : null}
            {product.category ? <Spec term="Category" value={product.category.name} /> : null}
            {product.face_type ? (
              <Spec
                term="Face"
                value={product.face_type === 'book_match' ? 'Bookmatched' : 'One face'}
              />
            ) : null}
            {product.unit ? <Spec term="Sold" value={product.unit} /> : null}
            {Object.entries(product.specs ?? {}).map(([term, value]) => (
              <Spec key={term} term={term} value={String(value)} />
            ))}
          </dl>

          {/* Said plainly. Beco has not supplied specification sheets yet, and
              a page that simply stops after four rows reads as unfinished,
              while inventing a slab size or a hardness rating would cost more
              credibility than the gap does. */}
          {Object.keys(product.specs ?? {}).length === 0 ? (
            <p className="mt-4 max-w-[52ch] font-ui text-sm text-neutral-500">
              {specNote(stone)}
            </p>
          ) : null}

          {product.description ? (
            <div className="mt-10 max-w-[68ch] space-y-4 text-base leading-[1.6] text-neutral-700">
              {product.description.split('\n\n').map((para) => <p key={para}>{para}</p>)}
            </div>
          ) : null}
        </div>
      </div>

      {/* --- About the material. Written once against the category and reused
              on every product in it, so a page that has no description of its
              own is still a page worth reading and worth ranking. --- */}
      {product.category?.description ? (
        <section className="mt-24 border-t border-neutral-200 pt-14">
          <div className="grid gap-10 lg:grid-cols-[22rem_1fr] lg:gap-20">
            <div className="beco-clip">
              <div className="beco-wipe">
                <div className="flex items-center gap-4">
                  <span aria-hidden className="h-px w-8 bg-warm-red" />
                  <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    About the material
                  </p>
                </div>
                <h2 className="mt-4 max-w-[14ch] font-display text-3xl leading-[1.1] text-charcoal sm:text-4xl">
                  {product.category.name}
                </h2>
              </div>
            </div>
            <div className="max-w-[68ch] space-y-5 text-base leading-[1.7] text-neutral-700 lg:text-lg">
              {product.category.description.split('\n\n').map((para) => (
                <p key={para}>{para}</p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* --- Others in the range. Real internal linking, which spreads
              authority across the long tail instead of pooling it. --- */}
      {related.length > 0 ? (
        <section className="mt-24 border-t border-neutral-200 pt-14">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-display text-3xl leading-tight text-charcoal sm:text-4xl">
              Others in {product.category?.name}
            </h2>
            <Link
              href={`/shop/${product.category?.slug}`}
              className="font-ui text-sm font-semibold uppercase tracking-[0.12em] text-warm-red-deep underline-offset-4 hover:underline"
            >
              See the range
            </Link>
          </div>
          <ProductGrid products={related} />
        </section>
      ) : null}

      <ProductSchema
        name={product.name}
        slug={product.slug}
        sku={product.sku}
        description={product.short_description ?? product.description}
        image={hero?.path ?? null}
        price={product.price}
        priceDisplayMode={product.price_display_mode}
        availability={product.availability}
        stockQuantity={product.stock_quantity}
        category={product.category}
      />
    </main>
  );
}

function Spec({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
      <dt className="shrink-0 text-neutral-500">{term}</dt>
      <dd className="min-w-0 text-right font-semibold text-charcoal">{value}</dd>
    </div>
  );
}

function ProductSchema(p: {
  name: string; slug: string; sku: string | null; description: string | null;
  image: string | null; price: number | null; priceDisplayMode: 'fixed' | 'poa';
  availability: 'in_stock' | 'pre_order' | 'poa';
  stockQuantity?: number | null;
  category: { name: string; slug: string } | null;
}) {
  const url = `https://www.beco.co.ke/product/${p.slug}`;
  const shown = displayAvailability(p.availability, p.stockQuantity);
  const AVAILABILITY = {
    in_stock: 'https://schema.org/InStock',
    pre_order: 'https://schema.org/PreOrder',
    // POA is genuinely "ask us", not "we do not have it". LimitedAvailability
    // is the honest mapping; InStock with no price would be a lie to a
    // crawler, and OutOfStock would be a lie to a customer.
    poa: 'https://schema.org/LimitedAvailability',
    out_of_stock: 'https://schema.org/OutOfStock',
  } as const;

  const schema = {
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
      url,
      priceCurrency: 'KES',
      // A price is only ever asserted when one genuinely exists. Emitting 0
      // for a POA product is the kind of structured data error that gets a
      // whole feed disqualified.
      ...(p.priceDisplayMode === 'fixed' && p.price != null ? { price: p.price } : {}),
      availability: AVAILABILITY[shown],
      seller: { '@type': 'Organization', name: SITE.name },
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.beco.co.ke/' },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://www.beco.co.ke/shop' },
      ...(p.category
        ? [{
            '@type': 'ListItem', position: 3, name: p.category.name,
            item: `https://www.beco.co.ke/shop/${p.category.slug}`,
          }]
        : []),
      { '@type': 'ListItem', position: p.category ? 4 : 3, name: p.name, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
