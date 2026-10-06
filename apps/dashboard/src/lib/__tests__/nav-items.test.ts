import { describe, expect, it } from 'vitest';
import type { UserRole } from '@beco/types';
import { canAccess } from '../access';
import { navContext, navGroupsFor, navItemsFor, bottomNavFor } from '../nav-items';

const ALL_ROLES: UserRole[] = [
  'beco_admin',
  'beco_sales',
  'beco_product_manager',
  'beco_editor',
  'brightex_admin',
];

describe('navItemsFor', () => {
  it('groups the sidebar by job, skipping a group a role cannot reach and Overview for a salesperson', () => {
    expect(navGroupsFor('beco_sales').map((g) => [g.label, g.items.map((i) => i.label)])).toEqual([
      ['Sales', ['Quotes', 'Orders', 'Customers']],
    ]);
    const admin = navGroupsFor('brightex_admin');
    expect(admin.map((g) => g.label)).toEqual(['Home', 'Sales', 'Catalogue', 'Content', 'Insight', 'Admin']);
    expect(admin.find((g) => g.label === 'Admin')!.items.map((i) => i.label)).toEqual(['Users', 'Settings', 'Audit']);
  });

  it('names the Drive import screen under Catalogue on the phone breadcrumb', () => {
    expect(navContext('/products/import')).toEqual({ sectionHref: '/products', sectionLabel: 'Catalogue', pageLabel: 'Drive import' });
  });

  it('gives a salesperson Quotes, Orders and Customers', () => {
    expect(navItemsFor('beco_sales').map((i) => i.href)).toEqual(['/quotes', '/orders', '/customers']);
  });

  it('gives the product manager one Catalogue item, not a separate Ranges or Stock item, and Customers (D130)', () => {
    expect(navItemsFor('beco_product_manager').map((i) => i.href)).toEqual(['/products', '/customers']);
    expect(navItemsFor('beco_product_manager').map((i) => i.label)).toEqual(['Catalogue', 'Customers']);
  });

  it('gives every operations role Customers, and the editor nothing (D130)', () => {
    for (const role of ['beco_sales', 'beco_product_manager', 'beco_admin', 'brightex_admin'] as const) {
      expect(navItemsFor(role).map((i) => i.href)).toContain('/customers');
    }
    expect(navItemsFor('beco_editor').map((i) => i.href)).not.toContain('/customers');
  });

  it('names a customer page on the phone breadcrumb', () => {
    expect(navContext('/customers/6f1c1b2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b')).toEqual({
      sectionHref: '/customers',
      sectionLabel: 'Customers',
      pageLabel: 'Customer',
    });
  });

  it('gives brightex_admin everything, Users included', () => {
    const hrefs = navItemsFor('brightex_admin').map((i) => i.href);
    expect(hrefs).toContain('/users');
    expect(hrefs).toContain('/settings');
    expect(hrefs).toContain('/studio/blog');
    expect(hrefs).toContain('/audit');
  });

  it('hides Blog and Audit from Beco admin until granted', () => {
    const hrefs = navItemsFor('beco_admin').map((i) => i.href);
    expect(hrefs).not.toContain('/studio/blog');
    expect(hrefs).not.toContain('/audit');
    expect(navItemsFor('beco_sales', { canWriteBlog: true }).map((i) => i.href)).not.toContain(
      '/studio/blog',
    );
    expect(navItemsFor('beco_sales', { canReadAudit: true }).map((i) => i.href)).toContain('/audit');
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

describe('navContext', () => {
  it('names a section root as the section, with no nested page', () => {
    expect(navContext('/orders')).toEqual({
      sectionHref: '/orders',
      sectionLabel: 'Orders',
      pageLabel: null,
    });
    expect(navContext('/quotes')).toEqual({
      sectionHref: '/quotes',
      sectionLabel: 'Quotes',
      pageLabel: null,
    });
  });

  it('names the signed-in home Overview', () => {
    expect(navContext('/')).toEqual({
      sectionHref: '/',
      sectionLabel: 'Overview',
      pageLabel: null,
    });
  });

  it('names the nested page under its section', () => {
    expect(navContext('/orders/BEC-O-00036')).toEqual({
      sectionHref: '/orders',
      sectionLabel: 'Orders',
      pageLabel: 'BEC-O-00036',
    });
  });

  it('labels a blog id as Edit article, never the uuid', () => {
    expect(navContext('/studio/blog/e43cf2d0-cafa-48a4-982f-55eb67d4ec25')).toEqual({
      sectionHref: '/studio/blog',
      sectionLabel: 'Blog',
      pageLabel: 'Edit article',
    });
  });

  it('labels the blog create path as New article', () => {
    expect(navContext('/studio/blog/new')?.pageLabel).toBe('New article');
  });

  it('decodes a reference that arrived encoded', () => {
    expect(navContext('/quotes/BEC-Q-00001%2Frev')?.pageLabel).toBe('BEC-Q-00001/rev');
  });

  it('keeps a malformed encoding as the raw segment', () => {
    expect(navContext('/orders/BEC-O-%')?.pageLabel).toBe('BEC-O-%');
  });
});

describe('bottomNavFor (D111)', () => {
  it('gives a salesperson Quotes, Orders and Customers with New quote raised, and nothing behind More', () => {
    const nav = bottomNavFor('beco_sales');
    expect(nav.items.map((i) => i.href)).toEqual(['/quotes', '/orders', '/customers']);
    expect(nav.newQuote).toBe(true);
    expect(nav.more).toEqual([]);
  });

  it('gives an admin Overview, Quotes and Orders on the bar and the rest behind More', () => {
    const nav = bottomNavFor('beco_admin');
    expect(nav.items.map((i) => i.href)).toEqual(['/', '/quotes', '/orders']);
    expect(nav.more.map((i) => i.href)).toEqual(['/products', '/customers', '/announcements', '/reports', '/settings']);
  });

  it('gives Brightex the same bar, with Users, Blog and Audit behind More', () => {
    const nav = bottomNavFor('brightex_admin');
    expect(nav.items.map((i) => i.href)).toEqual(['/', '/quotes', '/orders']);
    expect(nav.more.map((i) => i.href)).toEqual(expect.arrayContaining(['/users', '/settings', '/studio/blog', '/audit']));
  });

  it('gives the product manager Catalogue and Customers, no Import and no New quote (D115, D130)', () => {
    const nav = bottomNavFor('beco_product_manager');
    expect(nav.items.map((i) => i.href)).toEqual(['/products', '/customers']);
    expect(nav.newQuote).toBe(false);
    expect(nav.more).toEqual([]);
  });

  it('gives the editor nothing, since it has no operations screen', () => {
    expect(bottomNavFor('beco_editor').items).toEqual([]);
  });

  it('never lists a path the access map would deny that role', () => {
    for (const role of ['beco_sales', 'beco_product_manager', 'beco_editor', 'beco_admin', 'brightex_admin'] as const) {
      const nav = bottomNavFor(role);
      for (const item of [...nav.items, ...nav.more]) expect(canAccess(role, item.href)).toBe(true);
      if (nav.newQuote) expect(canAccess(role, '/quotes/new')).toBe(true);
    }
  });
});
