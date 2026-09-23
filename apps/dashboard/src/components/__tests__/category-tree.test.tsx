import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { CategoryGroupRow, CategoryRow } from '@/lib/categories';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/categories',
  useSearchParams: () => params,
}));

vi.mock('@/components/category-editor', () => ({
  CategoryEditor: ({ category }: { category: CategoryRow }) => <p>Editing {category.name}</p>,
}));

vi.mock('@/components/category-create', () => ({
  CategoryCreate: () => <p>Creating range</p>,
}));

const { CategoryTree } = await import('../category-tree');

const range = (over: Partial<CategoryRow> = {}): CategoryRow => ({
  id: 'range-1',
  name: 'Limestone',
  slug: 'limestone',
  description: null,
  metaTitle: null,
  metaDescription: null,
  parentId: 'group-1',
  parentName: 'Sintered Stone',
  sortOrder: 10,
  isPublished: true,
  productCount: 4,
  childCount: 0,
  updatedAt: '2026-09-23T10:00:00.000Z',
  ...over,
});

const group = (over: Partial<CategoryGroupRow> = {}): CategoryGroupRow => ({
  id: 'group-1',
  name: 'Sintered Stone',
  slug: 'sintered-stone',
  description: null,
  metaTitle: null,
  metaDescription: null,
  parentId: null,
  parentName: null,
  sortOrder: 10,
  isPublished: true,
  productCount: 0,
  childCount: 1,
  updatedAt: '2026-09-23T10:00:00.000Z',
  children: [range()],
  ...over,
});

describe('CategoryTree', () => {
  it('shows every group and the ranges filed under it', () => {
    render(<CategoryTree tree={[group()]} editing={null} creating={false} groupOptions={[]} />);
    expect(screen.getByText('Sintered Stone')).toBeInTheDocument();
    expect(screen.getByText('Limestone')).toBeInTheDocument();
    expect(screen.getByText(/4 products/)).toBeInTheDocument();
  });

  it('names the empty state under a group with no ranges yet', () => {
    render(
      <CategoryTree tree={[group({ children: [] })]} editing={null} creating={false} groupOptions={[]} />,
    );
    expect(screen.getByText(/no ranges filed under this group yet/i)).toBeInTheDocument();
  });

  it('gives every range an explicit Edit link into the sheet', () => {
    render(<CategoryTree tree={[group()]} editing={null} creating={false} groupOptions={[]} />);
    expect(screen.getByRole('link', { name: 'Edit Limestone' })).toHaveAttribute(
      'href',
      '/categories?edit=range-1',
    );
  });

  it('opens the create form when new is on the query string', () => {
    render(<CategoryTree tree={[group()]} editing={null} creating groupOptions={[]} />);
    expect(screen.getByText('Creating range')).toBeInTheDocument();
  });

  it('opens the editor for the range identified by the URL', () => {
    render(<CategoryTree tree={[group()]} editing={range()} creating={false} groupOptions={[]} />);
    expect(screen.getByText('Editing Limestone')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <CategoryTree tree={[group()]} editing={null} creating={false} groupOptions={[]} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
