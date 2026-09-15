import { describe, expect, it } from 'vitest';
import { resolveAdminRole } from '../session';

/** A stand-in for the session client, resolving one `users` row lookup. */
const clientReturning = (row: { role: string; is_active: boolean } | null) =>
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
