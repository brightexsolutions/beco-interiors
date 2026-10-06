import { describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async (_path: string) => undefined);
vi.mock('@/lib/session', () => ({ requirePath: (p: string) => requirePath(p) }));

const configured = vi.fn(() => true);
const createStagedUpload = vi.fn(async (type: string) => ({
  key: 'uploads/0123456789abcdef0123456789abcdef',
  url: `https://r2.example/put?ct=${type}`,
}));
vi.mock('@/lib/product-storage', () => ({
  isProductStorageConfigured: () => configured(),
  createStagedUpload: (type: string) => createStagedUpload(type),
}));

const { createPhotoUpload } = await import('../actions');

describe('createPhotoUpload', () => {
  it('gates on the area the photograph is for, then signs one PUT', async () => {
    const result = await createPhotoUpload({ area: 'studio/blog', size: 3_000_000, type: 'image/jpeg' });
    expect(requirePath).toHaveBeenCalledWith('/studio/blog');
    expect(result).toEqual({ key: 'uploads/0123456789abcdef0123456789abcdef', url: 'https://r2.example/put?ct=image/jpeg' });
  });

  it('refuses before touching the session when the request itself is bad', async () => {
    requirePath.mockClear();
    const tooBig = await createPhotoUpload({ area: 'products', size: 13 * 1024 * 1024, type: 'image/jpeg' });
    expect(tooBig.error).toMatch(/larger than 12MB/);
    const wrongType = await createPhotoUpload({ area: 'products', size: 10, type: 'application/zip' });
    expect(wrongType.error).toMatch(/JPEG, PNG or WebP/);
    const unknownArea = await createPhotoUpload({ area: 'settings' as never, size: 10, type: 'image/jpeg' });
    expect(unknownArea.error).toBeTruthy();
    expect(requirePath).not.toHaveBeenCalled();
    expect(createStagedUpload).toHaveBeenCalledTimes(1);
  });

  it('propagates the route refusal, a sales account cannot sign a team photo', async () => {
    requirePath.mockRejectedValueOnce(new Error('FORBIDDEN'));
    await expect(createPhotoUpload({ area: 'users', size: 10, type: 'image/png' })).rejects.toThrow('FORBIDDEN');
  });

  it('says storage is not configured rather than signing a URL that cannot work', async () => {
    configured.mockReturnValueOnce(false);
    const result = await createPhotoUpload({ area: 'products', size: 10, type: 'image/png' });
    expect(result.error).toMatch(/not configured/);
  });
});
