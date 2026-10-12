'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon, StatusPill, cn, formatPrice } from '@beco/ui';
import { isLowStock, isOutOfStock, productImageUrl, sizesLabel, type CatalogueProduct } from '@/lib/products';

/**
 * The catalogue as cards, D138: the photograph leads, then the name, the
 * code, the price and the sizes, and a warning pill when stock is low or
 * out. No description: the card is for recognising the product, the editor
 * it opens holds the rest (Brown, 12 October). Six across on a wide screen,
 * four on a laptop, three on a tablet, two on a phone, every frame the same
 * 4:3 so the grid never shifts.
 */
export function ProductCardGrid({
  products,
  editHref,
  busy = false,
}: {
  products: CatalogueProduct[];
  editHref: (slug: string) => string;
  busy?: boolean | undefined;
}) {
  return (
    <ul
      aria-label="Products"
      aria-busy={busy || undefined}
      className={cn(
        'grid min-w-0 grid-cols-2 gap-3 transition-opacity duration-200 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6',
        busy && 'opacity-50',
      )}
    >
      {products.map((product) => (
        <ProductCardItem key={product.id} product={product} href={editHref(product.slug)} />
      ))}
    </ul>
  );
}

function CardImage({ product }: { product: CatalogueProduct }) {
  const [failed, setFailed] = useState(false);
  const first = product.images[0];
  if (!first || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-neutral-100 text-neutral-500">
        <Icon name="photo" className="h-7 w-7" />
        <span className="font-ui text-sm">No photograph yet</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={productImageUrl(first.path, 800)}
      alt=""
      width={800}
      height={600}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-500 ease-brand group-hover:scale-[1.03] motion-reduce:transition-none"
    />
  );
}

function ProductCardItem({ product, href }: { product: CatalogueProduct; href: string }) {
  const low = isLowStock(product.stockQuantity, product.lowStockThreshold);
  const out = isOutOfStock(product.stockQuantity);
  const photos = product.images.length;
  const sizes = sizesLabel(product.sizes);

  return (
    <li className="group relative min-w-0 overflow-hidden rounded-card border border-neutral-200 bg-high-vis-white transition-shadow hover:shadow-panel focus-within:shadow-panel">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        <CardImage product={product} />
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          {product.isPublished ? (
            <StatusPill label="Published" tone="positive" />
          ) : (
            <StatusPill label="Draft" tone="muted" />
          )}
          {photos > 1 ? (
            <span className="inline-flex items-center gap-1 rounded-control bg-charcoal/80 px-1.5 py-0.5 font-ui text-xs font-semibold text-high-vis-white">
              <Icon name="photo" className="h-3.5 w-3.5" />
              {photos}
            </span>
          ) : null}
        </div>
      </div>
      <div className="min-w-0 p-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h3 className="min-w-0 font-ui text-sm font-semibold leading-snug text-charcoal [overflow-wrap:anywhere]">
            {/* The link covers the whole card, so a tap anywhere opens the product. */}
            <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {product.name}
            </Link>
          </h3>
          <span aria-hidden className="inline-flex shrink-0 items-center gap-1 font-ui text-xs font-semibold text-neutral-500 group-hover:text-charcoal">
            <Icon name="pencil" className="h-3.5 w-3.5" />
            Edit
          </span>
        </div>
        {product.sku ? <p className="mt-0.5 truncate font-ui text-xs text-neutral-500">{product.sku}</p> : null}
        <p className="mt-2 font-ui text-sm font-semibold tabular-nums text-charcoal">
          {product.priceDisplayMode === 'poa' || product.price == null ? (
            <span className="font-normal text-neutral-500">Price on application</span>
          ) : (
            <>
              {formatPrice(product.price)}
              {product.unit ? <span className="ml-1 font-normal text-neutral-500">{product.unit}</span> : null}
            </>
          )}
        </p>
        {sizes || low || out ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sizes ? <StatusPill label={sizes} tone="neutral" /> : null}
            {low ? <StatusPill label="Low stock" tone="attention" /> : null}
            {out ? <StatusPill label="Out of stock" tone="muted" /> : null}
          </div>
        ) : null}
      </div>
      <span className="sr-only">
        <Link href={href}>Edit {product.name}</Link>
      </span>
    </li>
  );
}
