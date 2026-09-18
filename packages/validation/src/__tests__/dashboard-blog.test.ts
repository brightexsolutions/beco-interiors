import { describe, expect, it } from 'vitest';
import { findBannedBlogCopy, generateBlogDraftSchema, saveBlogPostSchema } from '../dashboard-blog';

const draft = {
  title: 'Sintered stone in Nairobi kitchens',
  slug: 'sintered-stone-nairobi-kitchens',
  excerpt: 'What to specify, and what to ignore.',
  body: '## What it is\n\nSintered stone is fused mineral powder, not a resin composite. Here is how Beco stocks it.',
  category: 'Materials',
  tags: 'sintered stone, kitchens',
  metaTitle: 'Sintered stone kitchens Nairobi',
  metaDescription: 'How to specify sintered stone for a Nairobi kitchen, from finish to slab size.',
  targetTerm: 'sintered stone Nairobi',
  author: 'Irene Kariuki',
  coverImageAlt: '',
  status: 'draft',
};

describe('saveBlogPostSchema', () => {
  it('accepts a draft without cover alt', () => {
    const parsed = saveBlogPostSchema.safeParse(draft);
    expect(parsed.success).toBe(true);
  });

  it('refuses publish without alt, em dashes, and an AI byline', () => {
    expect(saveBlogPostSchema.safeParse({ ...draft, status: 'published' }).success).toBe(false);
    expect(
      saveBlogPostSchema.safeParse({ ...draft, body: `${draft.body} Wait \u2014 no.` }).success,
    ).toBe(false);
    expect(saveBlogPostSchema.safeParse({ ...draft, author: 'Gemini' }).success).toBe(false);
  });
});

describe('findBannedBlogCopy', () => {
  it('rejects delve and tapestry', () => {
    expect(findBannedBlogCopy('Let us delve into stone.')).toBeTruthy();
    expect(findBannedBlogCopy('A tapestry of finishes.')).toBeTruthy();
    expect(findBannedBlogCopy('A worktop in Nairobi.')).toBeNull();
  });
});

describe('generateBlogDraftSchema', () => {
  it('needs a brief and a search term', () => {
    expect(generateBlogDraftSchema.safeParse({ brief: 'Kitchen stone', targetTerm: 'sintered stone' }).success).toBe(
      true,
    );
    expect(generateBlogDraftSchema.safeParse({ brief: 'Hi', targetTerm: 'stone' }).success).toBe(false);
  });
});
