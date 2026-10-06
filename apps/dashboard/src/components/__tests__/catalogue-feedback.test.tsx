import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CategoryGroupRow } from '@/lib/categories';
import type { CatalogueProduct } from '@/lib/products';

/**
 * The catalogue screen as the page composes it: range pills, filter row and
 * product list under one QueryNavigationProvider. The router's push returns a
 * promise this test resolves by hand, which keeps the transition open the way
 * a slow server render does, so the in-between state can be asserted. D117.
 */
let resolveNavigation: () => void = () => {};
const push = vi.fn(
  () =>
    new Promise<void>((resolve) => {
      resolveNavigation = resolve;
    }),
);
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/products',
  useSearchParams: () => params,
}));
vi.mock('@/components/category-editor', () => ({ CategoryEditor: () => null }));
vi.mock('@/components/category-create', () => ({ CategoryCreate: () => null }));
vi.mock('@/components/product-editor', () => ({ ProductEditor: () => null }));
vi.mock('@/components/product-create', () => ({ ProductCreate: () => null }));

const { QueryNavigationProvider } = await import('@/lib/use-query-navigation');
const { CatalogueRanges } = await import('../catalogue-ranges');
const { ProductFilters } = await import('../product-filters');
const { ProductResults } = await import('../product-results');

const node = (over: Partial<CategoryGroupRow>): CategoryGroupRow => ({
  id: 'x',
  name: 'X',
  slug: 'x',
  description: null,
  metaTitle: null,
  metaDescription: null,
  depth: 1,
  parentId: null,
  parentName: null,
  sortOrder: 0,
  isPublished: true,
  productCount: 0,
  childCount: 0,
  updatedAt: '2026-10-01T10:00:00.000Z',
  children: [],
  ...over,
});

const tree = [
  node({
    id: 'stone',
    name: 'Sintered Stone',
    childCount: 1,
    children: [node({ id: 'twelve', name: '12mm Sintered Stones', depth: 2, parentId: 'stone', parentName: 'Sintered Stone', productCount: 3 })],
  }),
  node({ id: 'handles', name: 'Handles', productCount: 5 }),
];

const product: CatalogueProduct = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Amber Jade',
  slug: 'amber-jade',
  sku: null,
  categoryId: 'twelve',
  categoryName: '12mm Sintered Stones',
  categorySlug: '12mm-sintered-stones',
  price: 65000,
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
  updatedAt: '2026-10-01T10:00:00.000Z',
};

function Screen({ selectedId }: { selectedId: string | null }) {
  return (
    <QueryNavigationProvider>
      <CatalogueRanges tree={tree} groupOptions={[]} editing={null} creating={false} selectedId={selectedId} />
      <ProductFilters />
      <ProductResults products={[product]} editing={null} creating={false} categories={[]} />
    </QueryNavigationProvider>
  );
}

const cardList = () => screen.getAllByRole('list').find((list) => list.className.includes('xl:hidden'))!;

beforeEach(() => {
  push.mockClear();
  params = new URLSearchParams();
});

describe('Catalogue range pills give feedback before the server answers (D117)', () => {
  it('marks the tapped pill active, opens its row and names it in the path, while the navigation is still in flight', async () => {
    const user = userEvent.setup();
    render(<Screen selectedId={null} />);
    const pill = screen.getByRole('button', { name: /^Sintered Stone/ });
    expect(pill).toHaveAttribute('aria-pressed', 'false');

    await user.click(pill);

    expect(push).toHaveBeenCalledWith('/products?category=stone');
    // Still pending: the URL has not changed and the server has not answered.
    expect(pill).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All products 8' })).toHaveAttribute('aria-pressed', 'false');
    // The second row and the Edit line move with it, no wait.
    const subs = screen.getByRole('group', { name: 'Ranges in Sintered Stone' });
    expect(within(subs).getByRole('button', { name: /12mm Sintered Stones/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Sintered Stone' })).toBeInTheDocument();

    await act(async () => resolveNavigation());
  });

  it('dims the product list with aria-busy and shows Busy in the filter row until the navigation lands', async () => {
    const user = userEvent.setup();
    render(<Screen selectedId={null} />);
    expect(cardList()).not.toHaveAttribute('aria-busy');
    expect(screen.queryByText('Updating')).toBeNull();

    await user.click(screen.getByRole('button', { name: /^Handles/ }));

    expect(cardList()).toHaveAttribute('aria-busy', 'true');
    expect(cardList()).toHaveClass('opacity-50');
    expect(screen.getByRole('table').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Updating');

    await act(async () => resolveNavigation());
    await waitFor(() => expect(cardList()).not.toHaveAttribute('aria-busy'));
    expect(screen.queryByText('Updating')).toBeNull();
  });

  it('settles on the URL once the new page arrives', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Screen selectedId={null} />);
    await user.click(screen.getByRole('button', { name: /^Handles/ }));
    params = new URLSearchParams('category=handles');
    rerender(<Screen selectedId="handles" />);
    await act(async () => resolveNavigation());
    expect(screen.getByRole('button', { name: /^Handles/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All products 8' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not navigate again for the pill that is already open', async () => {
    const user = userEvent.setup();
    render(<Screen selectedId="handles" />);
    await user.click(screen.getByRole('button', { name: /^Handles/ }));
    expect(push).not.toHaveBeenCalled();
    expect(cardList()).not.toHaveAttribute('aria-busy');
  });
});
