import { describe, expect, it, vi } from 'vitest';
import { isSafeR2Key } from '../product-storage';

describe('isSafeR2Key', () => {
  it('accepts a team derivative and refuses traversal', () => {
    expect(isSafeR2Key('team/11111111-1111-4111-8111-111111111111/ab12-400.webp')).toBe(true);
    expect(isSafeR2Key('../etc/passwd')).toBe(false);
    expect(isSafeR2Key('/absolute')).toBe(false);
    expect(isSafeR2Key('')).toBe(false);
  });
});

const sent: unknown[] = [];
let headResult: { ContentLength?: number; ContentType?: string } | Error = { ContentLength: 10, ContentType: 'image/jpeg' };
vi.mock('@aws-sdk/client-s3', () => {
  class Cmd {
    constructor(public input: Record<string, unknown>) {}
  }
  return {
    S3Client: class {
      async send(command: Cmd) {
        sent.push(command);
        if (command instanceof HeadObjectCommand) {
          if (headResult instanceof Error) throw headResult;
          return headResult;
        }
        if (command instanceof GetObjectCommand) {
          return { Body: { transformToByteArray: async () => new Uint8Array([7, 8, 9]) } };
        }
        return {};
      }
    },
    PutObjectCommand: class extends Cmd {},
    GetObjectCommand: class extends Cmd {},
    HeadObjectCommand: class extends Cmd {},
    DeleteObjectCommand: class extends Cmd {},
  };
});
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async (_client: unknown, command: { input: Record<string, unknown> }, options: { expiresIn: number }) =>
    `https://r2.example/${command.input.Key}?ct=${command.input.ContentType}&ttl=${options.expiresIn}`,
}));

const { GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
const { createStagedUpload, takeStagedUpload } = await import('../product-storage');

const withR2 = () => {
  vi.stubEnv('R2_ACCOUNT_ID', 'acct');
  vi.stubEnv('R2_ACCESS_KEY_ID', 'key');
  vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret');
  vi.stubEnv('R2_BUCKET', 'beco-images');
};

describe('createStagedUpload', () => {
  it('signs a five minute PUT for a fresh key under uploads/ with the content type', async () => {
    withR2();
    const { key, url } = await createStagedUpload('image/jpeg');
    expect(key).toMatch(/^uploads\/[0-9a-f]{32}$/);
    expect(url).toBe(`https://r2.example/${key}?ct=image/jpeg&ttl=300`);
    vi.unstubAllEnvs();
  });

  it('refuses without the R2 keys rather than signing with nothing', async () => {
    vi.unstubAllEnvs();
    await expect(createStagedUpload('image/jpeg')).rejects.toThrow(/not configured/);
  });
});

describe('takeStagedUpload', () => {
  const key = 'uploads/0123456789abcdef0123456789abcdef';
  const deletes = () => sent.filter((c) => c instanceof DeleteObjectCommand).length;

  it('refuses a key it could not have signed, so a derivative cannot be pulled through this path', async () => {
    withR2();
    await expect(takeStagedUpload('team/x/ab12-400.webp')).rejects.toThrow(/not one we signed/);
    expect(sent.filter((c) => c instanceof HeadObjectCommand)).toHaveLength(0);
  });

  it('returns the bytes and deletes the staging object afterwards', async () => {
    withR2();
    sent.length = 0;
    headResult = { ContentLength: 3, ContentType: 'image/jpeg' };
    const bytes = await takeStagedUpload(key);
    expect([...bytes]).toEqual([7, 8, 9]);
    expect(sent.filter((c) => c instanceof GetObjectCommand)).toHaveLength(1);
    expect(deletes()).toBe(1);
  });

  it('deletes and refuses an object over 12MB, the size the browser could not be made to sign', async () => {
    withR2();
    sent.length = 0;
    headResult = { ContentLength: 12 * 1024 * 1024 + 1, ContentType: 'image/jpeg' };
    await expect(takeStagedUpload(key)).rejects.toThrow(/larger than 12MB/);
    expect(deletes()).toBe(1);
    expect(sent.filter((c) => c instanceof GetObjectCommand)).toHaveLength(0);
  });

  it('deletes and refuses a non image content type, and an empty object', async () => {
    withR2();
    sent.length = 0;
    headResult = { ContentLength: 10, ContentType: 'application/pdf' };
    await expect(takeStagedUpload(key)).rejects.toThrow(/JPEG, PNG or WebP/);
    headResult = { ContentLength: 0 };
    await expect(takeStagedUpload(key)).rejects.toThrow(/Choose a photograph/);
    expect(deletes()).toBe(2);
  });

  it('says the upload did not arrive when the object is missing', async () => {
    withR2();
    headResult = new Error('NotFound');
    await expect(takeStagedUpload(key)).rejects.toThrow(/did not arrive/);
    vi.unstubAllEnvs();
  });
});
