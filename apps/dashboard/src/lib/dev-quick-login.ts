/**
 * Seeded local staff, the same six rows as `supabase/seed.sql`. The password
 * is the documented fixture `beco-dev-pass`. This list is the allowlist for
 * the development-only quick login, so a crafted request cannot sign in as
 * an arbitrary address even while `next dev` is running.
 */
export const DEV_QUICK_ACCOUNTS = [
  { email: 'irene.kariuki@beco.co.ke', label: 'Admin' },
  { email: 'sam.odhiambo@beco.co.ke', label: 'Sales' },
  { email: 'aisha.farah@beco.co.ke', label: 'Products' },
  { email: 'beco.brightex.dev@gmail.com', label: 'Brightex' },
] as const;

export const DEV_SEED_PASSWORD = 'beco-dev-pass';

export const isDevQuickLoginEnabled = (): boolean => process.env.NODE_ENV === 'development';

/**
 * Whether the forced first-login password change (A.3) is enforced.
 *
 * Every seeded account starts `must_change_password = true`, which is correct
 * for staging and production and tedious locally: a `db reset` otherwise puts
 * the change-password screen in front of the next six sign-ins before any
 * dashboard work can be reached.
 *
 * Skipped under `next dev` only. The flag itself is left alone in the
 * database rather than cleared, so nothing about the account is destroyed by
 * signing in, and setting DEV_FORCE_PASSWORD_CHANGE=1 puts the real flow back
 * in front of you without a reset. Production and staging are never affected:
 * NODE_ENV is `production` in both, so the first branch decides it.
 */
export const isForcedPasswordChangeEnforced = (): boolean =>
  process.env.NODE_ENV !== 'development' || process.env.DEV_FORCE_PASSWORD_CHANGE === '1';
