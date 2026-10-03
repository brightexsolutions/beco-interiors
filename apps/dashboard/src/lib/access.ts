import type { UserRole } from '@beco/types';

/**
 * The route half of "role checks in two places" (rule 7, ARCHITECTURE
 * section 12). This is the map the proxy and the pages both read, so a
 * salesperson reaching `/users` is turned away in ONE place that the tests
 * can point at, not re-decided per screen.
 *
 * RLS in Postgres is still the authority. Everything here is a usability
 * layer: it decides what a role SEES, never what it can touch.
 *
 * Blog / Studio is Brightex only (role plus the allowlist, D42). The
 * audit log is Brightex by default. A Brightex admin can assign
 * `can_read_audit` on another user; that grant travels on the session.
 */

const ADMINS = ['beco_admin', 'brightex_admin'] as const;

/** beco_admin or brightex_admin: the two roles that act above the counter (D110). */
export const isAdminRole = (role: UserRole): boolean => (ADMINS as readonly UserRole[]).includes(role);

export type StaffGrant = 'audit';

export interface AccessGrants {
  readonly canWriteBlog?: boolean;
  readonly canReadAudit?: boolean;
}

interface RouteRule {
  /** Matches the path itself or any path under it (`/quotes` covers
   *  `/quotes/new` and `/quotes/BEC-Q-00042`). */
  readonly prefix: string;
  readonly roles: readonly UserRole[];
  /** Extra door besides the role list. */
  readonly grant?: StaffGrant;
}

/**
 * Longest prefix wins, so order does not matter, but they are listed
 * roughly in nav order for reading. A path that matches no rule is allowed
 * for any signed-in, active, unflagged user: `/` and `/change-password` are
 * the only such paths today, and each does its own thing.
 */
export const ROUTE_RULES: readonly RouteRule[] = [
  { prefix: '/quotes', roles: ['beco_sales', ...ADMINS] },
  { prefix: '/orders', roles: ['beco_sales', ...ADMINS] },
  { prefix: '/products', roles: ['beco_product_manager', ...ADMINS] },
  { prefix: '/announcements', roles: [...ADMINS] },
  { prefix: '/reports', roles: [...ADMINS] },
  { prefix: '/leaderboard', roles: [...ADMINS] },
  { prefix: '/users', roles: ['brightex_admin'] },
  { prefix: '/settings', roles: [...ADMINS] },
  { prefix: '/launch', roles: ['brightex_admin'] },
  { prefix: '/studio', roles: ['brightex_admin'] },
  { prefix: '/audit', roles: ['brightex_admin'], grant: 'audit' },
];

/**
 * Where `/` sends each role, and where the forced password-change screen
 * hands off once it is done. "Role based views, not just role based
 * permissions" (PRD section 4.2): a salesperson opens onto their own work,
 * not a stat board they cannot act on.
 *
 * `beco_editor` has no operations screen. It lands on `/`.
 */
export const ROLE_LANDING: Record<UserRole, string> = {
  beco_sales: '/quotes',
  beco_product_manager: '/products',
  beco_editor: '/',
  beco_admin: '/',
  brightex_admin: '/',
};

/** The one path any signed-in active user may reach even while flagged for a
 *  forced password change. Everything else waits behind it. */
export const CHANGE_PASSWORD_PATH = '/change-password';

const underPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** The rule governing a path, or null when nothing gates it. */
export const ruleFor = (pathname: string): RouteRule | null => {
  let match: RouteRule | null = null;
  for (const rule of ROUTE_RULES) {
    if (underPrefix(pathname, rule.prefix) && (!match || rule.prefix.length > match.prefix.length)) {
      match = rule;
    }
  }
  return match;
};

const grantAllows = (rule: RouteRule, grants: AccessGrants): boolean => {
  if (rule.grant === 'audit') return Boolean(grants.canReadAudit);
  return false;
};

/** Whether a role may load a path. An ungated path is allowed for everyone
 *  signed in; the caller has already checked the session. */
export const canAccess = (role: UserRole, pathname: string, grants: AccessGrants = {}): boolean => {
  const rule = ruleFor(pathname);
  if (!rule) return true;
  return rule.roles.includes(role) || grantAllows(rule, grants);
};

export const grantsFrom = (user: AccessGrants): AccessGrants => ({
  canWriteBlog: Boolean(user.canWriteBlog),
  canReadAudit: Boolean(user.canReadAudit),
});
