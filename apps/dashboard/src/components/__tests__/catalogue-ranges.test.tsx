import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { CategoryGroupRow, CategoryRow } from '@/lib/categories';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/products',
  useSearchParams: () => params,
}));

const editorMounts = vi.fn();
vi.mock('@/components/category-editor', () => ({
  CategoryEditor: ({ category }: { category: CategoryRow }) => {
    useEffect(() => editorMounts(), []);
    return <p>Editing {category.name}</p>;
  },
}));

vi.mock('@/components/category-create', () => ({
  CategoryCreate: () => <p>Creating range</p>,
}));

const { CatalogueRanges } = await import('../catalogue-ranges');

const range = (over: Partial<CategoryGroupRow> = {}): CategoryGroupRow => ({
  id: 'range-1',
  name: 'Limestone',
  slug: 'limestone',
  description: null,
  metaTitle: null,
  metaDescription: null,
  depth: 2,
  parentId: 'group-1',
  parentName: 'Sintered Stone',
  sortOrder: 10,
  isPublished: true,
  productCount: 4,
  childCount: 0,
  updatedAt: '2026-09-23T10:00:00.000Z',
  children: [],
  ...over,
});

const group = (over: Partial<CategoryGroupRow> = {}): CategoryGroupRow => ({
  id: 'group-1',
  name: 'Sintered Stone',
  slug: 'sintered-stone',
  depth: 1,
  description: null,
  metaTitle: null,
  metaDescription: null,
  parentId: null,
  parentName: null,
  sortOrder: 10,
  isPublished: true,
  productCount: 4,
  childCount: 1,
  updatedAt: '2026-09-23T10:00:00.000Z',
  children: [range()],
  ...over,
});

