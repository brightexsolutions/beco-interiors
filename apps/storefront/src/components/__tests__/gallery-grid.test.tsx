import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GalleryGrid } from '../gallery-grid';
import type { GalleryShot } from '@/lib/products';

const shot = (slug: string, siblingCount = 1): GalleryShot => {
  const siblings = Array.from({ length: siblingCount }, (_, i) => ({
    path: `/img/${slug}-${i}.webp`, alt: `${slug} ${i}`, width: 1600, height: 1000,
  }));
  return {
    path: siblings[0]!.path, alt: siblings[0]!.alt, width: 1600, height: 1000,
    productName: slug, productSlug: slug, siblings,
  };
};

describe('GalleryGrid', () => {
  it('gives the most documented real installation its own multi photo feature', () => {
    const projects = [shot('richest', 4), shot('b'), shot('c')];
    render(<GalleryGrid projects={projects} />);
    expect(screen.getByRole('heading', { name: 'richest' })).toBeInTheDocument();
    // Up to three of the feature's own real siblings, not a fourth borrowed
    // from elsewhere.
    expect(screen.getAllByAltText(/^richest /)).toHaveLength(3);
  });

  it('falls the lead back into the plain grid when it has too few siblings for a feature', () => {
    const projects = [shot('only-one-photo', 1), shot('b'), shot('c')];
    render(<GalleryGrid projects={projects} />);
    expect(screen.queryByRole('heading', { name: 'only-one-photo' })).not.toBeInTheDocument();
    expect(screen.getByAltText('only-one-photo 0')).toBeInTheDocument();
  });

  it('shows only a page of the remaining grid, with a real view more button', () => {
    const projects = [shot('lead', 3), ...Array.from({ length: 20 }, (_, i) => shot(`p${i}`))];
    render(<GalleryGrid projects={projects} />);
    expect(screen.getAllByText(/^p\d+$/)).toHaveLength(12);
    expect(screen.getByRole('button', { name: 'View 8 more' })).toBeInTheDocument();
  });

  it('reveals more of the real grid on click, not a decorative count', async () => {
    const user = userEvent.setup();
    const projects = [shot('lead', 3), ...Array.from({ length: 20 }, (_, i) => shot(`p${i}`))];
    render(<GalleryGrid projects={projects} />);
    await user.click(screen.getByRole('button', { name: 'View 8 more' }));
    expect(screen.getAllByText(/^p\d+$/)).toHaveLength(20);
    expect(screen.queryByRole('button', { name: /view.*more/i })).not.toBeInTheDocument();
  });

  it('renders nothing for an empty project list', () => {
    const { container } = render(<GalleryGrid projects={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
