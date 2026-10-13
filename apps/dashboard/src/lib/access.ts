import type { DashboardModule, UserRole } from '@beco/types';
import { DASHBOARD_MODULES } from '@beco/types';

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
 * audit log and the Users screen are Brightex by default. A Brightex admin
 * can assign `can_read_audit` or `can_manage_users` (D135) on another user;
 * those grants travel on the session.
 *
 * D136 adds module grants: a named person can be let into any section in
 * `DASHBOARD_MODULES` their role does not carry. The grant opens the screen
 * and the reads behind it (`has_module()` in migration 70); writes stay with
 * the role, which `accessLevel` reports as `read` so the shell can say so.
 */

const ADMINS = ['beco_admin', 'brightex_admin'] as const;

/** beco_admin or brightex_admin: the two roles that act above the counter (D110). */
export const isAdminRole = (role: UserRole): boolean => (ADMINS as readonly UserRole[]).includes(role);

export type StaffGrant = 'audit' | 'users';

export interface AccessGrants {
  readonly canWriteBlog?: boolean;
  readonly canReadAudit?: boolean;
  readonly canManageUsers?: boolean;
  /** Module grants, D136. */
  readonly modules?: readonly string[];
}

interface RouteRule {
  /** Matches the path itself or any path under it (`/quotes` covers
   *  `/quotes/new` and `/quotes/BEC-Q-00042`). */
  readonly prefix: string;
  readonly roles: readonly UserRole[];
  /** Extra door besides the role list. */
  readonly grant?: StaffGrant;
  /** The module a grant can open this path with, D136. Absent for a path
   *  no grant ever opens. */
  readonly module?: DashboardModule;
}

/**
 * Longest prefix wins, so order does not matter, but they are listed
 * roughly in nav order for reading. A path that matches no rule is allowed
 * for any signed-in, active, unflagged user: `/` and `/change-password` are
 * the only such paths today, and each does its own thing.
 */
export const ROUTE_RULES: readonly RouteRule[] = [
  { prefix: '/quotes', roles: ['beco_sales', ...ADMINS], module: 'quotes' },
  { prefix: '/orders', roles: ['beco_sales', ...ADMINS], module: 'orders' },
  // Every operations role reads the client list (D130); the editor has no
  // operations screen. Writes are narrower, decided in the actions and RLS.
  { prefix: '/customers', roles: ['beco_sales', 'beco_product_manager', ...ADMINS], module: 'customers' },
  { prefix: '/products', roles: ['beco_product_manager', ...ADMINS], module: 'products' },
  // The Drive import rewrites the catalogue from a folder. Brightex runs it (D115).
  { prefix: '/products/import', roles: ['brightex_admin'] },
  { prefix: '/announcements', roles: [...ADMINS], module: 'announcements' },
  { prefix: '/reports', roles: [...ADMINS], module: 'reports' },
  { prefix: '/leaderboard', roles: [...ADMINS], module: 'reports' },
  { prefix: '/users', roles: ['brightex_admin'], grant: 'users', module: 'users' },
  { prefix: '/settings', roles: [...ADMINS], module: 'settings' },
  { prefix: '/launch', roles: ['brightex_admin'] },
  { prefix: '/studio', roles: ['brightex_admin'] },
  { prefix: '/audit', roles: ['brightex_admin'], grant: 'audit', module: 'audit' },
];

/** What each module is called on the Permissions screen and in the guide. */
export const MODULE_LABEL: Record<DashboardModule, string> = {
  quotes: 'Quotes',
  orders: 'Orders',
  customers: 'Customers',
  products: 'Catalogue',
  announcements: 'Announcements',
  reports: 'Reports',
  users: 'Users',
  settings: 'Settings',
  audit: 'Audit',
};

/** One line on what a module grant lets the person see. */
export const MODULE_HINT: Record<DashboardModule, string> = {
  quotes: 'Every quote and its lines, read only.',
  orders: 'Every order and its payments, read only.',
  customers: 'The client list and each record, read only.',
  products: 'Ranges, products, stock and prices.',
  announcements: 'The website announcement bar.',
  reports: 'Sales, conversion and the team figures.',
  users: 'Who has an account, read only.',
  settings: 'VAT, quote terms, payment details and contact.',
  audit: 'The audit log: who changed what, and when.',
};

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
  if (rule.grant === 'audit' && grants.canReadAudit) return true;
  if (rule.grant === 'users' && grants.canManageUsers) return true;
  return false;
};

const moduleAllows = (rule: RouteRule, grants: AccessGrants): boolean =>
  rule.module !== undefined && (grants.modules ?? []).includes(rule.module);

export type AccessLevel = 'full' | 'read' | 'none';

/**
 * How far a person gets on a path. `full` by role or by a staff grant,
 * which carries its writes with it; `read` by module grant alone, which
 * opens the screen and the reads behind it while RLS keeps the writes
 * with the role; `none` otherwise.
 */
export const accessLevel = (role: UserRole, pathname: string, grants: AccessGrants = {}): AccessLevel => {
  const rule = ruleFor(pathname);
  if (!rule) return 'full';
  if (rule.roles.includes(role) || grantAllows(rule, grants)) return 'full';
  if (moduleAllows(rule, grants)) return 'read';
  return 'none';
};

/** Whether a role may load a path. An ungated path is allowed for everyone
 *  signed in; the caller has already checked the session. */
export const canAccess = (role: UserRole, pathname: string, grants: AccessGrants = {}): boolean =>
  accessLevel(role, pathname, grants) !== 'none';

/** Whether a role carries a module without any grant: the same answer as
 *  `role_covers_module()` in migration 70. */
export const roleCoversModule = (role: UserRole, module: DashboardModule): boolean =>
  ROUTE_RULES.some((rule) => rule.module === module && rule.roles.includes(role));

/**
 * The modules a person may hand on to someone else, D136. Brightex: all of
 * them. A holder of the staff grant: what they reach themselves, by role,
 * by grant or by module. Anyone else: none.
 */
export const grantableModules = (role: UserRole, grants: AccessGrants = {}): DashboardModule[] => {
  if (role === 'brightex_admin') return [...DASHBOARD_MODULES];
  if (!grants.canManageUsers) return [];
  return DASHBOARD_MODULES.filter(
    (module) =>
      roleCoversModule(role, module) ||
      (grants.modules ?? []).includes(module) ||
      module === 'users' ||
      (module === 'audit' && Boolean(grants.canReadAudit)),
  );
};

export const isDashboardModule = (value: string): value is DashboardModule =>
  (DASHBOARD_MODULES as readonly string[]).includes(value);

export const grantsFrom = (user: AccessGrants & { moduleGrants?: readonly string[] }): AccessGrants => ({
  canWriteBlog: Boolean(user.canWriteBlog),
  canReadAudit: Boolean(user.canReadAudit),
  canManageUsers: Boolean(user.canManageUsers),
  modules: [...(user.modules ?? user.moduleGrants ?? [])].filter(isDashboardModule),
});
