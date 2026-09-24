import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

vi.mock('@/components/category-editor', () => ({
  CategoryEditor: ({ category }: { category: CategoryRow }) => <p>Editing {category.name}</p>,
}));

vi.mock('@/components/category-create', () => ({
  CategoryCreate: () => <p>Creating range</p>,
}));

const { CatalogueRanges } = await import('../catalogue-ranges');

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
  productCount: 4,
  childCount: 1,
  updatedAt: '2026-09-23T10:00:00.000Z',
  children: [range()],
  ...over,
});

describe('CatalogueRanges', () => {
  beforeEach(() => {
    params = new URLSearchParams();
    push.mockClear();
  });

  it('shows every group and the ranges filed under it, each with its product count', () => {
    render(<CatalogueRanges tree={[group()]} groupOptions={[]} editing={null} creating={false} selectedId={null} />);
    expect(screen.getByRole('button', { name: /Sintered Stone/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Limestone/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Limestone/ })).toHaveTextContent('4');
  });

  it('sums a group\'s own children for its count rather than showing its own, since a group with children is never itself assignable', () => {
    // The real shape from fetchCategoryTree: a group WITH children always
    // carries productCount 0 on itself, per groupCategoryOptions's own
    // comment. Showing that 0 beside 26 real products one line down read as
    // the group having nothing in it, which was wrong.
    render(
      <CatalogueRanges
        tree={[
          group({
            productCount: 0,
            children: [range({ id: 'range-1', name: 'Limestone Ivory', productCount: 25 }), range({ id: 'range-2', name: 'Cyprus Grey', productCount: 1 })],
          }),
        ]}
        groupOptions={[]}
        editing={null}
        creating={false}
        selectedId={null}
      />,
    );
    expect(screen.getByRole('button', { name: /Sintered Stone/ })).toHaveTextContent('26');
  });

  it('orders each group directly before its own ranges, since adjacency is now the only cue that they are related', () => {
    // Regression guard for the flat, single row layout: every pill shares
    // the same form now (Brown's own direction), so there is no box or
    // heading weight left to mark a group's own ranges as its own. Order is
    // the only thing left carrying that relationship, so it has to hold.
    const stone = group({
      id: 'group-stone', name: 'Sintered Stone',
      children: [range({ id: 'range-ivory', name: 'Limestone Ivory', parentId: 'group-stone' })],
    });
    const hardware = group({
      id: 'group-hardware', name: 'Hardware',
      children: [range({ id: 'range-handles', name: 'Handles', parentId: 'group-hardware' })],
    });
    render(<CatalogueRanges tree={[stone, hardware]} groupOptions={[]} editing={null} creating={false} selectedId={null} />);

    const order = screen
      .getAllByRole('button')
      .map((el) => el.textContent)
      .filter((text): text is string => Boolean(text));
    const stoneIndex = order.findIndex((text) => text.includes('Sintered Stone'));
    const ivoryIndex = order.findIndex((text) => text.includes('Limestone Ivory'));
    const hardwareIndex = order.findIndex((text) => text.includes('Hardware'));
    const handlesIndex = order.findIndex((text) => text.includes('Handles'));
    expect(stoneIndex).toBeLessThan(ivoryIndex);
    expect(ivoryIndex).toBeLessThan(hardwareIndex);
    expect(hardwareIndex).toBeLessThan(handlesIndex);
  });

  it('gives a group pill and a range pill the identical form: same button and edit-link pattern, not two different controls', () => {
    render(
      <CatalogueRanges
        tree={[group({ children: [range({ id: 'range-ivory', name: 'Limestone Ivory' })] })]}
        groupOptions={[]}
        editing={null}
        creating={false}
        selectedId={null}
      />,
    );
    const groupButton = screen.getByRole('button', { name: /Sintered Stone/ });
    const rangeButton = screen.getByRole('button', { name: /Limestone Ivory/ });
    // Same element type, same aria-pressed contract, each immediately
    // followed by its own small "Edit" link, exactly like the other. Height
    // itself cannot be asserted in jsdom, which has no layout; className
    // parity is the closest a render test gets to "same form".
    expect(groupButton.tagName).toBe(rangeButton.tagName);
    expect(groupButton.className).toBe(rangeButton.className);
    expect(screen.getByRole('link', { name: 'Edit Sintered Stone' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Limestone Ivory' })).toBeInTheDocument();
  });

  it('collapses and re-expands the whole panel from the "Ranges" heading, hiding the pill row without losing it', async () => {
    const user = userEvent.setup();
    render(<CatalogueRanges tree={[group()]} groupOptions={[]} editing={null} creating={false} selectedId={null} />);
    const toggle = screen.getByRole('button', { name: 'Ranges' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Sintered Stone/ })).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Sintered Stone/ })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Sintered Stone/ })).toBeInTheDocument();
  });

  it('marks a draft range so it reads apart from a published one', () => {
    render(
      <CatalogueRanges
        tree={[group({ children: [range({ isPublished: false })] })]}
        groupOptions={[]}
        editing={null}
        creating={false}
        selectedId={null}
      />,
    );
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('filters the product list by pushing ?category= when a range chip is clicked, not by opening the sheet', async () => {
    const user = userEvent.setup();
    render(<CatalogueRanges tree={[group()]} groupOptions={[]} editing={null} creating={false} selectedId={null} />);
    await user.click(screen.getByRole('button', { name: /Limestone/ }));
    expect(push).toHaveBeenCalledWith('/products?category=range-1');
    expect(screen.queryByText('Editing Limestone')).not.toBeInTheDocument();
  });

  it('marks the selected chip pressed, and clicking it again returns to All products', async () => {
    const user = userEvent.setup();
    render(<CatalogueRanges tree={[group()]} groupOptions={[]} editing={null} creating={false} selectedId="range-1" />);
    expect(screen.getByRole('button', { name: /Limestone/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'All products' }));
    expect(push).toHaveBeenCalledWith('/products');
  });

  it('gives every range an explicit Edit link into the sheet, at ?range= rather than ?edit=', () => {
    render(<CatalogueRanges tree={[group()]} groupOptions={[]} editing={null} creating={false} selectedId={null} />);
    expect(screen.getByRole('link', { name: 'Edit Limestone' })).toHaveAttribute('href', '/products?range=range-1');
  });

  it('opens the create form at ?newRange=1', () => {
    render(<CatalogueRanges tree={[group()]} groupOptions={[]} editing={null} creating selectedId={null} />);
    expect(screen.getByText('Creating range')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New range/ })).toHaveAttribute('href', '/products?newRange=1');
  });

  it('opens the editor for the range identified by the URL', () => {
    render(<CatalogueRanges tree={[group()]} groupOptions={[]} editing={range()} creating={false} selectedId={null} />);
    expect(screen.getByText('Editing Limestone')).toBeInTheDocument();
  });

  it('names the empty state when there are no ranges yet', () => {
    render(<CatalogueRanges tree={[]} groupOptions={[]} editing={null} creating={false} selectedId={null} />);
    expect(screen.getByText(/no ranges yet/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <CatalogueRanges tree={[group()]} groupOptions={[]} editing={null} creating={false} selectedId={null} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
