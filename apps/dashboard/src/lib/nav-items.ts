import type { UserRole } from '@beco/types';
import { canAccess } from './access';

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Every dashboard section, in nav order. Filtered per role by the access map
 * (`lib/access.ts`), so this list and the proxy can never disagree about
 * what a role may reach.
 *
 * `/launch` is deliberately absent: it is the anniversary campaign control
 * (D80), reached from settings, not a standing section. `/change-password`
 * lives in the account menu, not here.
 */
const ALL: readonly NavItem[] = [
  { href: '/quotes', label: 'Quotes' },
  { href: '/orders', label: 'Orders' },
  { href: '/stock', label: 'Stock' },
  { href: '/products', label: 'Products' },
  { href: '/announcements', label: 'Announcements' },
  { href: '/reports', label: 'Reports' },
  { href: '/users', label: 'Users' },
  { href: '/settings', label: 'Settings' },
];

export const navItemsFor = (role: UserRole): NavItem[] =>
  ALL.filter((item) => canAccess(role, item.href));
