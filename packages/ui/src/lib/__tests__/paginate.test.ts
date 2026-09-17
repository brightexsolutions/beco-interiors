import { describe, expect, it } from 'vitest';
import { paginate } from '../paginate';

const rows = Array.from({ length: 20 }, (_, i) => i + 1);

describe('paginate', () => {
  it('returns the first page by default size', () => {
    const result = paginate(rows, 1);
    expect(result.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result).toMatchObject({ page: 1, pageCount: 3, from: 1, to: 8, total: 20 });
  });

  it('returns a later page, so Next actually changes the row set', () => {
    const result = paginate(rows, 2, 8);
    expect(result.items).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
    expect(result).toMatchObject({ page: 2, from: 9, to: 16 });
  });

  it('clamps a page past the end, so a stale URL still shows rows', () => {
    const result = paginate(rows, 99, 8);
    expect(result.page).toBe(3);
    expect(result.items).toEqual([17, 18, 19, 20]);
    expect(result.from).toBe(17);
    expect(result.to).toBe(20);
  });

  it('clamps a page below 1, and treats NaN as page 1', () => {
    expect(paginate(rows, 0, 8).page).toBe(1);
    expect(paginate(rows, Number.NaN, 8).page).toBe(1);
  });

  it('an empty list is one empty page, not a divide-by-zero', () => {
    const result = paginate([], 1, 8);
    expect(result).toMatchObject({ page: 1, pageCount: 1, total: 0, from: 0, to: 0, items: [] });
  });
});
