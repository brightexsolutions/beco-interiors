import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { BlogSidebar } from '../blog-sidebar';
import type { BlogCategoryFacet } from '@/lib/blog';

const CATEGORIES: BlogCategoryFacet[] = [
  { name: 'Applications', count: 1 },
  { name: 'Guides', count: 1 },
  { name: 'Materials', count: 1 },
];

describe('BlogSidebar', () => {
  it('lists every category with its real count, and a link back to everything', () => {
    render(<BlogSidebar categories={CATEGORIES} />);
    expect(screen.getByRole('link', { name: 'All articles' })).toHaveAttribute('href', '/blog');
    for (const c of CATEGORIES) {
      const link = screen.getByRole('link', { name: new RegExp(c.name) });
      expect(link).toHaveAttribute('href', `/blog?category=${encodeURIComponent(c.name)}`);
      expect(link).toHaveTextContent(String(c.count));
    }
  });

  it('marks "All articles" current when no category is active', () => {
    render(<BlogSidebar categories={CATEGORIES} />);
    expect(screen.getByRole('link', { name: 'All articles' })).toHaveAttribute('aria-current', 'page');
  });

  it('marks the active category current instead, once one is set', () => {
    render(<BlogSidebar categories={CATEGORIES} activeCategory="Guides" />);
    expect(screen.getByRole('link', { name: 'All articles' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /Guides/ })).toHaveAttribute('aria-current', 'page');
  });

  it('renders no category nav at all when there are no categories yet', () => {
    render(<BlogSidebar categories={[]} />);
    expect(screen.queryByRole('navigation', { name: 'Blog categories' })).toBeNull();
  });

  it('always carries the shop promo, with a real link to the shop', () => {
    render(<BlogSidebar categories={[]} />);
    expect(screen.getByRole('link', { name: /shop the range/i })).toHaveAttribute('href', '/shop');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<BlogSidebar categories={CATEGORIES} activeCategory="Guides" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
