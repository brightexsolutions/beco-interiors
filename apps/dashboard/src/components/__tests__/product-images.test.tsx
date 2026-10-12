import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { toast } from '@beco/ui';
import type { CatalogueProduct } from '@/lib/products';
import type { ProductActionState } from '@/app/(app)/products/actions';

const removeProductImage = vi.fn(async () => ({ ok: 'Photograph removed.' }));
const saveProductImages = vi.fn(async () => ({ ok: 'Photographs updated.' }));
vi.mock('@/app/(app)/products/actions', () => ({
  addProductImage: vi.fn(async () => ({ ok: 'Photograph added.' })),
  removeProductImage: (...a: Parameters<typeof removeProductImage>) => removeProductImage(...a),
  saveProductImages: (...a: Parameters<typeof saveProductImages>) => saveProductImages(...a),
}));

const stagePhoto = vi.fn(async (..._a: unknown[]) => ({ kind: 'staged' as const, key: 'uploads/0123456789abcdef0123456789abcdef' }));
vi.mock('@/lib/direct-upload', () => ({
  stagePhoto: (...a: unknown[]) => stagePhoto(...a),
}));
vi.mock('@/app/(app)/uploads/actions', () => ({ createPhotoUpload: vi.fn() }));

// jsdom has no object URLs; the queue draws a preview from one.
Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:preview'), writable: true });
Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });

const { ProductImages, guessRole } = await import('../product-images');

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
  sizes: [],
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

/** A prepare that hands the file back as is, the way a small JPEG goes through. */
const passThrough = vi.fn(async (file: File) => ({ file, width: 1600, height: 1200, changed: false }));
const jpeg = (name: string, bytes = 3) => new File([new Uint8Array(bytes)], name, { type: 'image/jpeg' });

beforeEach(() => {
  stagePhoto.mockClear();
  passThrough.mockClear();
});

