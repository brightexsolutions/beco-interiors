import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductGridPaginated } from '../product-grid-paginated';
import type { CatalogueProduct } from '@/lib/products';

const product = (i: number): CatalogueProduct => ({
  id: `id-${i}`,
  slug: `stone-${i}`,
  name: `Stone ${i}`,
  price_display_mode: 'poa',
  price: null,
  compare_at_price: null,
  unit: 'per slab',
  availability: 'in_stock',
  badge: null,
  images: [],
  category: null,
} as unknown as CatalogueProduct);

describe('ProductGridPaginated', () => {
  it('shows only the first page when there are more products than that', () => {
    render(<ProductGridPaginated products={Array.from({ length: 30 }, (_, i) => product(i))} />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(12);
    expect(screen.getByRole('button', { name: 'View 12 more' })).toBeInTheDocument();
  });

  it('reveals another real page of products on click, not a decorative count', async () => {
    const user = userEvent.setup();
    render(<ProductGridPaginated products={Array.from({ length: 30 }, (_, i) => product(i))} />);
    await user.click(screen.getByRole('button', { name: 'View 12 more' }));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(24);
    // Not getByText: the card's name now appears twice, once as the visible
    // heading and once as the sr-only label on the full-card overlay link
    // (see ProductCard's own note on the stretched link fix), so only the
    // heading role names the card unambiguously.
    expect(screen.getByRole('heading', { level: 3, name: 'Stone 12' })).toBeInTheDocument();
  });

  it('shows the exact remaining count on the last page, never an overshoot', async () => {
    const user = userEvent.setup();
    render(<ProductGridPaginated products={Array.from({ length: 20 }, (_, i) => product(i))} />);
    await user.click(screen.getByRole('button', { name: 'View 8 more' }));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(20);
  });

  it('shows no button at all when everything already fits on one page', () => {
    render(<ProductGridPaginated products={Array.from({ length: 6 }, (_, i) => product(i))} />);
    expect(screen.queryByRole('button', { name: /view.*more/i })).not.toBeInTheDocument();
  });
});
