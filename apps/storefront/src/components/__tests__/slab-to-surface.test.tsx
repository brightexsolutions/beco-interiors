import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlabToSurface } from '../slab-to-surface';
import type { CatalogueProduct } from '@/lib/products';

const img = (path: string, role: 'bookmatch' | 'application') => ({ path, alt: path, width: 1600, height: 1000, role, sort: 0 });

const product: CatalogueProduct = {
  id: 'p1', slug: 'bianco-fendi', name: 'Bianco Fendi', price: null, compare_at_price: null, price_display_mode: 'poa',
  availability: 'in_stock', stock_quantity: null, face_type: null, unit: null, badge: null,
  images: [img('/bianco-fendi/bookmatch', 'bookmatch'), img('/bianco-fendi/kitchen', 'application')],
};

describe('SlabToSurface', () => {
  it('renders nothing without both a bookmatch and a room', () => {
    const { container } = render(<SlabToSurface product={{ ...product, images: [img('/x', 'bookmatch')] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('gives the parting frame the card corner, and clips the moving halves to it (D125)', () => {
    const { container } = render(<SlabToSurface product={product} />);
    // The frame is the element holding the room and the two halves.
    const frame = container.querySelector('.beco-room')?.parentElement;
    expect(frame).not.toBeNull();
    expect(frame).toHaveClass('rounded-card', 'overflow-hidden', 'isolate');
  });

  it('sends "All bookmatched stone" to the bookmatched stones, not the whole shop', () => {
    render(<SlabToSurface product={product} />);
    expect(screen.getByRole('link', { name: 'All bookmatched stone' })).toHaveAttribute(
      'href',
      '/shop/sintered-stone?face=bookmatched',
    );
  });
});

