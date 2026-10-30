import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlabToSurface, pairShot } from '../slab-to-surface';
import type { CatalogueProduct } from '@/lib/products';

const img = (path: string, role: 'bookmatch' | 'application' | 'slab') => ({ path, alt: path, width: 1600, height: 1000, role, sort: 0 });

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

  it('cuts a listed stone\'s halves from its slab photograph when it has no bookmatch shot', () => {
    const anakin = {
      ...product, slug: 'anakin', name: 'Anakin',
      images: [img('/anakin/slab', 'slab'), img('/anakin/room', 'application')],
    };
    expect(pairShot(anakin)?.path).toBe('/anakin/slab');
    render(<SlabToSurface product={anakin} />);
    expect(screen.getByText(/Anakin, 12mm\./)).toBeInTheDocument();
  });

  it('never splits an unlisted stone\'s ordinary slab photograph', () => {
    const plain = { ...product, slug: 'plain', images: [img('/plain/slab', 'slab'), img('/plain/room', 'application')] };
    expect(pairShot(plain)).toBeUndefined();
    const { container } = render(<SlabToSurface product={plain} />);
    expect(container.firstChild).toBeNull();
  });

  it('prefers a real bookmatch shot over the slab, even for a listed stone', () => {
    const both = { ...product, slug: 'anakin', images: [img('/a/slab', 'slab'), img('/a/bm', 'bookmatch')] };
    expect(pairShot(both)?.path).toBe('/a/bm');
  });
});
