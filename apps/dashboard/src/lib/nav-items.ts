import type { UserRole } from '@beco/types';
import { ROLE_LANDING, canAccess, type AccessGrants } from './access';

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
  { href: '/studio/blog', label: 'Blog' },
  { href: '/audit', label: 'Audit' },
];

export const navItemsFor = (role: UserRole, grants: AccessGrants = {}): NavItem[] =>
  ALL.filter((item) => canAccess(role, item.href, grants));

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * The same sections, grouped for the desktop sidebar (D106): a group heading
 * names the job, the items under it are the screens. A group with nothing a
 * role may reach is not drawn. Overview leads for the roles that land on it;
 * a salesperson's first screen is Quotes, so for them it is not listed.
 */
const GROUPS: ReadonlyArray<{ label: string; hrefs: readonly string[] }> = [
  { label: 'Sales', hrefs: ['/quotes', '/orders'] },
  { label: 'Catalogue', hrefs: ['/products'] },
  { label: 'Content', hrefs: ['/announcements', '/studio/blog'] },
  { label: 'Insight', hrefs: ['/reports'] },
  { label: 'Admin', hrefs: ['/users', '/settings', '/audit'] },
];

export const navGroupsFor = (role: UserRole, grants: AccessGrants = {}): NavGroup[] => {
  const allowed = navItemsFor(role, grants);
  const groups: NavGroup[] = [];
  if (ROLE_LANDING[role] === '/') groups.push({ label: 'Home', items: [{ href: '/', label: 'Overview' }] });
  for (const group of GROUPS) {
    const items = group.hrefs
      .map((href) => allowed.find((item) => item.href === href))
      .filter((item): item is NavItem => item !== undefined);
    if (items.length > 0) groups.push({ label: group.label, items });
  }
  return groups;
};

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
  return {
    sectionHref: section.href,
    sectionLabel: section.label,
    pageLabel: nestedPageLabel(section.href, page),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nestedPageLabel(sectionHref: string, page: string): string {
  if (page === 'import' && sectionHref === '/products') return 'Drive import';
  if (page === 'new') {
    if (sectionHref === '/quotes') return 'New quote';
    if (sectionHref === '/studio/blog') return 'New article';
  }
  if (UUID.test(page)) {
    if (sectionHref === '/studio/blog') return 'Edit article';
    return 'Edit';
  }
  return page;
}

export interface BottomNav {
  /** The items on the bar itself, at most four. */
  items: NavItem[];
  /** Everything else the role may reach, behind More. Empty hides More. */
  more: NavItem[];
  /** Whether the bar carries the raised New quote action in its middle. */
  newQuote: boolean;
}

/**
 * The phone's bottom bar (D111): the three or four screens a role lives in,
 * under the thumb, with New quote raised in the middle for anyone who
 * raises quotes and the rest of the sections behind More. Built from the
 * same access map as everything else, so the bar can never offer a screen
 * the proxy would refuse.
 *
 *   sales            Quotes, New quote, Orders
 *   product manager  Catalogue
 *   admins           Overview, Quotes, New quote, Orders, More
 */
export const bottomNavFor = (role: UserRole, grants: AccessGrants = {}): BottomNav => {
  const allowed = navItemsFor(role, grants);
  // A role with no sections (the editor) gets no bar: Overview alone is not
  // navigation, it is the screen they are already on.
  if (allowed.length === 0) return { items: [], more: [], newQuote: false };
  const base: NavItem[] = [];
  if (ROLE_LANDING[role] === '/') base.push({ href: '/', label: 'Overview' });
  base.push(...allowed);
  const newQuote = canAccess(role, '/quotes', grants);
  const slots = newQuote ? 3 : 4;
  const items = base.slice(0, slots);
  const more = base.slice(slots);
  return { items, more, newQuote };
};
