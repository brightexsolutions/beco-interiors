import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { NavGroup } from '@/lib/nav-items';
import { SIDE_NAV_OPEN_KEY } from '@/lib/side-nav-groups';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const { SideNav } = await import('../side-nav');

const groups: NavGroup[] = [
  { label: 'Home', items: [{ href: '/', label: 'Overview' }] },
  { label: 'Sales', items: [{ href: '/quotes', label: 'Quotes' }, { href: '/orders', label: 'Orders' }] },
  { label: 'Content', items: [{ href: '/announcements', label: 'Announcements' }] },
  { label: 'Admin', items: [{ href: '/users', label: 'Users' }, { href: '/settings', label: 'Settings' }] },
];

afterEach(() => {
  pathname = '/';
  window.localStorage.clear();
});

const heading = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

describe('SideNav, folding groups (D144)', () => {
  it('starts with Home and Sales open and the rest folded, so the sidebar fits without scrolling', () => {
    render(<SideNav groups={groups} />);
    expect(heading('Home')).toHaveAttribute('aria-expanded', 'true');
    expect(heading('Sales')).toHaveAttribute('aria-expanded', 'true');
    expect(heading('Admin')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: 'Quotes' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Users' })).toBeNull();
  });

  it('opens a folded group on a click, folds it on the next, and keeps the choice in this browser', async () => {
    const user = userEvent.setup();
    render(<SideNav groups={groups} />);
    await user.click(heading('Admin'));
    expect(heading('Admin')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/users');
    expect(JSON.parse(window.localStorage.getItem(SIDE_NAV_OPEN_KEY) ?? '[]')).toContain('Admin');

    await user.click(heading('Sales'));
    expect(screen.queryByRole('link', { name: 'Quotes' })).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(SIDE_NAV_OPEN_KEY) ?? '[]')).not.toContain('Sales');
  });

  it('restores the stored choice on the next load', () => {
    window.localStorage.setItem(SIDE_NAV_OPEN_KEY, JSON.stringify(['Content']));
    render(<SideNav groups={groups} />);
    expect(heading('Content')).toHaveAttribute('aria-expanded', 'true');
    expect(heading('Sales')).toHaveAttribute('aria-expanded', 'false');
  });

  it('always opens the group holding the current screen, even when stored folded', () => {
    pathname = '/settings';
    window.localStorage.setItem(SIDE_NAV_OPEN_KEY, JSON.stringify([]));
    render(<SideNav groups={groups} />);
    expect(heading('Admin')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
  });

  it('moves the new quote count onto the Sales heading while Sales is folded', async () => {
    const user = userEvent.setup();
    render(<SideNav groups={groups} newQuotes={3} />);
    expect(within(heading('Sales')).queryByLabelText('3 new')).toBeNull();
    await user.click(heading('Sales'));
    expect(within(heading('Sales')).getByLabelText('3 new')).toHaveTextContent('3');
  });

  it('ties each heading to the list it folds, and has no accessibility violations', async () => {
    const { container } = render(<SideNav groups={groups} />);
    const sales = heading('Sales');
    const list = document.getElementById(sales.getAttribute('aria-controls') ?? '');
    expect(list).not.toBeNull();
    expect(within(list as HTMLElement).getByRole('link', { name: 'Orders' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
