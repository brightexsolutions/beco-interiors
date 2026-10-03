import { describe, expect, it } from 'vitest';
import { safeReturnPath } from '../return-path';

describe('safeReturnPath', () => {
  it('keeps a path on this origin, query and all', () => {
    expect(safeReturnPath('/quotes')).toBe('/quotes');
    expect(safeReturnPath('/quotes/BQ-0001?tab=lines')).toBe('/quotes/BQ-0001?tab=lines');
    expect(safeReturnPath('/')).toBe('/');
  });

  it('turns an absolute URL away', () => {
    expect(safeReturnPath('https://evil.example/steal')).toBe('/');
    expect(safeReturnPath('javascript:alert(1)')).toBe('/');
  });

  it('turns the protocol-relative and backslash shapes away, which start with a slash', () => {
    expect(safeReturnPath('//evil.example/steal')).toBe('/');
    expect(safeReturnPath('/\\evil.example')).toBe('/');
    expect(safeReturnPath('///evil.example')).toBe('/');
  });

  it('refuses control characters, so a header cannot be split', () => {
    expect(safeReturnPath('/quotes\r\nSet-Cookie: x=y')).toBe('/');
  });

  it('refuses non-strings, the empty string and anything path-length absurd', () => {
    expect(safeReturnPath(null)).toBe('/');
    expect(safeReturnPath(undefined, '/orders')).toBe('/orders');
    expect(safeReturnPath('')).toBe('/');
    expect(safeReturnPath(`/${'a'.repeat(600)}`)).toBe('/');
  });
});
