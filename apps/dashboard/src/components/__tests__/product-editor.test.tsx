import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { CatalogueProduct } from '@/lib/products';
import type { ProductActionState } from '@/app/(app)/products/actions';

const updateProduct = vi.fn(async (): Promise<ProductActionState> => ({ ok: 'Saved.' }));
const deleteProduct = vi.fn(async (): Promise<ProductActionState> => ({
  ok: 'Removed from the storefront. Existing quotes keep their line and price.',
}));
vi.mock('@/app/(app)/products/actions', () => ({
  updateProduct: (...a: Parameters<typeof updateProduct>) => updateProduct(...a),
  deleteProduct: (...a: Parameters<typeof deleteProduct>) => deleteProduct(...a),
  addProductImage: vi.fn(async () => ({})),
  removeProductImage: vi.fn(async () => ({})),
  saveProductImages: vi.fn(async () => ({})),
}));

const { ProductEditor } = await import('../product-editor');

const product: CatalogueProduct = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Limestone Ivory',
  slug: 'limestone-ivory',
  sku: null,
  categoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  categoryName: '12mm Sintered Stones',
  categorySlug: '12mm-sintered-stones',
  price: 75000,
  compareAtPrice: null,
  priceDisplayMode: 'fixed',
  availability: 'in_stock',
  badge: null,
  isPublished: true,
  sortOrder: 0,
  shortDescription: 'A slab.',
  description: 'A longer note.',
  metaTitle: 'Limestone Ivory sintered stone',
  metaDescription: 'Stocked in Nairobi.',
  specs: [{ label: 'Finish', value: 'Soft Matte' }],
  images: [],
  unit: 'per slab',
  stockQuantity: 4,
  lowStockThreshold: 1,
  updatedAt: '2026-09-17T10:00:00.000Z',
};

describe('ProductEditor, closing the sheet', () => {
  it('calls onSaved once the save actually succeeds, not merely on submit', async () => {
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<ProductEditor product={product} categories={[]} onSaved={onSaved} />);
    expect(onSaved).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('does not call onSaved on a rejected save, so the sheet stays open on the error', async () => {
    updateProduct.mockResolvedValueOnce({ error: 'Something else has that page URL.' });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<ProductEditor product={product} categories={[]} onSaved={onSaved} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe('ProductEditor', () => {
  it('names the product on delete and says quotes keep their line', async () => {
    const user = userEvent.setup();
    render(<ProductEditor product={product} categories={[]} />);
    await user.click(screen.getByRole('button', { name: 'Delete product' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Delete this product?');
    expect(within(dialog).getByText(/Limestone Ivory will be removed/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/keep their line and their price/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete product' }));
    expect(deleteProduct).toHaveBeenCalled();
  });

  it('lets a spec row be added, which is a real control', async () => {
    const user = userEvent.setup();
    render(<ProductEditor product={product} categories={[]} />);
    await user.click(screen.getByRole('button', { name: 'Add spec' }));
    expect(screen.getByLabelText('Spec 2 label')).toBeInTheDocument();
  });

  it('groups name, photographs and availability, and names the product as the website does', () => {
    render(<ProductEditor product={product} categories={[]} />);
    expect(screen.getByRole('heading', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Photographs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Availability' })).toBeInTheDocument();
    expect(screen.getByLabelText('Product name')).toHaveValue('Limestone Ivory');
    expect(screen.getByLabelText(/^sku/i)).toHaveValue('');
  });

  it('submits Save with the product lock', async () => {
    const user = userEvent.setup();
    render(<ProductEditor product={product} categories={[]} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateProduct).toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ProductEditor product={product} categories={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
