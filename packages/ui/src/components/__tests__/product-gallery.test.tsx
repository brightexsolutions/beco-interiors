import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductGallery, orderImages, type GalleryImage } from '../product-gallery';

const img = (role: GalleryImage['role']): GalleryImage => ({
  role, alt: role, node: <div data-testid={role} />,
});

describe('orderImages', () => {
  it('orders by role, the way a specifier reads a material', () => {
    const out = orderImages([img('application'), img('slab'), img('bookmatch'), img('on_stand')]);
    expect(out.map((i) => i.role)).toEqual(['slab', 'on_stand', 'bookmatch', 'application']);
  });

  it('puts unknown last rather than dropping it', () => {
    const out = orderImages([img('unknown'), img('slab')]);
    expect(out.map((i) => i.role)).toEqual(['slab', 'unknown']);
  });
});

describe('ProductGallery', () => {
  it('reads correctly on THREE images, which a fifth of the catalogue has', () => {
    // Pure White has exactly this: a slab and two applications, no on-stand.
    render(<ProductGallery images={[img('slab'), img('application'), img('application')]} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByText('Full slab')).toBeDefined();
  });

  it('reads correctly on six', () => {
    render(<ProductGallery images={[
      img('slab'), img('on_stand'), img('bookmatch'),
      img('application'), img('application'), img('application'),
    ]} />);
    expect(screen.getAllByRole('tab')).toHaveLength(6);
  });

  it('shows no thumbnail strip for a single image', () => {
    render(<ProductGallery images={[img('slab')]} />);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('renders a page rather than a hole when there are no photographs at all', () => {
    render(<ProductGallery images={[]} />);
    expect(screen.getByRole('img', { name: /no photograph/i })).toBeDefined();
  });

  it('names bookmatching, since most buyers will not know the word', () => {
    render(<ProductGallery images={[img('bookmatch')]} />);
    expect(screen.getByText('Bookmatched pair')).toBeDefined();
  });

  it('labels each thumbnail with its position for screen readers', () => {
    render(<ProductGallery images={[img('slab'), img('application')]} />);
    expect(screen.getByLabelText('Full slab, photograph 1 of 2')).toBeDefined();
  });
});
