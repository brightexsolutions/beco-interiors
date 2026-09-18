'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@beco/ui';
import {
  applyDashboardTheme,
  readDashboardTheme,
  toggleDashboardTheme,
  type DashboardTheme,
} from '@/lib/dashboard-theme';

/**
 * Appearance control for the signed-in chrome. Writes `html.dark` and
 * localStorage so the next load matches. The matching inline script in
 * the root layout paints the class before React hydrates.
 */
export function ThemeToggle() {
  // Always start as light so the server HTML and the first client render
  // match. The layout script may already have set `html.dark`; we sync the
  // button label and icon after mount.
  const [theme, setTheme] = useState<DashboardTheme>('light');

  useEffect(() => {
    const next = readDashboardTheme();
    setTheme(next);
    applyDashboardTheme(next);
  }, []);

  const dark = theme === 'dark';

  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={dark ? 'Use light appearance' : 'Use dark appearance'}
      onClick={() => setTheme((current) => toggleDashboardTheme(current))}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-charcoal"
    >
      <Icon name={dark ? 'sun' : 'moon'} className="h-5 w-5" />
    </button>
  );
}
