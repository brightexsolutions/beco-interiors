import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { RoomStack } from '../room-stack';
import type { CatalogueProduct } from '@/lib/products';
import type { ProductImage } from '@beco/types';

const image = (role: ProductImage['role'], path = '/x.jpg'): ProductImage => ({
  role, path, alt: 'A room', width: 1600, height: 2000, sort: 0,
});

const product = (
  slug: string,
  name: string,
  images: ProductImage[],
): CatalogueProduct => ({
  id: slug, slug, name, images,
  price: null, compare_at_price: null, price_display_mode: 'poa',
  availability: 'poa', face_type: null, unit: null, badge: null,
});

describe('RoomStack (storefront wrapper)', () => {
  it('picks each product\'s application shot, and only that role', () => {
    const products = [
      product('a', 'Amber Jade', [image('slab'), image('application', '/a-room.jpg')]),
      product('b', 'Pure White', [image('application', '/b-room.jpg'), image('bookmatch')]),
    ];
    const { container } = render(<RoomStack products={products} />);
    // next/image rewrites src through its own proxy, so this checks the
    // ORIGINAL path is the one asked for rather than the literal attribute.
    const sources = Array.from(container.querySelectorAll('img')).map((img) => img.src);
    expect(sources.some((src) => src.includes(encodeURIComponent('/a-room.jpg')))).toBe(true);
    expect(sources.some((src) => src.includes(encodeURIComponent('/b-room.jpg')))).toBe(true);
  });

  it('skips a product with no application shot rather than substituting another role', () => {
    const products = [
      product('a', 'Amber Jade', [image('slab')]),
      product('b', 'Pure White', [image('application')]),
      product('c', 'Onyx Black', [image('application')]),
    ];
    render(<RoomStack products={products} />);
    // Two real cards, not three: Amber Jade never appears as a caption.
    expect(screen.queryByText('Amber Jade')).toBeNull();
    expect(screen.getByText('Pure White')).toBeInTheDocument();
    expect(screen.getByText('Onyx Black')).toBeInTheDocument();
  });

  it('caps at four cards even when more products qualify', () => {
    const products = ['a', 'b', 'c', 'd', 'e'].map((slug) =>
      product(slug, slug, [image('application')]),
    );
    const { container } = render(<RoomStack products={products} />);
    expect(container.querySelectorAll('figure')).toHaveLength(4);
  });

  it('renders nothing under two qualifying products, same as the design system component', () => {
    const products = [product('a', 'Amber Jade', [image('application')])];
    const { container } = render(<RoomStack products={products} />);
    expect(container.firstChild).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const products = [
      product('a', 'Amber Jade', [image('application')]),
      product('b', 'Pure White', [image('application')]),
    ];
    const { container } = render(<RoomStack products={products} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
