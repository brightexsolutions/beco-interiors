'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import {
  DataTable,
  EmptyState,
  Pagination,
  Panel,
  Sheet,
  StatusPill,
  buttonClasses,
  cn,
  paginate,
  type DataTableColumn,
} from '@beco/ui';
import { ProductEditor } from '@/components/product-editor';
import { ProductCreate } from '@/components/product-create';
import {
  isLowStock,
  productAvailabilityLabel,
  type CatalogueProduct,
  type ProductCategoryOption,
} from '@/lib/products';

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

function PriceCell({ product }: { product: CatalogueProduct }) {
  if (product.priceDisplayMode === 'poa' || product.price == null) {
    return <span className="text-neutral-500">Price on application</span>;
  }
  return <span className="tabular-nums">{money(product.price)}</span>;
}

function StockCell({ product }: { product: CatalogueProduct }) {
  if (product.stockQuantity == null) return <span className="text-neutral-500">Uncounted</span>;
  return <span className="tabular-nums">{product.stockQuantity}</span>;
}

function FlagCell({ product }: { product: CatalogueProduct }) {
  if (isLowStock(product.stockQuantity, product.lowStockThreshold)) {
    return <StatusPill label="Low stock" tone="attention" />;
  }
  if (!product.isPublished) return <StatusPill label="Draft" tone="muted" />;
  return <span className="text-neutral-500">—</span>;
}

const desktopColumns = (editHref: (slug: string) => string): DataTableColumn<CatalogueProduct>[] => [
  {
    key: 'name',
    header: 'Product',
    sortable: true,
    sortValue: (product) => product.name,
    render: (product) => (
      <div>
        <p className="font-semibold text-charcoal">{product.name}</p>
        {product.categoryName ? <p className="text-neutral-500">{product.categoryName}</p> : null}
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
    render: (product) => <PriceCell product={product} />,
  },
  {
    key: 'stock',
    header: 'Stock',
    align: 'right',
    sortable: true,
    sortValue: (product) => product.stockQuantity ?? -1,
    render: (product) => <StockCell product={product} />,
  },
  {
    key: 'flag',
    header: 'Flag',
    render: (product) => <FlagCell product={product} />,
  },
  {
    key: 'edit',
    header: 'Edit',
    align: 'right',
    render: (product) => (
      <Link
        href={editHref(product.slug)}
        aria-label={`Edit ${product.name}`}
        className={cn(buttonClasses({ variant: 'ghost' }), 'h-11 px-3 py-0')}
      >
        Edit
      </Link>
    ),
  },
];

const mobileColumns = (editHref: (slug: string) => string): DataTableColumn<CatalogueProduct>[] => [
  {
    key: 'name',
    header: 'Product',
    render: (product) => <span className="font-semibold text-charcoal">{product.name}</span>,
  },
  {
    key: 'availability',
    header: 'Availability',
    render: (product) => productAvailabilityLabel(product),
  },
  {
    key: 'stock',
    header: 'Stock',
    align: 'right',
    render: (product) => <StockCell product={product} />,
  },
  {
    key: 'edit',
    header: 'Edit',
    align: 'right',
    render: (product) => (
      <Link
        href={editHref(product.slug)}
        aria-label={`Edit ${product.name}`}
        className={cn(buttonClasses({ variant: 'ghost' }), 'h-11 px-3 py-0')}
      >
        Edit
      </Link>
    ),
  },
];

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
  const [, startTransition] = useTransition();
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

  const sheet = (
    <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeSheet()} title={sheetTitle}>
      {creating ? (
        <ProductCreate categories={categories} returnTo={withParam('new', null)} />
      ) : editing ? (
        <ProductEditor
          key={`${editing.id}-${editing.updatedAt}`}
          product={editing}
          categories={categories}
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
      <Panel>
        <div className="px-4 py-2 lg:hidden">
          <DataTable
            caption={`${paged.total} products`}
            columns={mobileColumns(editHref)}
            rows={paged.items}
            getRowKey={(product) => product.id}
          />
        </div>
        <div className="hidden px-5 py-2 lg:block">
          <DataTable
            caption={`${paged.total} products`}
            columns={desktopColumns(editHref)}
            rows={paged.items}
            getRowKey={(product) => product.id}
          />
        </div>
      </Panel>

      <Pagination
        className="mt-4"
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
