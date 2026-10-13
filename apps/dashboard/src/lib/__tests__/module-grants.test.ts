import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DASHBOARD_MODULES } from '@beco/types';
import { setModuleGrantsSchema } from '@beco/validation';
import { MODULE_HINT, MODULE_LABEL, accessLevel, canAccess, grantableModules, grantsFrom, roleCoversModule } from '../access';
import { bottomNavFor, navItemsFor } from '../nav-items';

describe('module grants, D136', () => {
  it('lists the same modules as module_keys() in migration 70, so the two cannot drift', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/00000000000070_module_grants.sql'), 'utf8');
    const match = sql.match(/select array\[([^\]]+)\]/);
    expect(match).not.toBeNull();
    const keys = match![1]!.split(',').map((key) => key.trim().replace(/^'|'$/g, ''));
    expect(keys).toEqual([...DASHBOARD_MODULES]);
    for (const module of DASHBOARD_MODULES) {
      expect(MODULE_LABEL[module]).toBeTruthy();
      expect(MODULE_HINT[module]).toBeTruthy();
    }
  });

  it('opens a section read only by grant, and leaves the rest closed', () => {
    const grants = { modules: ['quotes'] };
    expect(accessLevel('beco_product_manager', '/quotes', grants)).toBe('read');
    expect(accessLevel('beco_product_manager', '/quotes/BEC-Q-00042', grants)).toBe('read');
    expect(canAccess('beco_product_manager', '/quotes', grants)).toBe(true);
    expect(accessLevel('beco_product_manager', '/orders', grants)).toBe('none');
    expect(accessLevel('beco_product_manager', '/products', grants)).toBe('full');
    expect(accessLevel('beco_editor', '/', grants)).toBe('full');
  });

  it('never opens Studio, the Drive import or the launch control, whatever is granted', () => {
    const grants = { modules: [...DASHBOARD_MODULES] };
    expect(canAccess('beco_admin', '/studio/blog', grants)).toBe(false);
    expect(canAccess('beco_admin', '/products/import', grants)).toBe(false);
    expect(canAccess('beco_admin', '/launch', grants)).toBe(false);
    expect(canAccess('beco_sales', '/users', grants)).toBe(true);
    expect(canAccess('beco_sales', '/audit', grants)).toBe(true);
    expect(canAccess('beco_sales', '/reports', grants)).toBe(true);
    expect(canAccess('beco_sales', '/leaderboard', grants)).toBe(true);
  });

  it('puts a granted section in the nav, so the bar and the proxy agree', () => {
    const grants = { modules: ['reports', 'quotes'] };
    expect(navItemsFor('beco_product_manager', grants).map((i) => i.href)).toEqual(['/quotes', '/products', '/customers', '/reports']);
    expect(bottomNavFor('beco_product_manager', grants).newQuote).toBe(true);
    expect(navItemsFor('beco_editor', { modules: ['settings'] }).map((i) => i.href)).toEqual(['/settings']);
  });

  it('says which modules a role carries on its own', () => {
    expect(roleCoversModule('beco_sales', 'quotes')).toBe(true);
    expect(roleCoversModule('beco_sales', 'reports')).toBe(false);
    expect(roleCoversModule('beco_product_manager', 'products')).toBe(true);
    expect(roleCoversModule('beco_admin', 'users')).toBe(false);
    expect(roleCoversModule('brightex_admin', 'audit')).toBe(true);
  });

  it('lets Brightex grant anything, a staff manager only what they hold, and anyone else nothing', () => {
    expect(grantableModules('brightex_admin')).toEqual([...DASHBOARD_MODULES]);
    expect(grantableModules('beco_admin')).toEqual([]);
    expect(grantableModules('beco_sales', { canManageUsers: true })).toEqual(['quotes', 'orders', 'customers', 'users']);
    expect(grantableModules('beco_sales', { canManageUsers: true, modules: ['reports'] })).toEqual([
      'quotes',
      'orders',
      'customers',
      'reports',
      'users',
    ]);
    expect(grantableModules('beco_admin', { canManageUsers: true, canReadAudit: true })).toEqual([
      'quotes',
      'orders',
      'customers',
      'products',
      'announcements',
      'reports',
      'users',
      'settings',
      'audit',
    ]);
  });

  it('carries module grants from the session row and drops anything unknown', () => {
    expect(grantsFrom({ moduleGrants: ['quotes', 'launch', 'audit'] }).modules).toEqual(['quotes', 'audit']);
    expect(grantsFrom({ modules: ['orders'] }).modules).toEqual(['orders']);
    expect(grantsFrom({}).modules).toEqual([]);
  });

  it('validates the whole set, collapsing duplicates and refusing an unknown section', () => {
    const ok = setModuleGrantsSchema.safeParse({
      userId: '11111111-1111-4111-8111-111111111111',
      updatedAt: '2026-10-12T00:00:00.000Z',
      modules: ['quotes', 'quotes', 'reports'],
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.modules).toEqual(['quotes', 'reports']);
    const bad = setModuleGrantsSchema.safeParse({
      userId: '11111111-1111-4111-8111-111111111111',
      updatedAt: 'x',
      modules: ['launch'],
    });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0]?.message).toMatch(/not a dashboard section/);
  });
});
