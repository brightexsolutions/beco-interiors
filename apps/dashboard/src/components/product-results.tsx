'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import {
  DataTable,
  EmptyState,
  Icon,
  Pagination,
  Sheet,
  StatusPill,
  buttonClasses,
  cn,
  formatPrice,
  paginate,
  type DataTableColumn,
} from '@beco/ui';
import { ProductEditor } from '@/components/product-editor';
import { ProductCreate } from '@/components/product-create';
import { ProductThumb } from '@/components/product-thumb';
import {
  isLowStock,
  productAvailabilityLabel,
  type CatalogueProduct,
  type ProductCategoryOption,
} from '@/lib/products';

function PriceLine({ product }: { product: CatalogueProduct }) {
  if (product.priceDisplayMode === 'poa' || product.price == null) {
    return <span className="text-neutral-500">Price on application</span>;
  }
  return <span className="tabular-nums">{formatPrice(product.price)}</span>;
}

function StockLine({ product }: { product: CatalogueProduct }) {
  if (product.stockQuantity == null) return <span className="text-neutral-500">Uncounted</span>;
  return <span className="tabular-nums">{product.stockQuantity}</span>;
}

function FlagRow({ product }: { product: CatalogueProduct }) {
  if (isLowStock(product.stockQuantity, product.lowStockThreshold)) {
    return <StatusPill label="Low stock" tone="attention" />;
  }
  if (!product.isPublished) return <StatusPill label="Draft" tone="muted" />;
  return null;
}

function EditAction({ href, name }: { href: string; name: string }) {
  return (
    <Link
      href={href}
      aria-label={`Edit ${name}`}
      className={cn(buttonClasses({ variant: 'ghost' }), 'h-11 px-3 py-0')}
    >
      <Icon name="pencil" />
      Edit
    </Link>
  );
}

const desktopColumns = (editHref: (slug: string) => string): DataTableColumn<CatalogueProduct>[] => [
  {
    key: 'name',
    header: 'Product',
    sortable: true,
    sortValue: (product) => product.name,
    render: (product) => (
      <div className="flex items-center gap-3">
        <ProductThumb name={product.name} path={product.images[0]?.path} size="sm" />
        <div className="min-w-0">
          <p className="font-semibold text-charcoal">{product.name}</p>
          {product.sku || product.categoryName ? (
            <p className="text-neutral-500">{[product.sku, product.categoryName].filter(Boolean).join(' · ')}</p>
          ) : null}
        </div>
      </div>
    ),
  },
  {
    key: 'availability',
    header: 'Availability',
    render: (product) => productAvailabilityLabel(product),
  },
  {
    key: 'price',
    header: 'Price',
    align: 'right',
    sortable: true,
    sortValue: (product) => product.price ?? -1,
    render: (product) => <PriceLine product={product} />,
  },
  {
    key: 'stock',
    header: 'Stock',
    align: 'right',
    sortable: true,
    sortValue: (product) => product.stockQuantity ?? -1,
    render: (product) => <StockLine product={product} />,
  },
  {
    key: 'status',
    header: 'Status',
    render: (product) => <FlagRow product={product} />,
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    render: (product) => <EditAction href={editHref(product.slug)} name={product.name} />,
  },
];

function ProductCard({ product, href }: { product: CatalogueProduct; href: string }) {
  const meta = [product.sku, product.categoryName].filter(Boolean).join(' · ');
  const flagged =
    isLowStock(product.stockQuantity, product.lowStockThreshold) || !product.isPublished;

  return (
    <li className="min-w-0">
      <Link
        href={href}
        aria-label={`Edit ${product.name}`}
        className="flex min-w-0 gap-3 overflow-hidden rounded-panel border border-neutral-200 bg-high-vis-white p-3 transition-shadow hover:shadow-panel active:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
      >
        <ProductThumb name={product.name} path={product.images[0]?.path} />
        <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 break-words font-ui text-base font-semibold text-charcoal">{product.name}</p>
          <span className="inline-flex shrink-0 items-center gap-1 font-ui text-sm font-semibold uppercase tracking-[0.09em] text-charcoal">
            <Icon name="pencil" />
            Edit
          </span>
        </div>
        {meta ? <p className="mt-0.5 min-w-0 truncate font-ui text-sm text-neutral-500">{meta}</p> : null}
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 font-ui text-base text-charcoal">
            {productAvailabilityLabel(product)}
            <span className="ml-2 text-neutral-500">
              <StockLine product={product} />
            </span>
          </p>
          <p className="shrink-0 font-ui text-base font-semibold text-charcoal">
            <PriceLine product={product} />
          </p>
        </div>
        {flagged ? (
          <div className="mt-2">
            <FlagRow product={product} />
          </div>
        ) : null}
        </div>
      </Link>
    </li>
  );
}

export function ProductResults({
  products,
  editing,
  creating,
  categories,
}: {
  products: CatalogueProduct[];
  editing: CatalogueProduct | null;
  creating: boolean;
  categories: ProductCategoryOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const requestedPage = Number(searchParams.get('page') ?? 1);
  const paged = paginate(products, requestedPage);

  const withParam = (key: string, value: string | null, extraClear: string[] = []) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const clear of extraClear) params.delete(clear);
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const editHref = (slug: string) => withParam('edit', slug, ['new']);

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  const closeSheet = () => {
    startTransition(() => router.push(withParam('edit', null, ['new'])));
  };

  const refresh = () => {
    startTransition(() => router.refresh());
  };

  const sheetOpen = Boolean(editing) || creating;
  const sheetTitle = creating ? 'New product' : (editing?.name ?? 'Product');
  const sheetDescription = creating
    ? 'Unpublished draft. Photographs and availability come next.'
    : editing?.isPublished
      ? 'On the website'
      : 'Draft, hidden on the website';

  const sheet = (
    <Sheet
      open={sheetOpen}
      onOpenChange={(open) => !open && closeSheet()}
      title={sheetTitle}
      description={sheetDescription}
    >
      {creating ? (
        <ProductCreate categories={categories} returnTo={withParam('new', null)} />
      ) : editing ? (
        <ProductEditor
          key={`${editing.id}-${editing.updatedAt}`}
          product={editing}
          categories={categories}
          onSaved={closeSheet}
          onDeleted={closeSheet}
          onImagesChanged={refresh}
        />
      ) : null}
    </Sheet>
  );

  if (products.length === 0) {
    return (
      <>
        <EmptyState
          title="No products here"
          description="Nothing matches this filter yet. Clear search, or create a product."
        />
        {sheet}
      </>
    );
  }

  return (
    <>
      {/* Desktop keeps the sortable table. Phone gets cards so the list
          cannot scroll sideways. Do not collapse desktop to cards. */}
      <div className="hidden min-w-0 xl:block">
        <DataTable
          busy={isPending}
          caption={`${paged.total} products`}
          columns={desktopColumns(editHref)}
          rows={paged.items}
          getRowKey={(product) => product.id}
        />
      </div>

      <ul className="grid min-w-0 grid-cols-1 gap-2 overflow-x-hidden xl:hidden">
        {paged.items.map((product) => (
          <ProductCard key={product.id} product={product} href={editHref(product.slug)} />
        ))}
      </ul>

      <Pagination
        className="mt-4 xl:px-5 xl:pb-4"
        page={paged.page}
        pageCount={paged.pageCount}
        from={paged.from}
        to={paged.to}
        total={paged.total}
        onPageChange={setPage}
      />

      {sheet}
    </>
  );
}
