import { describe, expect, it, afterEach } from 'vitest';
import {
  applyDashboardTheme,
  DASHBOARD_THEME_KEY,
  readDashboardTheme,
  toggleDashboardTheme,
} from '../dashboard-theme';

afterEach(() => {
  document.documentElement.classList.remove('dark');
  window.localStorage.removeItem(DASHBOARD_THEME_KEY);
});

describe('dashboard theme', () => {
  it('pins dark on the document and in storage', () => {
    applyDashboardTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem(DASHBOARD_THEME_KEY)).toBe('dark');
    expect(readDashboardTheme()).toBe('dark');
  });

  it('toggles dark then light', () => {
    expect(toggleDashboardTheme('light')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(toggleDashboardTheme('dark')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
