import { describe, expect, it } from 'vitest';
import type { UserRole } from '@beco/types';
import { canAccess } from '../access';
import { navContext, navItemsFor } from '../nav-items';

const ALL_ROLES: UserRole[] = [
  'beco_admin',
  'beco_sales',
  'beco_product_manager',
  'beco_editor',
  'brightex_admin',
];

describe('navItemsFor', () => {
  it('names the Drive import screen under Catalogue on the phone breadcrumb', () => {
    expect(navContext('/products/import')).toEqual({ sectionHref: '/products', sectionLabel: 'Catalogue', pageLabel: 'Drive import' });
  });

  it('gives a salesperson just Quotes and Orders', () => {
    expect(navItemsFor('beco_sales').map((i) => i.href)).toEqual(['/quotes', '/orders']);
  });

  it('gives the product manager one Catalogue item, not a separate Ranges or Stock item', () => {
    expect(navItemsFor('beco_product_manager').map((i) => i.href)).toEqual(['/products']);
    expect(navItemsFor('beco_product_manager').map((i) => i.label)).toEqual(['Catalogue']);
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
