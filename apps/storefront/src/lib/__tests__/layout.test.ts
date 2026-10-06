import { describe, expect, it } from 'vitest';
import { desktopColumns } from '../layout';

describe('desktopColumns', () => {
  it('gives each tile a column, so three tiles fill the row', () => {
    expect(desktopColumns(3)).toBe('lg:grid-cols-3');
    expect(desktopColumns(2)).toBe('lg:grid-cols-2');
    expect(desktopColumns(1)).toBe('lg:grid-cols-1');
  });

  it('stops at four columns, wrapping anything beyond onto the next row', () => {
    expect(desktopColumns(4)).toBe('lg:grid-cols-4');
    expect(desktopColumns(7)).toBe('lg:grid-cols-4');
  });

  it('never returns an empty class for an empty or bad count', () => {
    expect(desktopColumns(0)).toBe('lg:grid-cols-1');
    expect(desktopColumns(-2)).toBe('lg:grid-cols-1');
  });
});
