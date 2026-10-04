import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { CategoryRow } from '@/lib/categories';
import type { CategoryActionState } from '@/app/(app)/categories/actions';

const updateCategory = vi.fn(async (): Promise<CategoryActionState> => ({ ok: 'Saved.' }));
const deleteCategory = vi.fn(async (): Promise<CategoryActionState> => ({ ok: 'Removed.' }));
vi.mock('@/app/(app)/categories/actions', () => ({
  updateCategory: (...a: Parameters<typeof updateCategory>) => updateCategory(...a),
  deleteCategory: (...a: Parameters<typeof deleteCategory>) => deleteCategory(...a),
}));

const { CategoryEditor } = await import('../category-editor');

const range: CategoryRow = {
  id: 'range-1',
  name: 'Limestone',
  slug: 'limestone',
  description: 'A soft ivory stone.',
  metaTitle: null,
  metaDescription: null,
  parentId: 'group-1',
  parentName: 'Sintered Stone',
  sortOrder: 10,
  isPublished: true,
  productCount: 0,
  depth: 2,
  childCount: 0,
  updatedAt: '2026-09-23T10:00:00.000Z',
};

describe('CategoryEditor', () => {
  it('saves an edit through updateCategory', async () => {
    const user = userEvent.setup();
    render(<CategoryEditor category={range} groupOptions={[]} />);
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Limestone Ivory');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateCategory).toHaveBeenCalled();
  });

  it('calls onSaved once the save actually succeeds, not merely on submit', async () => {
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<CategoryEditor category={range} groupOptions={[]} onSaved={onSaved} />);
    expect(onSaved).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('does not call onSaved on a rejected save, so the sheet stays open on the error', async () => {
    updateCategory.mockResolvedValueOnce({ error: 'That page URL is already taken.' });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<CategoryEditor category={range} groupOptions={[]} onSaved={onSaved} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateCategory).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('names the range on delete, and requires the confirm verb', async () => {
    const user = userEvent.setup();
    render(<CategoryEditor category={range} groupOptions={[]} />);
    await user.click(screen.getByRole('button', { name: 'Delete range' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Delete this range?');
    expect(within(dialog).getByText(/Limestone will be removed/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete range' }));
    expect(deleteCategory).toHaveBeenCalled();
  });

  it('disables delete and states why when the range still has products in it', () => {
    render(<CategoryEditor category={{ ...range, productCount: 3 }} groupOptions={[]} />);
    const button = screen.getByRole('button', { name: 'Delete range' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(/3 products in it/);
  });

  it('disables delete and states why when the group still has ranges under it', () => {
    render(
      <CategoryEditor category={{ ...range, parentId: null, childCount: 2 }} groupOptions={[]} />,
    );
    const button = screen.getByRole('button', { name: 'Delete range' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(/2 ranges filed under it/);
  });

  it('locks the parent select when the group has children, so it cannot become a range itself', () => {
    render(
      <CategoryEditor category={{ ...range, parentId: null, childCount: 2 }} groupOptions={[]} />,
    );
    expect(screen.getByLabelText(/file under/i)).toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<CategoryEditor category={range} groupOptions={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
