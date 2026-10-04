import { describe, expect, it } from 'vitest';
import { MAX_PHOTO_BYTES, isStagedUploadKey, stagedUploadRequestSchema } from '../dashboard-upload';

describe('stagedUploadRequestSchema', () => {
  it('accepts a phone JPEG under the cap for a known area', () => {
    const parsed = stagedUploadRequestSchema.safeParse({ area: 'products', size: 5_000_000, type: 'image/jpeg' });
    expect(parsed.success).toBe(true);
  });

  it('accepts an empty type, some phones send HEIC with none, and sharp decides later', () => {
    expect(stagedUploadRequestSchema.safeParse({ area: 'users', size: 10, type: '' }).success).toBe(true);
  });

  it('refuses a file over the cap with the message the person will read', () => {
    const parsed = stagedUploadRequestSchema.safeParse({ area: 'products', size: MAX_PHOTO_BYTES + 1, type: 'image/png' });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toMatch(/larger than 12MB/);
  });

  it('refuses an empty file, a non image type and an unknown area', () => {
    expect(stagedUploadRequestSchema.safeParse({ area: 'products', size: 0, type: 'image/jpeg' }).success).toBe(false);
    expect(stagedUploadRequestSchema.safeParse({ area: 'products', size: 10, type: 'application/pdf' }).success).toBe(false);
    expect(stagedUploadRequestSchema.safeParse({ area: 'settings', size: 10, type: 'image/jpeg' }).success).toBe(false);
  });
});

describe('isStagedUploadKey', () => {
  it('matches only the prefix plus 32 hex characters, so a derivative key can never be claimed', () => {
    expect(isStagedUploadKey('uploads/0123456789abcdef0123456789abcdef')).toBe(true);
    expect(isStagedUploadKey('uploads/0123456789abcdef0123456789abcde')).toBe(false);
    expect(isStagedUploadKey('12mm-sintered-stones/amber-jade/slab-ab12-400.webp')).toBe(false);
    expect(isStagedUploadKey('uploads/../team/x')).toBe(false);
    expect(isStagedUploadKey('')).toBe(false);
  });
});
