import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { StaffBlogPost } from '@/lib/blog';

vi.mock('next/navigation', () => ({
  usePathname: () => '/studio/blog',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const { BlogResults } = await import('../blog-results');

const post: StaffBlogPost = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Sintered stone in Nairobi',
  slug: 'sintered-stone-nairobi',
  excerpt: null,
  body: 'Body of the article about stone.',
  coverImage: null,
  coverImageAlt: null,
  category: 'Materials',
  tags: [],
  metaTitle: null,
  metaDescription: null,
  targetTerm: 'sintered stone Nairobi',
  readingTime: 4,
  status: 'draft',
  publishedAt: null,
  author: 'Irene Kariuki',
  generatedByModel: null,
  generationPrompt: null,
  updatedAt: '2026-09-18T08:00:00.000Z',
};

describe('BlogResults', () => {
  it('names Actions and Edit', () => {
    render(<BlogResults posts={[post]} />);
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Edit Sintered stone in Nairobi' });
    expect(links[0]).toHaveAttribute('href', '/studio/blog/11111111-1111-4111-8111-111111111111');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<BlogResults posts={[post]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
