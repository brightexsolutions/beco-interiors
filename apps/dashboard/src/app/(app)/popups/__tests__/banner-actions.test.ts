import { afterEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({ userId: 'admin-1', role: 'beco_admin' as const }));
vi.mock('@/lib/session', () => ({ requirePath: (...a: Parameters<typeof requirePath>) => requirePath(...a) }));

// popups: select().eq().maybeSingle() reads the current banner,
// update().eq().select().maybeSingle() writes the new one.
const readRow = vi.fn();
const writeRow = vi.fn();
const update = vi.fn();
const from = vi.fn(() => ({
  select: () => ({ eq: () => ({ maybeSingle: readRow }) }),
  update: (payload: unknown) => {
    update(payload);
    return { eq: () => ({ select: () => ({ maybeSingle: writeRow }) }) };
  },
}));
vi.mock('@/lib/supabase', () => ({ getSupabase: async () => ({ from }) }));

const readPhotoUpload = vi.fn();
vi.mock('@/lib/photo-source', () => ({ readPhotoUpload: (...a: unknown[]) => readPhotoUpload(...a) }));

const processProductPhoto = vi.fn();
vi.mock('@/lib/product-photo', () => ({ processProductPhoto: (...a: unknown[]) => processProductPhoto(...a) }));

const uploadProductDerivatives = vi.fn();
const deleteProductDerivatives = vi.fn();
const isProductStorageConfigured = vi.fn(() => true);
vi.mock('@/lib/product-storage', () => ({
  uploadProductDerivatives: (...a: unknown[]) => uploadProductDerivatives(...a),
  deleteProductDerivatives: (...a: unknown[]) => deleteProductDerivatives(...a),
  isProductStorageConfigured: () => isProductStorageConfigured(),
}));

const revalidateStorefrontPaths = vi.fn();
vi.mock('@/lib/storefront-revalidate', () => ({
  revalidateStorefrontPaths: (...a: unknown[]) => revalidateStorefrontPaths(...a),
}));

const { uploadPopupBanner, removePopupBanner } = await import('../actions');

const POPUP = '11111111-1111-4111-8111-111111111111';
const OLD = `popups/${POPUP}/0000aaaa`;

const formFor = (id = POPUP) => {
  const form = new FormData();
  form.set('popupId', id);
  form.set('uploadKey', 'uploads/abc');
  return form;
};

const processed = {
  width: 3780,
  height: 1890,
  blurDataUrl: 'data:image/webp;base64,xx',
  derivatives: [{ width: 400, body: Buffer.from('a') }],
};

afterEach(() => {
  vi.clearAllMocks();
  isProductStorageConfigured.mockReturnValue(true);
});

describe('uploadPopupBanner', () => {
  it('gates on the pop ups area, makes the derivatives, points the row at them, clears the old', async () => {
    readPhotoUpload.mockResolvedValue({ buffer: Buffer.from('png') });
    processProductPhoto.mockResolvedValue(processed);
    readRow.mockResolvedValue({ data: { id: POPUP, image: { path: OLD } } });
    writeRow.mockResolvedValue({ data: { id: POPUP }, error: null });

    const result = await uploadPopupBanner({}, formFor());

    expect(result).toEqual({ ok: 'Banner uploaded.' });
    expect(requirePath).toHaveBeenCalledWith('/popups');
    const stem = uploadProductDerivatives.mock.calls[0]?.[0] as string;
    expect(stem).toMatch(new RegExp(`^popups/${POPUP}/[0-9a-f]{8}$`));
    expect(update).toHaveBeenCalledWith({
      image: { path: stem, width: 3780, height: 1890, blur: processed.blurDataUrl },
    });
    expect(deleteProductDerivatives).toHaveBeenCalledWith(OLD);
    expect(revalidateStorefrontPaths).toHaveBeenCalledWith(['/']);
  });

  it('asks for a save first when the pop up has no id yet', async () => {
    expect(await uploadPopupBanner({}, formFor(''))).toEqual({ error: 'Save the pop up before you add a banner.' });
    expect(readPhotoUpload).not.toHaveBeenCalled();
  });

  it('passes on an upload that never arrived', async () => {
    readPhotoUpload.mockResolvedValue({ error: 'That upload did not arrive. Choose the photograph again.' });
    expect((await uploadPopupBanner({}, formFor())).error).toMatch(/did not arrive/);
    expect(uploadProductDerivatives).not.toHaveBeenCalled();
  });

  it('says so when storage is not configured', async () => {
    readPhotoUpload.mockResolvedValue({ buffer: Buffer.from('png') });
    isProductStorageConfigured.mockReturnValue(false);
    expect((await uploadPopupBanner({}, formFor())).error).toMatch(/not configured/);
  });

  it('refuses a pop up it cannot read, before writing any file', async () => {
    readPhotoUpload.mockResolvedValue({ buffer: Buffer.from('png') });
    readRow.mockResolvedValue({ data: null });
    expect((await uploadPopupBanner({}, formFor())).error).toMatch(/gone/);
    expect(uploadProductDerivatives).not.toHaveBeenCalled();
  });

  it('turns away a file that is not a picture', async () => {
    readPhotoUpload.mockResolvedValue({ buffer: Buffer.from('nope') });
    readRow.mockResolvedValue({ data: { id: POPUP, image: null } });
    processProductPhoto.mockRejectedValue(new Error('That file is not a photograph we can read.'));
    expect((await uploadPopupBanner({}, formFor())).error).toMatch(/not a photograph/);
    expect(uploadProductDerivatives).not.toHaveBeenCalled();
  });

  it('when the row refuses the write, removes the new files and keeps the old', async () => {
    readPhotoUpload.mockResolvedValue({ buffer: Buffer.from('png') });
    processProductPhoto.mockResolvedValue(processed);
    readRow.mockResolvedValue({ data: { id: POPUP, image: { path: OLD } } });
    writeRow.mockResolvedValue({ data: null, error: { message: 'violates check constraint "popups_image_shape"' } });

    const result = await uploadPopupBanner({}, formFor());

    expect(result.error).toBe('That banner did not save. Upload it again.');
    const stem = uploadProductDerivatives.mock.calls[0]?.[0];
    expect(deleteProductDerivatives).toHaveBeenCalledWith(stem);
    expect(deleteProductDerivatives).not.toHaveBeenCalledWith(OLD);
    expect(revalidateStorefrontPaths).not.toHaveBeenCalled();
  });
});

describe('removePopupBanner', () => {
  it('clears the row, then its files', async () => {
    readRow.mockResolvedValue({ data: { id: POPUP, image: { path: OLD } } });
    writeRow.mockResolvedValue({ data: { id: POPUP }, error: null });
    expect(await removePopupBanner({}, formFor())).toEqual({ ok: 'Banner removed.' });
    expect(update).toHaveBeenCalledWith({ image: null });
    expect(deleteProductDerivatives).toHaveBeenCalledWith(OLD);
  });

  it('leaves the files alone when RLS filters the write to nothing', async () => {
    readRow.mockResolvedValue({ data: { id: POPUP, image: { path: OLD } } });
    writeRow.mockResolvedValue({ data: null, error: null });
    expect((await removePopupBanner({}, formFor())).error).toMatch(/cannot change it/);
    expect(deleteProductDerivatives).not.toHaveBeenCalled();
  });

  it('refuses an id that is not one', async () => {
    expect((await removePopupBanner({}, formFor('x'))).error).toBe('That pop up is gone.');
    expect(from).not.toHaveBeenCalled();
  });
});
