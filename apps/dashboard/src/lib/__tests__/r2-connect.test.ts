import { describe, expect, it } from 'vitest';
import { r2ConnectOrigin } from '../r2-connect';

const ACCOUNT = '0123456789abcdef0123456789abcdef';

describe('r2ConnectOrigin, D150', () => {
  it("names the account's own R2 host", () => {
    expect(r2ConnectOrigin({ R2_ACCOUNT_ID: ACCOUNT })).toBe(`https://${ACCOUNT}.r2.cloudflarestorage.com`);
  });

  it('leaves out the placeholder Vercel pulls for a Sensitive variable, and anything else malformed', () => {
    expect(r2ConnectOrigin({ R2_ACCOUNT_ID: '[sensitive]' })).toBe('');
    expect(r2ConnectOrigin({ R2_ACCOUNT_ID: 'acct' })).toBe('');
    expect(r2ConnectOrigin({ R2_ACCOUNT_ID: `${ACCOUNT}.evil.example` })).toBe('');
    expect(r2ConnectOrigin({})).toBe('');
  });

  it('prefers the local stand in when one is set', () => {
    expect(r2ConnectOrigin({ R2_ENDPOINT: 'http://127.0.0.1:9100', R2_ACCOUNT_ID: ACCOUNT })).toBe('http://127.0.0.1:9100');
  });
});
