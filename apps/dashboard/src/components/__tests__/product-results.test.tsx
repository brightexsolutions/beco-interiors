import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { CatalogueProduct } from '@/lib/products';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/products',
  useSearchParams: () => params,
}));

const editorMounts = vi.fn();
vi.mock('@/components/product-editor', () => ({
  ProductEditor: ({ product }: { product: CatalogueProduct }) => {
    useEffect(() => editorMounts(), []);
    return <p>Editing {product.name}</p>;
  },
}));

vi.mock('@/components/product-create', () => ({
  ProductCreate: () => <p>Creating product</p>,
}));

const { ProductResults } = await import('../product-results');

const product = (over: Partial<CatalogueProduct> = {}): CatalogueProduct => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Limestone Ivory',
  slug: 'limestone-ivory',
  sku: null,
  categoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  categoryName: '12mm Sintered Stones',
  categorySlug: '12mm-sintered-stones',
  price: 75000,
  compareAtPrice: null,
  priceDisplayMode: 'fixed',
  availability: 'in_stock',
  badge: null,
  isPublished: true,
  sortOrder: 0,
  shortDescription: null,
  description: null,
  metaTitle: null,
  metaDescription: null,
  specs: [],
  images: [],
  unit: 'per slab',
  stockQuantity: 4,
  lowStockThreshold: 1,
  updatedAt: '2026-09-17T10:00:00.000Z',
  ...over,
});

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('ProductResults', () => {
  it('keeps the open editor mounted when the row it edits gets a new updatedAt, which is what a save does (D117)', () => {
    editorMounts.mockClear();
    const first = product();
    const { rerender } = render(<ProductResults products={[first]} editing={first} creating={false} categories={[]} />);
    const saved = product({ updatedAt: '2026-10-04T12:00:00.000Z' });
    rerender(<ProductResults products={[saved]} editing={saved} creating={false} categories={[]} />);
    expect(screen.getByText('Editing Limestone Ivory')).toBeInTheDocument();
    expect(editorMounts).toHaveBeenCalledTimes(1);
  });

  it('gives every product an explicit Edit action, not a click-anywhere row', () => {
    render(
      <ProductResults
        products={[
          product(),
          product({
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Amber Jade',
            slug: 'amber-jade',
          }),
        ]}
        editing={null}
        creating={false}
        categories={[]}
      />,
    );
    const ivory = screen.getAllByRole('link', { name: /edit limestone ivory/i });
    const amber = screen.getAllByRole('link', { name: /edit amber jade/i });
    expect(ivory.length).toBeGreaterThan(0);
    expect(amber.length).toBeGreaterThan(0);
    for (const link of ivory) {
      expect(link).toHaveAttribute('href', '/products?edit=limestone-ivory');
    }
  });

  it('keeps a sortable table on desktop and cards on a phone, so the list cannot scroll sideways', () => {
    render(<ProductResults products={[product()]} editing={null} creating={false} categories={[]} />);
    expect(screen.getByRole('table', { name: '1 products' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByText('In stock').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/75,000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('12mm Sintered Stones').length).toBeGreaterThan(0);
  });

  it('shows POA rather than inventing a price, and flags low stock', () => {
    render(
      <ProductResults
        products={[
          product({
            priceDisplayMode: 'poa',
            price: null,
            stockQuantity: 1,
            lowStockThreshold: 2,
          }),
        ]}
        editing={null}
        creating={false}
        categories={[]}
      />,
    );
    expect(screen.getAllByText('Price on application').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Low stock').length).toBeGreaterThan(0);
  });

  it('shows a supplier code under the product name', () => {
    render(
      <ProductResults
        products={[product({ sku: '537 160 BLACK' })]}
        editing={null}
        creating={false}
        categories={[]}
      />,
    );
    expect(screen.getAllByText(/537 160 BLACK/).length).toBeGreaterThan(0);
  });

  it('opens the editor sheet when a product is being edited', () => {
    render(
      <ProductResults products={[product()]} editing={product()} creating={false} categories={[]} />,
    );
    expect(screen.getByRole('dialog', { name: 'Limestone Ivory' })).toBeInTheDocument();
    expect(screen.getByText('Editing Limestone Ivory')).toBeInTheDocument();
  });

  it('opens a create sheet from ?new=1', () => {
    render(<ProductResults products={[product()]} editing={null} creating categories={[]} />);
    expect(screen.getByRole('dialog', { name: 'New product' })).toBeInTheDocument();
    expect(screen.getByText('Creating product')).toBeInTheDocument();
  });

  it('has no accessibility violations on the list', async () => {
    const { container } = render(
      <ProductResults products={[product()]} editing={null} creating={false} categories={[]} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows a page the server already sliced as it is, with the whole result\'s total, and pages by URL', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    params = new URLSearchParams('category=handles&page=2');
    const onPage = product({ id: '99999999-9999-4999-8999-999999999999', name: 'Ninth Handle', slug: 'ninth-handle' });
    render(
      <ProductResults
        products={[onPage]}
        paging={{ page: 2, pageCount: 3, from: 9, to: 9, total: 17 }}
        editing={null}
        creating={false}
        categories={[]}
      />,
    );
    // Not re-sliced in the browser: page 2 of a one row array would be empty.
    expect(screen.getAllByText('Ninth Handle').length).toBeGreaterThan(0);
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav).toHaveTextContent(/9.9 of 17/);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(push).toHaveBeenCalledWith('/products?category=handles&page=3');
  });
});
