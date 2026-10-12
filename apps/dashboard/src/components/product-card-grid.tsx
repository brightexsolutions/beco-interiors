'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon, StatusPill, cn, formatPrice } from '@beco/ui';
import {
  isLowStock,
  isOutOfStock,
  productAvailabilityLabel,
  productImageUrl,
  sizesLabel,
  type CatalogueProduct,
} from '@/lib/products';

/**
 * The catalogue as cards, D138: the photograph leads, then the name, the
 * range and code, a line of the short description, the price and where it
 * stands. Enough to recognise the product; everything else is in the editor
 * the card opens. Four across on a wide screen, two on a tablet, one on a
 * phone, every frame the same 4:3 so the grid never shifts.
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
        'grid min-w-0 grid-cols-1 gap-4 transition-opacity duration-200 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
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
  const meta = [product.sku, product.categoryName].filter(Boolean).join(' · ');
  const low = isLowStock(product.stockQuantity, product.lowStockThreshold);
  const out = isOutOfStock(product.stockQuantity);
  const photos = product.images.length;
  const sizes = sizesLabel(product.sizes);

  return (
    <li className="group relative min-w-0 overflow-hidden rounded-card border border-neutral-200 bg-high-vis-white transition-shadow hover:shadow-panel focus-within:shadow-panel">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        <CardImage product={product} />
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {product.isPublished ? (
            <StatusPill label="Published" tone="positive" />
          ) : (
            <StatusPill label="Draft" tone="muted" />
          )}
          {photos > 1 ? (
            <span className="inline-flex items-center gap-1 rounded-control bg-charcoal/80 px-2 py-1 font-ui text-xs font-semibold text-high-vis-white">
              <Icon name="photo" className="h-3.5 w-3.5" />
              {photos}
            </span>
          ) : null}
        </div>
      </div>
      <div className="min-w-0 p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <h3 className="min-w-0 font-ui text-base font-semibold leading-snug text-charcoal [overflow-wrap:anywhere]">
            {/* The link covers the whole card, so a tap anywhere opens the product. */}
            <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {product.name}
            </Link>
          </h3>
          <span
            aria-hidden
            className="inline-flex shrink-0 items-center gap-1 font-ui text-sm font-semibold uppercase tracking-[0.09em] text-charcoal"
          >
            <Icon name="pencil" />
            Edit
          </span>
        </div>
        {meta ? <p className="mt-0.5 truncate font-ui text-sm text-neutral-500">{meta}</p> : null}
        {product.shortDescription ? (
          <p className="mt-2 line-clamp-2 font-ui text-sm leading-snug text-neutral-700">{product.shortDescription}</p>
        ) : (
          <p className="mt-2 font-ui text-sm text-neutral-500">No short description yet.</p>
        )}
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="font-ui text-base font-semibold tabular-nums text-charcoal">
            {product.priceDisplayMode === 'poa' || product.price == null ? (
              <span className="font-normal text-neutral-500">Price on application</span>
            ) : (
              <>
                {formatPrice(product.price)}
                {product.unit ? <span className="ml-1 font-normal text-neutral-500">{product.unit}</span> : null}
              </>
            )}
          </p>
          <p className="font-ui text-sm text-neutral-500">
            {productAvailabilityLabel(product)}
            {product.stockQuantity != null ? <span className="ml-1 tabular-nums">· {product.stockQuantity}</span> : null}
          </p>
        </div>
        {low || out || sizes ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {low ? <StatusPill label="Low stock" tone="attention" /> : null}
            {out ? <StatusPill label="Out of stock" tone="muted" /> : null}
            {sizes ? <StatusPill label={sizes} tone="neutral" /> : null}
          </div>
        ) : null}
      </div>
      <span className="sr-only">
        <Link href={href}>Edit {product.name}</Link>
      </span>
    </li>
  );
}
