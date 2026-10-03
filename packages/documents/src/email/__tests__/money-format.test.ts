import { describe, expect, it } from 'vitest';
import { formatKes } from '../money-format';

describe('formatKes', () => {
  it('prints whole shillings with thousands grouped', () => {
    expect(formatKes(265000)).toBe('KES 265,000');
    expect(formatKes(1234567.4)).toBe('KES 1,234,567');
    expect(formatKes(950)).toBe('KES 950');
    expect(formatKes(0)).toBe('KES 0');
  });

  it('rounds half up and keeps a sign', () => {
    expect(formatKes(8965.52)).toBe('KES 8,966');
    expect(formatKes(-1500)).toBe('-KES 1,500');
  });
});
