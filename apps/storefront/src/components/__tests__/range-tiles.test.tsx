import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { CatalogueProduct, CategoryGroup } from '@/lib/products';
import { RangeTiles } from '../range-tiles';

const group = (over: Partial<CategoryGroup>): CategoryGroup =>
  ({ id: over.slug ?? 'g', name: 'Group', slug: 'group', description: null, source_path: null, parent_id: null, product_count: 0, total_count: 0, children: [], ...over }) as CategoryGroup;

const groups = [
  group({ slug: 'hardware', name: 'Hardware', total_count: 6, children: [group({ slug: 'handles', name: 'Handles', total_count: 6 })] }),
  group({ slug: 'sintered-stone', name: 'Sintered Stone', total_count: 24, children: [group({ slug: '12mm', total_count: 16 }), group({ slug: '15mm', total_count: 8 })] }),
  group({ slug: 'flooring', name: 'Flooring', total_count: 0 }),
  group({ slug: 'drawer-rails', name: 'Drawer Rails', total_count: 3 }),
];

describe('RangeTiles', () => {
  it('shows the ranges Beco deals in, in their order, each a link to its own page, and never a loose folder', () => {
    render(<RangeTiles groups={groups} products={[] as CatalogueProduct[]} />);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/shop/sintered-stone', '/shop/flooring', '/shop/hardware']);
    expect(screen.queryByText('Drawer Rails')).toBeNull();
  });

  it('states the stock and the ranges beneath, and says when a range is still being photographed', () => {
    render(<RangeTiles groups={groups} products={[] as CatalogueProduct[]} />);
    expect(screen.getByText('24 in stock, 2 ranges')).toBeInTheDocument();
    expect(screen.getByText('6 in stock, 1 range')).toBeInTheDocument();
    expect(screen.getByText('Being photographed')).toBeInTheDocument();
  });

  it('renders nothing when none of the known ranges exist yet', () => {
    const { container } = render(<RangeTiles groups={[group({ slug: 'misc' })]} products={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<RangeTiles groups={groups} products={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
