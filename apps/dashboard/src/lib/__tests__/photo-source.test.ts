import { describe, expect, it, vi } from 'vitest';

const takeStagedUpload = vi.fn();
vi.mock('@/lib/product-storage', () => ({ takeStagedUpload: (...a: unknown[]) => takeStagedUpload(...a) }));

const { readPhotoUpload } = await import('../photo-source');

describe('readPhotoUpload', () => {
  it('prefers the staged upload key and never looks at the file field then', async () => {
    takeStagedUpload.mockResolvedValueOnce(Buffer.from('jpeg bytes'));
    const form = new FormData();
    form.set('uploadKey', 'uploads/0123456789abcdef0123456789abcdef');
    form.set('photo', new File([], 'ignored.jpg'));
    const result = await readPhotoUpload(form);
    expect(result.buffer?.toString()).toBe('jpeg bytes');
    expect(takeStagedUpload).toHaveBeenCalledWith('uploads/0123456789abcdef0123456789abcdef');
  });

  it('returns the storage message when the staged object is missing or oversized', async () => {
    takeStagedUpload.mockRejectedValueOnce(new Error('That photograph is larger than 12MB. Compress it and try again.'));
    const form = new FormData();
    form.set('uploadKey', 'uploads/0123456789abcdef0123456789abcdef');
    expect(await readPhotoUpload(form)).toEqual({ error: expect.stringMatching(/larger than 12MB/) });
  });

  it('reads the file from the form post fallback, under the field the form used', async () => {
    const before = takeStagedUpload.mock.calls.length;
    const form = new FormData();
    const file = new File([new Uint8Array([1, 2, 3])], 'cover.png', { type: 'image/png' });
    // jsdom's File has no arrayBuffer. The browser's and Node's do.
    Object.assign(file, { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
    form.set('file', file);
    const result = await readPhotoUpload(form, 'file');
    expect(result.buffer?.length).toBe(3);
    expect(takeStagedUpload).toHaveBeenCalledTimes(before);
  });

  it('turns an empty or wrong file away with the shared message', async () => {
    expect(await readPhotoUpload(new FormData())).toEqual({ error: 'Choose a photograph first.' });
    const form = new FormData();
    form.set('photo', new File([new Uint8Array([1])], 'doc.pdf', { type: 'application/pdf' }));
    expect(await readPhotoUpload(form)).toEqual({ error: 'Use a JPEG, PNG or WebP photograph.' });
  });
});
