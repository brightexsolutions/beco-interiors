import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { CatalogueProduct } from '@/lib/products';
import type { ProductActionState } from '@/app/(app)/products/actions';

const updateProduct = vi.fn(
  async (_prev: ProductActionState, _form: FormData): Promise<ProductActionState> => ({ ok: 'Saved.' }),
);
const deleteProduct = vi.fn(async (): Promise<ProductActionState> => ({
  ok: 'Removed from the storefront. Existing quotes keep their line and price.',
}));
const setProductPublished = vi.fn(
  async (_prev: ProductActionState, form: FormData): Promise<ProductActionState> => ({
    ok: form.get('published') === 'true' ? 'Published. It will appear on the website shortly.' : 'Unpublished.',
  }),
);
vi.mock('@/app/(app)/products/actions', () => ({
  updateProduct: (...a: Parameters<typeof updateProduct>) => updateProduct(...a),
  setProductPublished: (...a: Parameters<typeof setProductPublished>) => setProductPublished(...a),
  deleteProduct: (...a: Parameters<typeof deleteProduct>) => deleteProduct(...a),
  addProductImage: vi.fn(async () => ({})),
  removeProductImage: vi.fn(async () => ({})),
  saveProductImages: vi.fn(async () => ({})),
}));

const { ProductEditor, PUBLISH_TIP, UNPUBLISH_TIP } = await import('../product-editor');
const { Toaster, toast } = await import('@beco/ui');

afterEach(() => {
  updateProduct.mockClear();
  setProductPublished.mockClear();
  act(() => {
    toast.dismiss();
  });
});

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

const draft: CatalogueProduct = { ...product, isPublished: false };
const photo = {
  role: 'slab' as const,
  path: 'sintered/limestone-ivory/slab-ab12',
  alt: 'Limestone Ivory slab',
  width: 1600,
  height: 1200,
  sort: 0,
};

const renderEditor = (subject: CatalogueProduct) =>
  render(
    <>
      <ProductEditor product={subject} categories={[]} />
      <Toaster />
    </>,
  );