describe('CatalogueRanges, the range browser (D114)', () => {
  beforeEach(() => {
    params = new URLSearchParams();
    push.mockClear();
  });

  const sub = () => range({ id: 'sub-1', name: 'Heixin 12mm', slug: 'heixin-12mm', depth: 3, parentId: 'range-1', parentName: 'Limestone', productCount: 5 });
  const deep = () => [group({ productCount: 0, children: [range({ productCount: 4, childCount: 1, children: [sub()] })] })];

  it('keeps the open range editor mounted across an updatedAt change, so a save keeps its toast and close (D117)', () => {
    editorMounts.mockClear();
    const editing = range();
    const { rerender } = render(<CatalogueRanges tree={deep()} groupOptions={[]} editing={editing} creating={false} selectedId="range-1" />);
    rerender(<CatalogueRanges tree={deep()} groupOptions={[]} editing={range({ updatedAt: '2026-10-04T12:00:00.000Z' })} creating={false} selectedId="range-1" />);
    expect(editorMounts).toHaveBeenCalledTimes(1);
  });

  it('opens on the major categories alone, each counting its whole subtree', () => {
    render(<CatalogueRanges tree={deep()} groupOptions={[]} editing={null} creating={false} selectedId={null} />);
    const categories = screen.getByRole('group', { name: 'Categories' });
    expect(within(categories).getByRole('button', { name: /Sintered Stone/ })).toHaveTextContent('9');
    expect(within(categories).getByRole('button', { name: 'All products 9' })).toHaveAttribute('aria-pressed', 'true');
    // The ranges under it are not drawn until it is opened.
    expect(screen.queryByRole('button', { name: /Limestone/ })).toBeNull();
    expect(screen.queryByRole('group', { name: /Ranges in/ })).toBeNull();
  });

  it('opens a category into a second row of its ranges, and a range into its sub ranges', () => {
    render(<CatalogueRanges tree={deep()} groupOptions={[]} editing={null} creating={false} selectedId="range-1" />);
    const ranges = screen.getByRole('group', { name: 'Ranges in Sintered Stone' });
    expect(within(ranges).getByRole('button', { name: /Limestone/ })).toHaveAttribute('aria-pressed', 'true');
    const subs = screen.getByRole('group', { name: 'Ranges in Limestone' });
    expect(within(subs).getByRole('button', { name: /Heixin 12mm/ })).toHaveTextContent('5');
    // The category stays marked open on the first row.
    expect(screen.getByRole('button', { name: /Sintered Stone/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('filters the product list by pushing ?category= when a pill is tapped, never opening the sheet', async () => {
    const user = userEvent.setup();
    render(<CatalogueRanges tree={deep()} groupOptions={[]} editing={null} creating={false} selectedId="group-1" />);
    await user.click(screen.getByRole('button', { name: /Limestone/ }));
    expect(push).toHaveBeenCalledWith('/products?category=range-1');
    expect(screen.queryByText('Editing Limestone')).not.toBeInTheDocument();
  });

  it('returns to everything from All products, and to the category from the row\'s own All', async () => {
    const user = userEvent.setup();
    render(<CatalogueRanges tree={deep()} groupOptions={[]} editing={null} creating={false} selectedId="range-1" />);
    await user.click(screen.getByRole('button', { name: 'All products 9' }));
    expect(push).toHaveBeenCalledWith('/products');
    await user.click(within(screen.getByRole('group', { name: 'Ranges in Sintered Stone' })).getByRole('button', { name: 'All 9' }));
    expect(push).toHaveBeenCalledWith('/products?category=group-1');
  });

  it('names where you are with a path and a count, and offers Edit and Add only for the selection', () => {
    render(<CatalogueRanges tree={deep()} groupOptions={[]} editing={null} creating={false} selectedId="range-1" />);
    expect(screen.getByText('Limestone', { selector: 'span.font-semibold' })).toBeInTheDocument();
    expect(screen.getByText(/9 products/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Limestone' })).toHaveAttribute('href', '/products?range=range-1');
    expect(screen.getByRole('link', { name: 'Add a range under Limestone' })).toHaveAttribute('href', '/products?newRange=1&parent=range-1');
    // No pencil on every pill any more.
    expect(screen.queryByRole('link', { name: 'Edit Sintered Stone' })).toBeNull();
  });

  it('offers no Add under a sub range, the third and last level', () => {
    render(<CatalogueRanges tree={deep()} groupOptions={[]} editing={null} creating={false} selectedId="sub-1" />);
    expect(screen.getByRole('link', { name: 'Edit Heixin 12mm' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Add a range under/ })).toBeNull();
  });

  it('keeps New category in the heading, at ?newRange=1 with no parent', () => {
    render(<CatalogueRanges tree={deep()} groupOptions={[]} editing={null} creating selectedId={null} />);
    expect(screen.getByRole('link', { name: /New category/ })).toHaveAttribute('href', '/products?newRange=1');
    expect(screen.getByText('Creating range')).toBeInTheDocument();
  });

  it('opens the editor for the range identified by the URL', () => {
    render(<CatalogueRanges tree={deep()} groupOptions={[]} editing={range()} creating={false} selectedId={null} />);
    expect(screen.getByText('Editing Limestone')).toBeInTheDocument();
  });

  it('marks a draft range apart from a published one, in the pill and in the path', () => {
    const tree = [group({ children: [range({ isPublished: false })] })];
    const closed = render(<CatalogueRanges tree={tree} groupOptions={[]} editing={null} creating={false} selectedId="group-1" />);
    const pill = screen.getByRole('button', { name: /Limestone/ });
    expect(pill).toHaveAccessibleName(/draft/i);
    expect(pill.className).toContain('border-dashed');
    closed.unmount();
    render(<CatalogueRanges tree={tree} groupOptions={[]} editing={null} creating={false} selectedId="range-1" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('names the empty state when there are no ranges yet', () => {
    render(<CatalogueRanges tree={[]} groupOptions={[]} editing={null} creating={false} selectedId={null} />);
    expect(screen.getByText(/no ranges yet/i)).toBeInTheDocument();
  });

  it('has no accessibility violations, closed and opened', async () => {
    const closed = render(<CatalogueRanges tree={deep()} groupOptions={[]} editing={null} creating={false} selectedId={null} />);
    expect(await axe(closed.container)).toHaveNoViolations();
    closed.unmount();
    const opened = render(<CatalogueRanges tree={deep()} groupOptions={[]} editing={null} creating={false} selectedId="range-1" />);
    expect(await axe(opened.container)).toHaveNoViolations();
  });
});