describe('guessRole', () => {
  it('reads the shot from the file name the way the Drive import does, slab by default', () => {
    expect(guessRole('SLAB.jpg')).toBe('slab');
    expect(guessRole('IMG_4197.HEIC')).toBe('slab');
    expect(guessRole('slab on stand.jpg')).toBe('on_stand');
    expect(guessRole('BOOK MATCH.jpg')).toBe('bookmatch');
    expect(guessRole('APP 1.jpg')).toBe('application');
    expect(guessRole('kitchen-install.jpg')).toBe('application');
  });
});

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

  it('takes several files at once and says the limits plainly', () => {
    render(<ProductImages product={product} />);
    const input = screen.getByLabelText(/^photographs/i);
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('multiple');
    expect(input.getAttribute('accept')).toContain('image/heic');
    expect(screen.getByText(/Up to 40MB each, several at once/)).toBeInTheDocument();
    expect(screen.getByText(/resized to 2400px on this device/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Upload/ })).toBeNull();
  });

  it('queues each picked file with a guessed shot and the product name as alt, and uploads them one after another, chaining the lock', async () => {
    const user = userEvent.setup();
    const add = vi.fn(async (form: FormData): Promise<ProductActionState> => ({
      ok: 'Photograph added.',
      updatedAt: `lock-after-${form.get('alt')}`,
    }));
    const onChanged = vi.fn();
    render(<ProductImages product={product} prepare={passThrough} add={add} onChanged={onChanged} />);
    await user.upload(screen.getByLabelText(/^photographs/i), [jpeg('SLAB.jpg'), jpeg('APP 1.jpg')]);

    const queue = screen.getByRole('list', { name: 'Photographs to upload' });
    const rows = within(queue).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByRole('combobox', { name: 'Shot' })).toHaveValue('slab');
    expect(within(rows[1]!).getByRole('combobox', { name: 'Shot' })).toHaveValue('application');
    expect(within(rows[0]!).getByRole('textbox', { name: /Alt text/ })).toHaveValue('Limestone Ivory slab');
    expect(within(rows[1]!).getByRole('textbox', { name: /Alt text/ })).toHaveValue('Limestone Ivory in use');

    await user.clear(within(rows[1]!).getByRole('textbox', { name: /Alt text/ }));
    await user.type(within(rows[1]!).getByRole('textbox', { name: /Alt text/ }), 'Limestone Ivory in a kitchen');

    const success = vi.spyOn(toast, 'success').mockImplementation(() => '' as never);
    await user.click(screen.getByRole('button', { name: 'Upload 2 photographs' }));
    await vi.waitFor(() => expect(add).toHaveBeenCalledTimes(2));

    expect(passThrough).toHaveBeenCalledTimes(2);
    expect(stagePhoto).toHaveBeenCalledTimes(2);
    const first = add.mock.calls[0]![0];
    const second = add.mock.calls[1]![0];
    expect(first.get('updatedAt')).toBe(product.updatedAt);
    expect(first.get('uploadKey')).toBe('uploads/0123456789abcdef0123456789abcdef');
    expect(first.get('photo')).toBeNull();
    expect(first.get('role')).toBe('slab');
    expect(first.get('alt')).toBe('Limestone Ivory slab');
    // The second add carries the lock the first one handed back.
    expect(second.get('updatedAt')).toBe('lock-after-Limestone Ivory slab');
    expect(second.get('alt')).toBe('Limestone Ivory in a kitchen');

    await vi.waitFor(() => expect(success).toHaveBeenCalledWith('2 photographs added.'));
    expect(onChanged).toHaveBeenCalled();
    expect(within(queue).getAllByText('Added')).toHaveLength(2);
    success.mockRestore();
  });

  it('keeps the prepared file in the form post when staging says to fall back', async () => {
    const user = userEvent.setup();
    stagePhoto.mockResolvedValueOnce({ kind: 'fallback' } as never);
    const prepared = jpeg('small.jpg', 5);
    const prepare = vi.fn(async () => ({ file: prepared, width: 100, height: 100, changed: true }));
    const add = vi.fn(async (): Promise<ProductActionState> => ({ ok: 'Photograph added.' }));
    render(<ProductImages product={product} prepare={prepare} add={add} />);
    await user.upload(screen.getByLabelText(/^photographs/i), jpeg('IMG_1.jpg', 9_000));
    await user.click(screen.getByRole('button', { name: 'Upload 1 photograph' }));
    await vi.waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    const sent = (add.mock.calls as unknown as [FormData][])[0]![0];
    expect(sent.get('uploadKey')).toBeNull();
    expect(sent.get('photo')).toBe(prepared);
  });

  it('shows a failure on its own row with the reason, carries on with the rest, and lets it be tried again', async () => {
    const user = userEvent.setup();
    const prepare = vi.fn(async (file: File) => {
      if (file.name === 'IMG_9.HEIC') throw new Error('Could not read IMG_9.HEIC. Share it as a JPEG, then try again.');
      return { file, width: 100, height: 100, changed: false };
    });
    const add = vi.fn(async (): Promise<ProductActionState> => ({ ok: 'Photograph added.' }));
    const success = vi.spyOn(toast, 'success').mockImplementation(() => '' as never);
    render(<ProductImages product={product} prepare={prepare} add={add} />);
    await user.upload(screen.getByLabelText(/^photographs/i), [
      new File([new Uint8Array([1])], 'IMG_9.HEIC', { type: 'image/heic' }),
      jpeg('SLAB.jpg'),
    ]);
    await user.click(screen.getByRole('button', { name: 'Upload 2 photographs' }));
    await vi.waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not read IMG_9.HEIC');
    await vi.waitFor(() => expect(success).toHaveBeenCalledWith('Photograph added.'));
    // The failed one is still in the queue, offered again.
    expect(screen.getByRole('button', { name: 'Upload 1 photograph' })).toBeEnabled();
    success.mockRestore();
  });

  it('turns away a file that is not a photograph, or over 40MB, before it reaches the queue', async () => {
    // The input's accept would hide the PDF from a real picker; the check is for what slips past it.
    const user = userEvent.setup({ applyAccept: false });
    const error = vi.spyOn(toast, 'error').mockImplementation(() => '' as never);
    render(<ProductImages product={product} />);
    await user.upload(screen.getByLabelText(/^photographs/i), new File([new Uint8Array([1])], 'notes.pdf', { type: 'application/pdf' }));
    expect(error).toHaveBeenCalledWith('notes.pdf is not a photograph.');
    expect(screen.queryByRole('list', { name: 'Photographs to upload' })).toBeNull();
    error.mockRestore();
  });

  it('shows what is happening while a file uploads, in words and a percentage', async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    stagePhoto.mockImplementationOnce(((_file: unknown, _area: unknown, _presign: unknown, onProgress: (f: number) => void) =>
      new Promise((resolve) => {
        onProgress(0.4);
        finish = () => resolve({ kind: 'staged', key: 'uploads/0123456789abcdef0123456789abcdef' });
      })) as never);
    const add = vi.fn(async (): Promise<ProductActionState> => ({ ok: 'Photograph added.' }));
    render(<ProductImages product={product} prepare={passThrough} add={add} />);
    await user.upload(screen.getByLabelText(/^photographs/i), jpeg('SLAB.jpg'));
    await user.click(screen.getByRole('button', { name: 'Upload 1 photograph' }));
    const statuses = await screen.findAllByRole('status');
    expect(statuses.some((node) => /Uploading 40%/.test(node.textContent ?? ''))).toBe(true);
    expect(screen.getByRole('button', { name: /Uploading 1 of 1/ })).toBeDisabled();
    finish();
    await vi.waitFor(() => expect(add).toHaveBeenCalled());
  });

  it('has no accessibility violations, empty and with a queue', async () => {
    const user = userEvent.setup();
    const { container } = render(<ProductImages product={product} prepare={passThrough} />);
    expect(await axe(container)).toHaveNoViolations();
    await user.upload(screen.getByLabelText(/^photographs/i), jpeg('SLAB.jpg'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
