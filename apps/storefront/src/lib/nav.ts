/**
 * Whether a nav item's own destination is the one the reader is currently on.
 *
 * A prefix match, not equality: `/shop` stays lit on `/shop/handles`, or Shop
 * would go dark the moment a reader actually opens a category, which is
 * exactly when "where am I" matters most. Home is the one exception, matched
 * exactly, or it would light on every route in the app.
 *
 * Shared by the desktop nav and the mobile panel, so "is this the current
 * item" is answered once rather than drifting between two `pathname ===`
 * checks that started identical and stopped being kept in sync.
 */
export const isNavItemActive = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
