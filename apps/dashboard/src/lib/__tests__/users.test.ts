import { describe, expect, it, vi } from 'vitest';
import {
  canManageAccount,
  generateIssuedPassword,
  parseStaffPublicPhoto,
  rolesAssignableBy,
  staffPhotoUrl,
  userMutationMessage,
} from '../users';

describe('what a viewer may manage (D135)', () => {
  it('offers Brightex every role and a Beco holder only Beco roles', () => {
    expect(rolesAssignableBy('brightex_admin')).toContain('brightex_admin');
    expect(rolesAssignableBy('beco_admin')).not.toContain('brightex_admin');
    expect(rolesAssignableBy('beco_admin')).toEqual(['beco_admin', 'beco_sales', 'beco_product_manager', 'beco_editor']);
  });

  it('keeps Brightex accounts out of a Beco holder\'s reach', () => {
    expect(canManageAccount('beco_admin', 'brightex_admin')).toBe(false);
    expect(canManageAccount('beco_admin', 'beco_admin')).toBe(true);
    expect(canManageAccount('beco_sales', 'beco_editor')).toBe(true);
    expect(canManageAccount('brightex_admin', 'brightex_admin')).toBe(true);
  });
});

describe('generateIssuedPassword', () => {
  it('is long enough for the first-login floor and not a fixed string', () => {
    const a = generateIssuedPassword();
    const b = generateIssuedPassword();
    expect(a.length).toBeGreaterThanOrEqual(10);
    expect(b.length).toBeGreaterThanOrEqual(10);
    expect(a).not.toBe(b);
  });
});

describe('userMutationMessage', () => {
  it('names a duplicate email without leaking SQLSTATE', () => {
    expect(userMutationMessage({ code: '23505', message: 'duplicate key value' })).toBe(
      'That email already has an account.',
    );
  });

  it('keeps the last-admin sentence a person can act on', () => {
    expect(
      userMutationMessage({ message: 'Cannot deactivate or demote the last active admin of that role' }),
    ).toMatch(/last active admin/i);
  });

  it('does not leak a permission-denied SQLSTATE', () => {
    expect(userMutationMessage({ code: '42501', message: 'not allowed' })).toMatch(/do not have permission/i);
  });

  it('names the sales-only website constraint', () => {
    expect(userMutationMessage({ code: '23514', message: 'users_only_sales_are_public' })).toMatch(
      /only sales accounts/i,
    );
  });
});

describe('parseStaffPublicPhoto', () => {
  it('reads a catalogue stem and ignores junk', () => {
    expect(
      parseStaffPublicPhoto({
        path: 'team/11111111-1111-4111-8111-111111111111/ab12',
        alt: 'Sam at the showroom',
        width: 1600,
        height: 2000,
        blur: 'data:image/webp;base64,xx',
      }),
    ).toEqual({
      path: 'team/11111111-1111-4111-8111-111111111111/ab12',
      alt: 'Sam at the showroom',
      width: 1600,
      height: 2000,
      blur: 'data:image/webp;base64,xx',
    });
    expect(parseStaffPublicPhoto(null)).toBeNull();
    expect(parseStaffPublicPhoto({ alt: 'no path' })).toBeNull();
  });
});

describe('staffPhotoUrl', () => {
  it('points at the local image proxy the way product shots do', () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_HOST', '/api/img');
    expect(staffPhotoUrl('team/u1/ab12', 400)).toBe('/api/img/team/u1/ab12-400.webp');
    vi.unstubAllEnvs();
  });
});
