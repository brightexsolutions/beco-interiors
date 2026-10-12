import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const saveBlogPost = vi.fn(async () => ({ ok: 'Draft saved.', postId: '11111111-1111-4111-8111-111111111111' }));
const generateBlogDraft = vi.fn(async () => ({ ok: 'Draft generated. Read it, then save.' }));
vi.mock('@/app/(app)/studio/blog/actions', () => ({
  saveBlogPost: (...a: Parameters<typeof saveBlogPost>) => saveBlogPost(...a),
  generateBlogDraft: (...a: Parameters<typeof generateBlogDraft>) => generateBlogDraft(...a),
  uploadBlogCover: vi.fn(async () => ({ ok: 'Cover uploaded.' })),
  removeBlogCover: vi.fn(async () => ({ ok: 'Cover removed.' })),
}));

const { BlogEditor } = await import('../blog-editor');
import type { StaffBlogPost } from '@/lib/blog';

const post = (over: Partial<StaffBlogPost> = {}): StaffBlogPost => ({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Sintered Stone in Kenya',
  slug: 'sintered-stone-kenya',
  excerpt: null,
  body: 'Sintered stone is fused mineral powder.',
  coverImage: null,
  coverImageAlt: null,
  category: null,
  tags: [],
  metaTitle: null,
  metaDescription: null,
  targetTerm: 'sintered stone Kenya',
  readingTime: 1,
  status: 'draft',
  publishedAt: null,
  author: 'Brown',
  generatedByModel: null,
  generationPrompt: null,
  updatedAt: '2026-10-12T10:00:00.000Z',
  ...over,
});

describe('BlogEditor', () => {
  it('generates, previews, and saves a draft', async () => {
    const user = userEvent.setup();
    render(<BlogEditor post={null} defaultAuthor="Brown" />);
    await user.type(screen.getByLabelText('Brief'), 'Kitchen worktops in Nairobi');
    await user.type(screen.getByLabelText('Target search term'), 'sintered stone Nairobi');
    await user.click(screen.getByRole('button', { name: 'Generate' }));
    expect(generateBlogDraft).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByRole('article')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.type(screen.getByLabelText('Title'), 'Kitchen worktops in Nairobi');
    await user.type(screen.getByLabelText('Body'), 'Sintered stone is fused mineral powder, not a resin composite. Beco stocks it.');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(saveBlogPost).toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<BlogEditor post={null} defaultAuthor="Brown" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  describe('the editor bar, D147', () => {
    it('switches Edit and Preview as one pressed pair, apart from the actions', async () => {
      const user = userEvent.setup();
      render(<BlogEditor post={post()} defaultAuthor="Brown" />);
      const mode = screen.getByRole('group', { name: 'Mode' });
      expect(within(mode).getByRole('button', { name: 'Edit' })).toHaveAttribute('aria-pressed', 'true');
      expect(within(mode).queryByRole('button', { name: /Save/ })).toBeNull();
      await user.click(within(mode).getByRole('button', { name: 'Preview' }));
      expect(within(mode).getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.queryByLabelText('Title')).toBeNull();
      // Save stays reachable from the bar while previewing.
      expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument();
    });

    it('says Draft and offers Publish beside Save, which asks before it publishes', async () => {
      const user = userEvent.setup();
      saveBlogPost.mockClear();
      render(<BlogEditor post={post()} defaultAuthor="Brown" />);
      const bar = document.querySelector('[data-editor-bar]') as HTMLElement;
      expect(bar).toHaveClass('lg:sticky', 'lg:top-[var(--shell-top)]');
      expect(bar).not.toHaveClass('sticky');
      expect(within(bar).getByText('Draft')).toBeInTheDocument();
      await user.click(within(bar).getByRole('button', { name: 'Publish' }));
      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toHaveTextContent('Publish Sintered Stone in Kenya?');
      await user.click(within(dialog).getByRole('button', { name: 'Publish article' }));
      expect(saveBlogPost).toHaveBeenCalled();
      const sent = saveBlogPost.mock.calls.at(-1)?.[1] as unknown as FormData;
      expect(sent.get('status')).toBe('published');
    });

    it('says Published, offers Unpublish and saves without calling it a draft', () => {
      render(<BlogEditor post={post({ status: 'published', publishedAt: '2026-10-01T00:00:00.000Z' })} defaultAuthor="Brown" />);
      const bar = document.querySelector('[data-editor-bar]') as HTMLElement;
      expect(within(bar).getByText('Published')).toBeInTheDocument();
      expect(within(bar).getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
      expect(within(bar).getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(within(bar).queryByRole('button', { name: 'Publish' })).toBeNull();
    });

    it('offers no Publish on an article that has never been saved', () => {
      render(<BlogEditor post={null} defaultAuthor="Brown" />);
      const bar = document.querySelector('[data-editor-bar]') as HTMLElement;
      expect(within(bar).queryByRole('button', { name: 'Publish' })).toBeNull();
    });

    it('frames each part of the article in its own panel', () => {
      render(<BlogEditor post={post()} defaultAuthor="Brown" />);
      for (const name of ['Article', 'Generate', 'Search', 'Cover']) {
        expect(screen.getByRole('heading', { name })).toBeInTheDocument();
      }
    });
  });
});
