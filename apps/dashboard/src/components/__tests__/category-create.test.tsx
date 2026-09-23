import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));

const createCategory = vi.fn(async () => ({ ok: 'Draft created.', slug: 'wall-panels' }));
vi.mock('@/app/(app)/categories/actions', () => ({
  createCategory: (...a: Parameters<typeof createCategory>) => createCategory(...a),
}));

const { CategoryCreate } = await import('../category-create');

const groupOptions = [{ id: 'group-1', name: 'Sintered Stone' }];

afterEach(() => {
  push.mockClear();
  replace.mockClear();
  createCategory.mockClear();
});

describe('CategoryCreate', () => {
  it('fills the slug from the name until the slug is edited', async () => {
    const user = userEvent.setup();
    render(<CategoryCreate groupOptions={groupOptions} returnTo="/categories" />);
    await user.type(screen.getByLabelText('Name'), 'Wall Panels');
    expect(screen.getByLabelText(/page url/i)).toHaveValue('wall-panels');
  });

  it('defaults to a top level group and can be filed under one instead', async () => {
    const user = userEvent.setup();
    render(<CategoryCreate groupOptions={groupOptions} returnTo="/categories" />);
    expect(screen.getByLabelText(/file under/i)).toHaveValue('');
    await user.selectOptions(screen.getByLabelText(/file under/i), 'group-1');
    await user.type(screen.getByLabelText('Name'), 'Bamboo Veneer');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(createCategory).toHaveBeenCalled();
  });

  it('cancels back to the return path without creating anything', async () => {
    const user = userEvent.setup();
    render(<CategoryCreate groupOptions={groupOptions} returnTo="/categories" />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(push).toHaveBeenCalledWith('/categories');
    expect(createCategory).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<CategoryCreate groupOptions={groupOptions} returnTo="/categories" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