describe('ProductEditor, the publish control at the top (D133)', () => {
  it('shows Draft and a Publish button on a draft, and no published checkbox anywhere', () => {
    renderEditor({ ...draft, images: [photo] });
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /published on the website/i })).not.toBeInTheDocument();
  });

  it('shows Published and an Unpublish button on a live product', () => {
    renderEditor(product);
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });

  it('publishes the flag alone with the lock, flips the pill and says so', async () => {
    const user = userEvent.setup();
    renderEditor({ ...draft, images: [photo] });
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(setProductPublished).toHaveBeenCalledTimes(1));
    const form = setProductPublished.mock.calls[0]![1];
    expect(form.get('productId')).toBe(product.id);
    expect(form.get('updatedAt')).toBe(product.updatedAt);
    expect(form.get('published')).toBe('true');
    expect(updateProduct).not.toHaveBeenCalled();
    expect(await screen.findByText('Published. It will appear on the website shortly.')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
  });

  it('spins the Publish button while it runs, and only that button', async () => {
    let settle: (value: ProductActionState) => void = () => {};
    setProductPublished.mockImplementationOnce(
      () => new Promise<ProductActionState>((resolve) => (settle = resolve)),
    );
    const user = userEvent.setup();
    renderEditor({ ...draft, images: [photo] });
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    const running = await screen.findByRole('button', { name: 'Publishing' });
    expect(running).toHaveAttribute('aria-busy', 'true');
    expect(running).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('aria-busy');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await act(async () => settle({ ok: 'Published. It will appear on the website shortly.' }));
    expect(await screen.findByRole('button', { name: 'Unpublish' })).not.toHaveAttribute('aria-busy');
  });

  it('keeps Draft and toasts the refusal when the publish is refused', async () => {
    setProductPublished.mockResolvedValueOnce({
      error: 'This product changed while you were editing. Reload and try again.',
    });
    const user = userEvent.setup();
    renderEditor({ ...draft, images: [photo] });
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText(/changed while you were editing/i)).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
  });

  it('asks before unpublishing, naming the product, and Cancel changes nothing', async () => {
    const user = userEvent.setup();
    renderEditor(product);
    await user.click(screen.getByRole('button', { name: 'Unpublish' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Unpublish Limestone Ivory?');
    expect(
      within(dialog).getByText('It will disappear from the website until you publish it again.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(setProductPublished).not.toHaveBeenCalled();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('unpublishes on confirm, flips the pill to Draft and says Unpublished', async () => {
    const user = userEvent.setup();
    renderEditor(product);
    await user.click(screen.getByRole('button', { name: 'Unpublish' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Unpublish' }));
    await waitFor(() => expect(setProductPublished).toHaveBeenCalledTimes(1));
    expect(setProductPublished.mock.calls[0]![1].get('published')).toBe('false');
    expect(await screen.findByText('Unpublished.')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
  });
});

describe('ProductEditor, publishing with unsaved changes (D133)', () => {
  it('turns Publish into Save and publish once a field changes, and sends the edits with the flag', async () => {
    const user = userEvent.setup();
    renderEditor({ ...draft, images: [photo] });
    await user.clear(screen.getByLabelText(/^description/i));
    await user.type(screen.getByLabelText(/^description/i), 'Edited copy');
    await user.click(screen.getByRole('button', { name: 'Save and publish' }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalledTimes(1));
    const form = updateProduct.mock.calls[0]![1];
    expect(form.get('isPublished')).toBe('true');
    expect(form.get('description')).toBe('Edited copy');
    expect(form.get('productId')).toBe(product.id);
    expect(setProductPublished).not.toHaveBeenCalled();
  });

  it('counts a spec change as an edit too', async () => {
    const user = userEvent.setup();
    renderEditor({ ...draft, images: [photo] });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add spec' }));
    expect(screen.getByRole('button', { name: 'Save and publish' })).toBeInTheDocument();
  });

  it('asks before Save and unpublish too, then sends the edits with the flag off', async () => {
    const user = userEvent.setup();
    renderEditor(product);
    await user.type(screen.getByLabelText(/^short description/i), ' More.');
    await user.click(screen.getByRole('button', { name: 'Save and unpublish' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Unpublish' }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalledTimes(1));
    expect(updateProduct.mock.calls[0]![1].get('isPublished')).toBe('false');
    expect(updateProduct.mock.calls[0]![1].get('shortDescription')).toBe('A slab. More.');
  });

  it('a plain Save sends no published flag, so it cannot change it', async () => {
    const user = userEvent.setup();
    renderEditor(product);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalledTimes(1));
    expect(updateProduct.mock.calls[0]![1].has('isPublished')).toBe(false);
  });
});

describe('ProductEditor, what is missing before publishing', () => {
  it('warns of no photo and no price beside Publish, and still allows it', async () => {
    const user = userEvent.setup();
    renderEditor({ ...draft, images: [], price: null });
    const button = screen.getByRole('button', { name: 'Publish' });
    expect(screen.getByText('No photo yet. No price yet.')).toBeInTheDocument();
    expect(button).toHaveAccessibleDescription(`No photo yet. No price yet. ${PUBLISH_TIP}`);
    expect(button).toBeEnabled();
    await user.click(button);
    await waitFor(() => expect(setProductPublished).toHaveBeenCalledTimes(1));
  });

  it('does not ask for a price on a price on application product', () => {
    renderEditor({ ...draft, images: [], price: null, priceDisplayMode: 'poa' });
    expect(screen.getByText('No photo yet.')).toBeInTheDocument();
    expect(screen.queryByText(/no price yet/i)).not.toBeInTheDocument();
  });

  it('shows no warning once a photo and a price are there, or once it is live', () => {
    const { unmount } = renderEditor({ ...draft, images: [photo] });
    expect(screen.queryByText(/No photo yet|No price yet/)).not.toBeInTheDocument();
    unmount();
    renderEditor({ ...product, images: [], price: null });
    expect(screen.queryByText(/No photo yet|No price yet/)).not.toBeInTheDocument();
  });
});

describe('ProductEditor, the tip on the publish control', () => {
  it('describes Publish to a screen reader and shows the tip on keyboard focus', () => {
    renderEditor({ ...draft, images: [photo] });
    const button = screen.getByRole('button', { name: 'Publish' });
    expect(button).toHaveAccessibleDescription(PUBLISH_TIP);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    act(() => button.focus());
    expect(screen.getByRole('tooltip')).toHaveTextContent(PUBLISH_TIP);
  });

  it('describes Unpublish in its own words, and a tap on the info button shows it', async () => {
    const user = userEvent.setup();
    renderEditor(product);
    expect(screen.getByRole('button', { name: 'Unpublish' })).toHaveAccessibleDescription(UNPUBLISH_TIP);
    await user.pointer({ keys: '[TouchA]', target: screen.getByRole('button', { name: 'About Unpublish' }) });
    expect(screen.getByRole('tooltip')).toHaveTextContent(UNPUBLISH_TIP);
  });

  it('has no accessibility violations on a draft with warnings', async () => {
    const { container } = render(
      <ProductEditor product={{ ...draft, images: [], price: null }} categories={[]} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
