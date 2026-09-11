import type { UserRole } from '@beco/types';

/**
 * The route half of "role checks in two places" (rule 7, ARCHITECTURE
 * section 12). This is the map the proxy and the pages both read, so a
 * salesperson reaching `/users` is turned away in ONE place that the tests
 * can point at, not re-decided per screen.
 *
 * RLS in Postgres is still the authority. Everything here is a usability
 * layer: it decides what a role SEES, never what it can touch.
 */

const ADMINS = ['beco_admin', 'brightex_admin'] as const;

interface RouteRule {
  /** Matches the path itself or any path under it (`/quotes` covers
   *  `/quotes/new` and `/quotes/BEC-Q-00042`). */
  readonly prefix: string;
  readonly roles: readonly UserRole[];
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
  { prefix: '/stock', roles: ['beco_product_manager', ...ADMINS] },
  { prefix: '/products', roles: ['beco_product_manager', ...ADMINS] },
  { prefix: '/announcements', roles: [...ADMINS] },
  { prefix: '/reports', roles: [...ADMINS] },
  { prefix: '/leaderboard', roles: [...ADMINS] },
  { prefix: '/users', roles: ['brightex_admin'] },
  { prefix: '/settings', roles: [...ADMINS] },
  { prefix: '/launch', roles: [...ADMINS] },
];

/**
 * Where `/` sends each role, and where the forced password-change screen
 * hands off once it is done. "Role based views, not just role based
 * permissions" (PRD section 4.2): a salesperson opens onto their own work,
 * not a stat board they cannot act on.
 *
 * `beco_editor` has no operations screen in M5 (its work is the blog, which
 * is Studio, M7). It lands on `/`, which renders a plain "nothing assigned
 * yet" page for that role rather than bouncing a real signed-in user out.
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

/** Whether a role may load a path. An ungated path is allowed for everyone
 *  signed in; the caller has already checked the session. */
export const canAccess = (role: UserRole, pathname: string): boolean => {
  const rule = ruleFor(pathname);
  return rule ? rule.roles.includes(role) : true;
};
