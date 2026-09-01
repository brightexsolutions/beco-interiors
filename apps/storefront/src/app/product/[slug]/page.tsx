import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ProductGallery, PriceDisplay, AvailabilityBadge, buttonClasses, cn,
  type GalleryImage, type GalleryRole,
} from '@beco/ui';
import { AddToQuote } from '@/components/add-to-quote';
import { getProductBySlug, getProductSlugs, primaryImage, blurProps } from '@/lib/products';
import { SITE, whatsappLink } from '@/lib/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getProductSlugs()).map((slug) => ({ slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const image = primaryImage(product);
  return {
    // The override column wins, so Beco can tune a page without a deploy.
    title: product.meta_title ?? `${product.name} sintered stone`,
    description:
      product.meta_description ??
      product.short_description ??
      `${product.name} sintered stone slabs, stocked in Nairobi. Heat, scratch and stain resistant. Request a quote from Beco Interiors.`,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: image
      ? { images: [{ url: image.path, width: image.width, height: image.height }] }
      : undefined,
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

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

  const hero = primaryImage(product);
  const context = `${product.name}${product.sku ? ` (${product.sku})` : ''}`;

  return (
    <main className="mx-auto max-w-[1380px] px-6 py-10">
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

      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <ProductGallery images={images} />

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
            />
            <AvailabilityBadge
              availability={product.availability}
              priceDisplayMode={product.price_display_mode}
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
              product is the only signal we get. */}
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={whatsappLink(context)}
              data-analytics="whatsapp_click"
              data-product={product.slug}
              className={cn(buttonClasses({ variant: 'outline' }), 'flex-1 sm:flex-none')}
            >
              Ask on WhatsApp
            </a>
            <a
              href={SITE.phoneHref}
              data-analytics="call_click"
              data-product={product.slug}
              className={cn(buttonClasses({ variant: 'outline' }), 'flex-1 sm:flex-none')}
            >
              {SITE.phone}
            </a>
          </div>

          <dl className="mt-10 border-t border-neutral-200 font-ui text-base">
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

          {product.description ? (
            <div className="mt-10 max-w-[68ch] space-y-4 text-base leading-[1.6] text-neutral-700">
              {product.description.split('\n\n').map((para) => <p key={para}>{para}</p>)}
            </div>
          ) : null}
        </div>
      </div>

      <ProductSchema
        name={product.name}
        slug={product.slug}
        sku={product.sku}
        description={product.short_description ?? product.description}
        image={hero?.path ?? null}
        price={product.price}
        priceDisplayMode={product.price_display_mode}
        availability={product.availability}
        category={product.category}
      />
    </main>
  );
}

function Spec({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-neutral-200 py-3">
      <dt className="text-neutral-500">{term}</dt>
      <dd className="text-right font-semibold text-charcoal">{value}</dd>
    </div>
  );
}

function ProductSchema(p: {
  name: string; slug: string; sku: string | null; description: string | null;
  image: string | null; price: number | null; priceDisplayMode: 'fixed' | 'poa';
  availability: 'in_stock' | 'pre_order' | 'poa';
  category: { name: string; slug: string } | null;
}) {
  const url = `https://www.beco.co.ke/product/${p.slug}`;
  const AVAILABILITY = {
    in_stock: 'https://schema.org/InStock',
    pre_order: 'https://schema.org/PreOrder',
    // POA is genuinely "ask us", not "we do not have it". LimitedAvailability
    // is the honest mapping; InStock with no price would be a lie to a
    // crawler, and OutOfStock would be a lie to a customer.
    poa: 'https://schema.org/LimitedAvailability',
  } as const;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    ...(p.sku ? { sku: p.sku } : {}),
    ...(p.description ? { description: p.description } : {}),
    ...(p.image ? { image: [new URL(p.image, 'https://www.beco.co.ke').toString()] } : {}),
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
      availability: AVAILABILITY[p.availability],
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
