import { describe, expect, it } from 'vitest';
import { isSafeR2Key } from '../product-storage';

describe('isSafeR2Key', () => {
  it('accepts a team derivative and refuses traversal', () => {
    expect(isSafeR2Key('team/11111111-1111-4111-8111-111111111111/ab12-400.webp')).toBe(true);
    expect(isSafeR2Key('../etc/passwd')).toBe(false);
    expect(isSafeR2Key('/absolute')).toBe(false);
    expect(isSafeR2Key('')).toBe(false);
  });
});
