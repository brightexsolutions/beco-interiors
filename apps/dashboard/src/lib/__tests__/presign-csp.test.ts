import { afterEach, describe, expect, it, vi } from 'vitest';
import { r2ConnectOrigin } from '../r2-connect';

// The real SDK and presigner, no network: signing is local. The point is the
// URL the browser will be handed, so nothing here is mocked.
const ACCOUNT = '0123456789abcdef0123456789abcdef';

afterEach(() => vi.unstubAllEnvs());

describe('a signed upload URL is one the dashboard CSP allows', () => {
  it('lands on the account host named in connect-src, with the bucket in the path', async () => {
    vi.stubEnv('R2_ENDPOINT', '');
    vi.stubEnv('R2_ACCOUNT_ID', ACCOUNT);
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-access');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');
    vi.stubEnv('R2_BUCKET', 'beco-product-images');
    const { createStagedUpload } = await import('../product-storage');

    const { key, url } = await createStagedUpload('image/jpeg');
    const signed = new URL(url);

    // Virtual host style would be beco-product-images.<account>.r2..., which
    // the policy refuses, sending every upload down the form post fallback.
    expect(signed.origin).toBe(r2ConnectOrigin({ R2_ACCOUNT_ID: ACCOUNT }));
    expect(signed.pathname).toBe(`/beco-product-images/${key}`);
  });
});
