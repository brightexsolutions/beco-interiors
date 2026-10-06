import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BlogPostingSchema } from '../page';
import type { BlogPost } from '@/lib/blog';

const post = (overrides: Partial<BlogPost> = {}): BlogPost => ({
  slug: 'sintered-stone-buying-guide',
  title: 'A buyer\'s guide to sintered stone',
  excerpt: 'What to look for, and what the terms mean.',
  cover_image: { path: '/blog/guide.webp', width: 1600, height: 900 },
  cover_image_alt: 'A kitchen worktop in sintered stone',
  category: 'Guides',
  reading_time: 6,
  published_at: '2026-09-01T08:00:00.000Z',
  body: '# Heading\n\nBody.',
  tags: ['sintered stone', 'worktops'],
  target_term: 'sintered stone kenya',
  meta_title: null,
  meta_description: null,
  author: 'Beco Interiors',
  ...overrides,
});

/** Both ld+json blocks the page renders, parsed. */
function parsedSchemas(container: HTMLElement): Record<string, unknown>[] {
  return [...container.querySelectorAll('script[type="application/ld+json"]')].map((s) =>
    JSON.parse(s.textContent ?? '{}'),
  );
}

const blogPostingFrom = (c: HTMLElement) => parsedSchemas(c)[0]!;
const breadcrumbFrom = (c: HTMLElement) => parsedSchemas(c)[1]!;

describe('BlogPostingSchema', () => {
  it('emits valid BlogPosting and BreadcrumbList JSON, and nothing else', () => {
    const { container } = render(<BlogPostingSchema post={post()} />);
    const schemas = parsedSchemas(container);
    expect(schemas).toHaveLength(2);
    expect(schemas.map((s) => s['@type'])).toEqual(['BlogPosting', 'BreadcrumbList']);
    for (const s of schemas) expect(s['@context']).toBe('https://schema.org');
  });

  it('turns a catalogue cover key into an absolute derivative, not a bare key', () => {
    const { container } = render(
      <BlogPostingSchema post={post({ cover_image: { path: '12mm/sandstone-beige/slab-0', width: 1600, height: 900 } })} />,
    );
    const [image] = blogPostingFrom(container).image as string[];
    expect(image).toMatch(/^https?:\/\/.+\/12mm\/sandstone-beige\/slab-0-1600\.webp$/);
  });

  it('names the publisher with its real, absolute logo', () => {
    const { container } = render(<BlogPostingSchema post={post()} />);
    expect(blogPostingFrom(container).publisher).toMatchObject({
      '@type': 'Organization',
      name: 'Beco Interiors',
      logo: { '@type': 'ImageObject', url: 'https://www.beco.co.ke/logo-mark.png', width: 400, height: 390 },
    });
  });

  it('carries the headline, description, absolute image URL and publish date', () => {
    const { container } = render(<BlogPostingSchema post={post()} />);
    const blogPosting = blogPostingFrom(container);
    expect(blogPosting.headline).toBe('A buyer\'s guide to sintered stone');
    expect(blogPosting.description).toBe('What to look for, and what the terms mean.');
    expect(blogPosting.image).toEqual(['https://www.beco.co.ke/blog/guide.webp']);
    expect(blogPosting.datePublished).toBe('2026-09-01T08:00:00.000Z');
    expect(blogPosting.mainEntityOfPage).toMatchObject({
      '@id': 'https://www.beco.co.ke/blog/sintered-stone-buying-guide',
    });
  });

  it('names the author and a publisher, both required for a rich result', () => {
    const { container } = render(<BlogPostingSchema post={post()} />);
    const blogPosting = blogPostingFrom(container);
    expect(blogPosting.author).toMatchObject({ '@type': 'Organization', name: 'Beco Interiors' });
    expect(blogPosting.publisher).toMatchObject({ '@type': 'Organization' });
  });

  it('omits optional keys rather than emitting null when a post lacks them', () => {
    const { container } = render(
      <BlogPostingSchema post={post({ excerpt: null, cover_image: null, published_at: null })} />,
    );
    const blogPosting = blogPostingFrom(container);
    expect(blogPosting).not.toHaveProperty('description');
    expect(blogPosting).not.toHaveProperty('image');
    expect(blogPosting).not.toHaveProperty('datePublished');
  });

  it('builds the three step breadcrumb ending on this post', () => {
    const { container } = render(<BlogPostingSchema post={post()} />);
    const breadcrumb = breadcrumbFrom(container);
    const items = breadcrumb.itemListElement as { position: number; name: string; item: string }[];
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(items[2]).toMatchObject({
      name: 'A buyer\'s guide to sintered stone',
      item: 'https://www.beco.co.ke/blog/sintered-stone-buying-guide',
    });
  });
});
