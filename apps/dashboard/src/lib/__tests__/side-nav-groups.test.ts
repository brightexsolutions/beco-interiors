import { afterEach, describe, expect, it } from 'vitest';
import type { NavGroup } from '../nav-items';
import { SIDE_NAV_OPEN_KEY, activeGroupLabel, openGroups, readStoredOpenGroups, storeOpenGroups } from '../side-nav-groups';

const groups: NavGroup[] = [
  { label: 'Home', items: [{ href: '/', label: 'Overview' }] },
  { label: 'Sales', items: [{ href: '/quotes', label: 'Quotes' }, { href: '/orders', label: 'Orders' }] },
  { label: 'Catalogue', items: [{ href: '/products', label: 'Catalogue' }] },
  { label: 'Admin', items: [{ href: '/users', label: 'Users' }, { href: '/settings', label: 'Settings' }] },
];

afterEach(() => window.localStorage.clear());

describe('side nav groups, D144', () => {
  it('opens Home and Sales on a first visit and folds the rest', () => {
    expect([...openGroups(groups, '/', null)].sort()).toEqual(['Home', 'Sales']);
  });

  it('always opens the group holding the current screen, nested screens included', () => {
    expect(openGroups(groups, '/settings', null).has('Admin')).toBe(true);
    expect(openGroups(groups, '/products/import', []).has('Catalogue')).toBe(true);
    expect(activeGroupLabel(groups, '/quotes/abc')).toBe('Sales');
  });

  it('does not count Overview as active on every screen', () => {
    expect(activeGroupLabel(groups, '/users')).toBe('Admin');
    expect(openGroups(groups, '/users', []).has('Home')).toBe(false);
  });

  it('keeps the stored choice, ignoring groups this role no longer has', () => {
    expect([...openGroups(groups, '/orders', ['Admin', 'Content'])].sort()).toEqual(['Admin', 'Sales']);
  });

  it('round trips the choice through this browser and survives junk in storage', () => {
    expect(readStoredOpenGroups()).toBeNull();
    storeOpenGroups(new Set(['Admin']));
    expect(readStoredOpenGroups()).toEqual(['Admin']);
    window.localStorage.setItem(SIDE_NAV_OPEN_KEY, '{not json');
    expect(readStoredOpenGroups()).toBeNull();
    window.localStorage.setItem(SIDE_NAV_OPEN_KEY, '[1,2]');
    expect(readStoredOpenGroups()).toBeNull();
  });
});
