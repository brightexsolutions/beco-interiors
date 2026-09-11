import { describe, expect, it } from 'vitest';
import type { UserRole } from '@beco/types';
import { ROLE_LANDING, canAccess, ruleFor } from '../access';

const ALL_ROLES: UserRole[] = [
  'beco_admin',
  'beco_sales',
  'beco_product_manager',
  'beco_editor',
  'brightex_admin',
];

describe('canAccess: the dashboard route/role matrix', () => {
  const allowed: Record<string, UserRole[]> = {
    '/quotes': ['beco_sales', 'beco_admin', 'brightex_admin'],
    '/orders': ['beco_sales', 'beco_admin', 'brightex_admin'],
    '/stock': ['beco_product_manager', 'beco_admin', 'brightex_admin'],
    '/products': ['beco_product_manager', 'beco_admin', 'brightex_admin'],
    '/announcements': ['beco_admin', 'brightex_admin'],
    '/reports': ['beco_admin', 'brightex_admin'],
    '/leaderboard': ['beco_admin', 'brightex_admin'],
    '/settings': ['beco_admin', 'brightex_admin'],
    '/launch': ['beco_admin', 'brightex_admin'],
    '/users': ['brightex_admin'],
  };

  for (const [path, roles] of Object.entries(allowed)) {
    it(`${path} admits exactly ${roles.join(', ')}`, () => {
      for (const role of ALL_ROLES) {
        expect(canAccess(role, path)).toBe(roles.includes(role));
      }
    });
  }

  it('applies a rule to everything under its prefix', () => {
    expect(canAccess('beco_sales', '/quotes/new')).toBe(true);
    expect(canAccess('beco_sales', '/quotes/BEC-Q-00042')).toBe(true);
    expect(canAccess('beco_product_manager', '/quotes/new')).toBe(false);
    expect(canAccess('beco_sales', '/users/new')).toBe(false);
  });

  it('does not match a prefix that is only a partial path segment', () => {
    // `/quotes-archive` is not under `/quotes`
    expect(ruleFor('/quotes-archive')).toBeNull();
  });

  it('leaves an ungated path open to any signed-in role', () => {
    for (const role of ALL_ROLES) {
      expect(canAccess(role, '/')).toBe(true);
      expect(canAccess(role, '/change-password')).toBe(true);
    }
  });
});

describe('ROLE_LANDING', () => {
  it('gives every role a landing path', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_LANDING[role]).toMatch(/^\//);
    }
  });

  it('sends operational roles to their own work and admins to the home', () => {
    expect(ROLE_LANDING.beco_sales).toBe('/quotes');
    expect(ROLE_LANDING.beco_product_manager).toBe('/products');
    expect(ROLE_LANDING.beco_admin).toBe('/');
    expect(ROLE_LANDING.brightex_admin).toBe('/');
    expect(ROLE_LANDING.beco_editor).toBe('/');
  });

  it('lands each role somewhere it is actually allowed', () => {
    for (const role of ALL_ROLES) {
      expect(canAccess(role, ROLE_LANDING[role])).toBe(true);
    }
  });
});
