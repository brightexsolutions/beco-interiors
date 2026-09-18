import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { DASHBOARD_THEME_KEY } from '@/lib/dashboard-theme';

const { ThemeToggle } = await import('../theme-toggle');

afterEach(() => {
  document.documentElement.classList.remove('dark');
  window.localStorage.removeItem(DASHBOARD_THEME_KEY);
});

describe('ThemeToggle', () => {
  it('switches the document to dark, then back to light', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Use dark appearance' });
    await user.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem(DASHBOARD_THEME_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: 'Use light appearance' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Use light appearance' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem(DASHBOARD_THEME_KEY)).toBe('light');
  });

  it('syncs the control after mount when dark is already stored', async () => {
    window.localStorage.setItem(DASHBOARD_THEME_KEY, 'dark');
    document.documentElement.classList.add('dark');
    render(<ThemeToggle />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Use light appearance' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ThemeToggle />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
