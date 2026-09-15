import { describe, expect, it } from 'vitest';
import { isNavItemActive } from '../nav';

describe('isNavItemActive', () => {
  it('matches a nav item on its own exact page', () => {
    expect(isNavItemActive('/shop', '/shop')).toBe(true);
    expect(isNavItemActive('/contact', '/contact')).toBe(true);
  });

  it('stays lit on a subpage, so opening a category does not go dark', () => {
    expect(isNavItemActive('/shop/handles', '/shop')).toBe(true);
    expect(isNavItemActive('/shop/12mm-sintered-stones', '/shop')).toBe(true);
  });

  it('does not light a sibling that merely shares a prefix character', () => {
    // /shopping would be a false positive for a naive startsWith('/shop').
    expect(isNavItemActive('/shopping', '/shop')).toBe(false);
  });

  it('does not light unrelated pages', () => {
    expect(isNavItemActive('/gallery', '/shop')).toBe(false);
    expect(isNavItemActive('/about', '/contact')).toBe(false);
  });

  it('matches home only on the exact root, never as a prefix', () => {
    expect(isNavItemActive('/', '/')).toBe(true);
    expect(isNavItemActive('/shop', '/')).toBe(false);
  });
});
