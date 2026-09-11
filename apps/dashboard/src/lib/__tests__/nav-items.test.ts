import { describe, expect, it } from 'vitest';
import type { UserRole } from '@beco/types';
import { canAccess } from '../access';
import { navItemsFor } from '../nav-items';

const ALL_ROLES: UserRole[] = [
  'beco_admin',
  'beco_sales',
  'beco_product_manager',
  'beco_editor',
  'brightex_admin',
];

describe('navItemsFor', () => {
  it('gives a salesperson just Quotes and Orders', () => {
    expect(navItemsFor('beco_sales').map((i) => i.href)).toEqual(['/quotes', '/orders']);
  });

  it('gives the product manager Stock and Products', () => {
    expect(navItemsFor('beco_product_manager').map((i) => i.href)).toEqual(['/stock', '/products']);
  });

  it('gives brightex_admin everything, Users included', () => {
    const hrefs = navItemsFor('brightex_admin').map((i) => i.href);
    expect(hrefs).toContain('/users');
    expect(hrefs).toContain('/settings');
  });

  it('gives beco_admin everything except Users, per D6', () => {
    const hrefs = navItemsFor('beco_admin').map((i) => i.href);
    expect(hrefs).not.toContain('/users');
    expect(hrefs).toContain('/announcements');
  });

  it('gives beco_editor nothing, since it has no operations screen', () => {
    expect(navItemsFor('beco_editor')).toEqual([]);
  });

  it('never lists a path the access map would deny that role', () => {
    for (const role of ALL_ROLES) {
      for (const item of navItemsFor(role)) {
        expect(canAccess(role, item.href)).toBe(true);
      }
    }
  });
});
