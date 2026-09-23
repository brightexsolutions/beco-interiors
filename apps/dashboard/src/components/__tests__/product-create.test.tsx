import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const createProduct = vi.fn(async () => ({ ok: 'Draft created.', slug: 'calacatta-gold' }));
vi.mock('@/app/(app)/products/actions', () => ({
  createProduct: (...a: Parameters<typeof createProduct>) => createProduct(...a),
}));

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));

const { ProductCreate } = await import('../product-create');

const categories = [
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: '12mm Sintered Stones', slug: '12mm-sintered-stones', parentId: null },
];

describe('ProductCreate', () => {
  it('fills the slug from the name until the slug is edited', async () => {
    const user = userEvent.setup();
    render(<ProductCreate categories={categories} returnTo="/products" />);
    await user.type(screen.getByLabelText('Product name'), 'Calacatta Gold');
    expect(screen.getByLabelText(/page url/i)).toHaveValue('calacatta-gold');
  });

  it('submits Create product', async () => {
    const user = userEvent.setup();
    render(<ProductCreate categories={categories} returnTo="/products" />);
    await user.type(screen.getByLabelText('Product name'), 'Calacatta Gold');
    await user.type(screen.getByLabelText(/^sku/i), '537 160 BLACK');
    await user.selectOptions(screen.getByLabelText('Range'), categories[0]!.id);
    await user.type(screen.getByRole('spinbutton'), '89000');
    await user.click(screen.getByRole('button', { name: 'Create product' }));
    expect(createProduct).toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ProductCreate categories={categories} returnTo="/products" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
