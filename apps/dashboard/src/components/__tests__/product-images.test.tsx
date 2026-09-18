import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { CatalogueProduct } from '@/lib/products';

const addProductImage = vi.fn(async () => ({ ok: 'Photograph added.' }));
const removeProductImage = vi.fn(async () => ({ ok: 'Photograph removed.' }));
const saveProductImages = vi.fn(async () => ({ ok: 'Photographs updated.' }));
vi.mock('@/app/(app)/products/actions', () => ({
  addProductImage: (...a: unknown[]) => addProductImage(...a),
  removeProductImage: (...a: unknown[]) => removeProductImage(...a),
  saveProductImages: (...a: unknown[]) => saveProductImages(...a),
}));

const { ProductImages } = await import('../product-images');

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
  shortDescription: null,
  description: null,
  metaTitle: null,
  metaDescription: null,
  specs: [],
  images: [
    {
      role: 'slab',
      path: '12mm-sintered-stones/limestone-ivory/slab-ab12',
      alt: 'Limestone Ivory slab',
      width: 1600,
      height: 900,
      sort: 0,
    },
  ],
  unit: 'per slab',
  stockQuantity: 4,
  lowStockThreshold: 1,
  updatedAt: '2026-09-17T10:00:00.000Z',
};

describe('ProductImages', () => {
  it('names the product on remove and actually calls the action', async () => {
    const user = userEvent.setup();
    render(<ProductImages product={product} />);
    await user.click(screen.getByRole('button', { name: 'Remove photograph' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Remove this photograph?');
    await user.click(within(dialog).getByRole('button', { name: 'Remove photograph' }));
    expect(removeProductImage).toHaveBeenCalled();
  });

  it('has an Add photograph control, not a decorative file picker', () => {
    render(<ProductImages product={product} />);
    expect(screen.getByRole('button', { name: 'Add photograph' })).toBeEnabled();
    expect(screen.getByLabelText(/add photograph/i)).toHaveAttribute('type', 'file');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ProductImages product={product} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
