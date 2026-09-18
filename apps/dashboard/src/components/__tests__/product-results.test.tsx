import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { CatalogueProduct } from '@/lib/products';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/products',
  useSearchParams: () => params,
}));

vi.mock('@/components/product-editor', () => ({
  ProductEditor: ({ product }: { product: CatalogueProduct }) => <p>Editing {product.name}</p>,
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
});
