import { afterEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'beco.brightex.dev@gmail.com',
  fullName: 'Brightex Ops',
  role: 'brightex_admin' as const,
  isActive: true,
  mustChangePassword: false,
  canWriteBlog: false,
  canReadAudit: false,
  canManageUsers: false,
}));
vi.mock('@/lib/session', () => ({ requirePath: (...a: Parameters<typeof requirePath>) => requirePath(...a) }));

const maybeSingle = vi.fn();
const insert = vi.fn();
const update = vi.fn();
const from = vi.fn(() => ({
  select: () => ({
    eq: () => ({ maybeSingle }),
    limit: () => ({ data: [], error: null }),
  }),
  insert: (payload: unknown) => {
    insert(payload);
    return { select: () => ({ maybeSingle }) };
  },
  update: (payload: unknown) => {
    update(payload);
    return { eq: () => ({ select: () => ({ maybeSingle }) }) };
  },
}));
vi.mock('@/lib/supabase', () => ({ getSupabase: async () => ({ from }) }));

const revalidateStorefrontPaths = vi.fn();
vi.mock('@/lib/storefront-revalidate', () => ({
  revalidateStorefrontPaths: (...a: Parameters<typeof revalidateStorefrontPaths>) => revalidateStorefrontPaths(...a),
}));
vi.mock('@/lib/blog-generate', () => ({
  draftWithGemini: vi.fn(async () => ({
    draft: {
      title: 'Sintered stone in Nairobi kitchens',
      slug: 'sintered-stone-nairobi-kitchens',
      excerpt: 'What to specify.',
      body: '## What it is\n\nSintered stone is fused mineral powder, not a resin composite. Here is how Beco stocks it in Nairobi.',
      metaTitle: 'Sintered stone kitchens',
      metaDescription: 'How to specify sintered stone.',
      tags: ['stone'],
      category: 'Materials',
      coverImageAlt: 'A kitchen island',
      model: 'gemini-2.0-flash',
    },
  })),
}));
vi.mock('@/lib/product-photo', () => ({
  processProductPhoto: vi.fn(),
}));
vi.mock('@/lib/product-storage', () => ({
  isProductStorageConfigured: () => false,
  uploadProductDerivatives: vi.fn(),
  deleteProductDerivatives: vi.fn(),
}));

const { generateBlogDraft, saveBlogPost } = await import('../actions');

afterEach(() => {
  requirePath.mockClear();
  maybeSingle.mockReset();
  insert.mockReset();
  update.mockReset();
  revalidateStorefrontPaths.mockReset();
});

describe('generateBlogDraft', () => {
  it('re-checks the session and returns a draft', async () => {
    const form = new FormData();
    form.set('brief', 'Kitchen worktops in Nairobi');
    form.set('targetTerm', 'sintered stone Nairobi');
    const result = await generateBlogDraft({}, form);
    expect(requirePath).toHaveBeenCalledWith('/studio/blog');
    expect(result.draft?.title).toMatch(/Sintered stone/);
  });
});

describe('saveBlogPost', () => {
  it('inserts a draft and busts the storefront blog', async () => {
    maybeSingle.mockResolvedValue({
      data: { id: '11111111-1111-4111-8111-111111111111', slug: 'sintered-stone-nairobi-kitchens', status: 'draft' },
      error: null,
    });
    const form = new FormData();
    form.set('title', 'Sintered stone in Nairobi kitchens');
    form.set('slug', 'sintered-stone-nairobi-kitchens');
    form.set('body', '## What it is\n\nSintered stone is fused mineral powder, not a resin composite. Here is how Beco stocks it.');
    form.set('targetTerm', 'sintered stone Nairobi');
    form.set('author', 'Brown');
    form.set('status', 'draft');
    const result = await saveBlogPost({}, form);
    expect(result.ok).toBe('Draft saved.');
    expect(insert).toHaveBeenCalled();
    expect(revalidateStorefrontPaths).toHaveBeenCalledWith(
      ['/blog', '/blog/sintered-stone-nairobi-kitchens'],
      '/studio/blog',
    );
  });
});
