import { describe, expect, it } from 'vitest';
import { bearerMatches } from '../bearer';

describe('bearerMatches', () => {
  it('accepts the exact bearer header for the secret', async () => {
    expect(await bearerMatches('Bearer s3cret', 's3cret')).toBe(true);
  });

  it('refuses a wrong secret, a prefix, a different scheme and a missing header', async () => {
    expect(await bearerMatches('Bearer s3cre', 's3cret')).toBe(false);
    expect(await bearerMatches('Bearer s3cret!', 's3cret')).toBe(false);
    expect(await bearerMatches('Basic s3cret', 's3cret')).toBe(false);
    expect(await bearerMatches(null, 's3cret')).toBe(false);
    expect(await bearerMatches(undefined, 's3cret')).toBe(false);
  });

  it('never matches when the secret is unset or empty, so a missing variable closes the door', async () => {
    expect(await bearerMatches('Bearer ', undefined)).toBe(false);
    expect(await bearerMatches('Bearer ', '')).toBe(false);
    expect(await bearerMatches('Bearer undefined', undefined)).toBe(false);
  });
});
