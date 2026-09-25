import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
