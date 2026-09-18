export const DASHBOARD_THEME_KEY = 'beco-dashboard-theme';

export type DashboardTheme = 'light' | 'dark';

export function isDashboardTheme(value: unknown): value is DashboardTheme {
  return value === 'light' || value === 'dark';
}

export function themeFromPrefers(): DashboardTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function readDashboardTheme(): DashboardTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(DASHBOARD_THEME_KEY);
    if (isDashboardTheme(stored)) return stored;
  } catch {
    /* private mode */
  }
  return themeFromPrefers();
}

export function applyDashboardTheme(theme: DashboardTheme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    window.localStorage.setItem(DASHBOARD_THEME_KEY, theme);
  } catch {
    /* private mode */
  }
}

export function toggleDashboardTheme(current: DashboardTheme): DashboardTheme {
  const next = current === 'dark' ? 'light' : 'dark';
  applyDashboardTheme(next);
  return next;
}
