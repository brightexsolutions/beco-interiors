import type { NavGroup } from './nav-items';

export const SIDE_NAV_OPEN_KEY = 'beco-dashboard-side-nav';

/** Open on a first visit: the day's work. Everything else folds away. */
const OPEN_BY_DEFAULT: readonly string[] = ['Home', 'Sales'];

export const isActiveHref = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

/** The group holding the screen the reader is on, which is never folded. */
export const activeGroupLabel = (groups: NavGroup[], pathname: string): string | null =>
  groups.find((group) => group.items.some((item) => isActiveHref(pathname, item.href)))?.label ?? null;

/**
 * Which groups are open: the stored choice when there is one, else Home and
 * Sales, and in both cases the group holding the current screen.
 */
export function openGroups(groups: NavGroup[], pathname: string, stored: readonly string[] | null): Set<string> {
  const labels = new Set(groups.map((group) => group.label));
  const open = new Set((stored ?? OPEN_BY_DEFAULT).filter((label) => labels.has(label)));
  const active = activeGroupLabel(groups, pathname);
  if (active) open.add(active);
  return open;
}

export function readStoredOpenGroups(): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SIDE_NAV_OPEN_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((label) => typeof label === 'string') ? parsed : null;
  } catch {
    return null;
  }
}

export function storeOpenGroups(open: Iterable<string>): void {
  try {
    window.localStorage.setItem(SIDE_NAV_OPEN_KEY, JSON.stringify([...open]));
  } catch {
    /* private mode: the choice lasts until the next load */
  }
}
