import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompletedInteriors, type SiteShot } from '../completed-interiors';
import type { CatalogueProduct } from '@/lib/products';

const product = (over: Partial<CatalogueProduct> & Pick<CatalogueProduct, 'id' | 'slug'>): CatalogueProduct => ({
  name: over.slug, price: null, compare_at_price: null, price_display_mode: 'poa',
  availability: 'in_stock', face_type: null, unit: null, badge: null, images: [],
  ...over,
});

const img = (path: string) => ({ path, alt: path, width: 1600, height: 1200, role: 'application' as const, sort: 0 });

describe('CompletedInteriors', () => {
  it('renders nothing with fewer than two real photographs to show', () => {
    const { container } = render(<CompletedInteriors products={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('captions a real site shot by room, not by the stone in it', () => {
    const siteShots: SiteShot[] = [
      { image: img('/site-photos/karen-kitchen.webp'), room: 'Kitchen', productSlug: 'cyprus-light-grey' },
      { image: img('/site-photos/karen-vanity.webp'), room: 'Vanity', productSlug: 'sandstone-beige' },
    ];
    render(<CompletedInteriors products={[]} siteShots={siteShots} />);
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Vanity')).toBeInTheDocument();
    expect(screen.queryByText('Cyprus Light Grey')).toBeNull();
  });

  it('links a site shot through to its catalogued stone when one is given', () => {
    const siteShots: SiteShot[] = [
      { image: img('/site-photos/karen-kitchen.webp'), room: 'Kitchen', productSlug: 'cyprus-light-grey' },
      { image: img('/site-photos/karen-vanity.webp'), room: 'Vanity', productSlug: 'sandstone-beige' },
    ];
    render(<CompletedInteriors products={[]} siteShots={siteShots} />);
    expect(screen.getByRole('link', { name: /Kitchen/ })).toHaveAttribute('href', '/product/cyprus-light-grey');
  });

  it('renders a site shot with no matching product honestly, not linked', () => {
    const siteShots: SiteShot[] = [
      { image: img('/site-photos/a.webp'), room: 'Kitchen' },
      { image: img('/site-photos/b.webp'), room: 'Bathroom' },
    ];
    render(<CompletedInteriors products={[]} siteShots={siteShots} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
  });

  it('groups several real photographs of the same room into one card, not one per photograph', () => {
    const siteShots: SiteShot[] = [
      { image: img('/site-photos/kitchen-a.webp'), room: 'Kitchen', productSlug: 'cyprus-light-grey' },
      { image: img('/site-photos/kitchen-b.webp'), room: 'Kitchen' },
      { image: img('/site-photos/vanity-a.webp'), room: 'Vanity', productSlug: 'sandstone-beige' },
    ];
    render(<CompletedInteriors products={[]} siteShots={siteShots} />);
    // One "Kitchen" card, not two, and it carries the hint that hovering
    // reveals the room's other real photograph.
    expect(screen.getAllByText('Kitchen')).toHaveLength(1);
    expect(screen.getByText('hover for more')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Kitchen/ })).toHaveAttribute('href', '/product/cyprus-light-grey');
  });

  it('fills remaining slots with one application shot per product after real site shots', () => {
    const siteShots: SiteShot[] = [
      { image: img('/site-photos/karen-kitchen.webp'), room: 'Kitchen', productSlug: 'cyprus-light-grey' },
    ];
    const products = [
      product({ id: 'p1', slug: 'amber-jade', name: 'Amber Jade', images: [img('/a.webp')] }),
    ];
    render(<CompletedInteriors products={products} siteShots={siteShots} />);
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Amber Jade')).toBeInTheDocument();
  });

  it('falls back to product photographs alone when there are no real site shots', () => {
    const products = [
      product({ id: 'p1', slug: 'amber-jade', name: 'Amber Jade', images: [img('/a.webp')] }),
      product({ id: 'p2', slug: 'bianco-fendi', name: 'Bianco Fendi', images: [img('/b.webp')] }),
    ];
    render(<CompletedInteriors products={products} />);
    expect(screen.getByRole('link', { name: /Amber Jade/ })).toHaveAttribute('href', '/product/amber-jade');
    expect(screen.getByText('Bianco Fendi')).toBeInTheDocument();
  });
});
