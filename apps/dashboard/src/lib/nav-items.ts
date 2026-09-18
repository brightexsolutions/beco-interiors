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
  { href: '/products', label: 'Catalogue' },
  { href: '/announcements', label: 'Announcements' },
  { href: '/reports', label: 'Reports' },
  { href: '/users', label: 'Users' },
  { href: '/settings', label: 'Settings' },
];

export const navItemsFor = (role: UserRole): NavItem[] =>
  ALL.filter((item) => canAccess(role, item.href));

export interface NavContext {
  sectionHref: string;
  sectionLabel: string;
  pageLabel: string | null;
}

/**
 * Where the phone breadcrumb should read. Section roots name the section.
 * Nested screens add the page under it.
 */
export function navContext(pathname: string): NavContext | null {
  const path = pathname.split('?')[0] ?? pathname;
  if (path === '/' || path === '') {
    return { sectionHref: '/', sectionLabel: 'Overview', pageLabel: null };
  }

  const section = [...ALL]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => path === item.href || path.startsWith(`${item.href}/`));
  if (!section) return null;

  const remainder = path.slice(section.href.length).replace(/^\//, '');
  const [raw] = remainder.split('/');
  if (!raw) {
    return {
      sectionHref: section.href,
      sectionLabel: section.label,
      pageLabel: null,
    };
  }

  let page = raw;
  try {
    page = decodeURIComponent(raw);
  } catch {
    page = raw;
  }
  const pageLabel = section.href === '/quotes' && page === 'new' ? 'New quote' : page;
  return {
    sectionHref: section.href,
    sectionLabel: section.label,
    pageLabel,
  };
}
