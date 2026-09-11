import { describe, expect, it } from 'vitest';
import { resolveAdminRole, resolveSessionUser } from '../session';

type Row = {
  role: string;
  is_active: boolean;
  must_change_password?: boolean;
  email?: string;
  full_name?: string;
} | null;

/** A stand-in for the session client, resolving one `users` row lookup. */
const clientReturning = (row: Row) =>
  ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row }),
        }),
      }),
    }),
  }) as unknown as Parameters<typeof resolveAdminRole>[0];

describe('resolveAdminRole', () => {
  it('returns the role for an active beco_admin', async () => {
    expect(await resolveAdminRole(clientReturning({ role: 'beco_admin', is_active: true }), 'u'))
      .toBe('beco_admin');
  });

  it('returns the role for an active brightex_admin', async () => {
    expect(await resolveAdminRole(clientReturning({ role: 'brightex_admin', is_active: true }), 'u'))
      .toBe('brightex_admin');
  });

  it('returns null for a valid session whose role is not an admin one', async () => {
    expect(await resolveAdminRole(clientReturning({ role: 'beco_sales', is_active: true }), 'u'))
      .toBeNull();
  });

  it('returns null for an admin whose account is deactivated', async () => {
    expect(await resolveAdminRole(clientReturning({ role: 'beco_admin', is_active: false }), 'u'))
      .toBeNull();
  });

  it('returns null when there is no users row at all', async () => {
    expect(await resolveAdminRole(clientReturning(null), 'u')).toBeNull();
  });
});

describe('resolveSessionUser', () => {
  it('returns the full shape for an active user', async () => {
    const row = {
      role: 'beco_sales',
      is_active: true,
      must_change_password: true,
      email: 's@beco.co.ke',
      full_name: 'Sam Odhiambo',
    };
    expect(await resolveSessionUser(clientReturning(row), 'u1')).toEqual({
      userId: 'u1',
      email: 's@beco.co.ke',
      fullName: 'Sam Odhiambo',
      role: 'beco_sales',
      isActive: true,
      mustChangePassword: true,
    });
  });

  it('nulls the role for an inactive user, matching current_user_role() in Postgres', async () => {
    const row = { role: 'beco_admin', is_active: false, must_change_password: false, email: 'a@beco.co.ke' };
    const user = await resolveSessionUser(clientReturning(row), 'u1');
    expect(user?.role).toBeNull();
    expect(user?.isActive).toBe(false);
  });

  it('returns null when there is no row', async () => {
    expect(await resolveSessionUser(clientReturning(null), 'u1')).toBeNull();
  });
});
