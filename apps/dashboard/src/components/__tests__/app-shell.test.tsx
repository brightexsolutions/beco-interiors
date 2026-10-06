import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { ActiveSession } from '@/lib/session';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

const { AppShell } = await import('../app-shell');

const admin: ActiveSession = {
  userId: 'u1',
  email: 'irene.kariuki@beco.co.ke',
  fullName: 'Irene Kariuki',
  role: 'beco_admin',
  isActive: true,
  mustChangePassword: false,
  canWriteBlog: false,
  canReadAudit: false,
};

describe('AppShell', () => {
  it('lays the licensed showroom still behind the chrome, not a flat fill', () => {
    const { container } = render(
      <AppShell user={admin}>
        <p>Overview</p>
      </AppShell>,
    );
    const still = container.querySelector('img[src="/video/gallery-ambient-poster.jpg"]');
    expect(still).not.toBeNull();
    expect(still).toHaveAttribute('alt', '');
    // The band is decorative: the still is inside an aria-hidden region so a
    // screen reader does not hear "image" before the actual navigation.
    expect(still?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('carries the sections in a bottom bar on the phone and the sidebar on desktop (D111)', () => {
    render(
      <AppShell user={admin}>
        <p>Overview</p>
      </AppShell>,
    );
    const bar = screen.getByRole('navigation', { name: 'Sections' });
    expect(bar.className).toContain('fixed');
    expect(bar.className).toContain('bottom-0');
    expect(bar.className).toContain('lg:hidden');
    expect(within(bar).getByRole('link', { name: 'New quote' })).toHaveAttribute('href', '/quotes/new');
    // Once in the bar, once in the desktop sidebar; CSS shows one at a time.
    expect(screen.getAllByRole('link', { name: 'Quotes' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Use dark appearance' })).toHaveLength(2);
  });

  it('leaves room under the screen for the bar, and tells the docked bars how tall it is', () => {
    const { container } = render(
      <AppShell user={admin}>
        <p>Overview</p>
      </AppShell>,
    );
    expect(container.firstElementChild?.className).toContain('[--dock:calc(3.5625rem+env(safe-area-inset-bottom,0px))]');
    expect(container.firstElementChild?.className).toContain('lg:[--dock:0px]');
    expect(container.querySelector('main')?.className).toContain('pb-[calc(var(--dock)+1rem)]');
  });

  it('keeps the white header in flow. The breadcrumb is not part of that header', () => {
    const { container } = render(
      <AppShell user={admin}>
        <p>Overview</p>
      </AppShell>,
    );
    const header = container.querySelector('[data-shell-header]');
    expect(header?.className).toContain('rounded-panel');
    expect(header?.className).toContain('bg-high-vis-white');
    expect(header?.className).toContain('shadow-panel');
    expect(header?.className).toContain('flex');
    expect(header?.className).not.toContain('sticky');
    expect(header?.parentElement?.className).toContain('relative');
    expect(header?.parentElement?.className).not.toContain('sticky');
    expect(screen.queryByRole('navigation', { name: 'You are here' })).toBeNull();
    // The header names the screen where the pill strip used to be.
    expect(within(header as HTMLElement).getByRole('list', { name: 'You are here' })).toHaveTextContent('Overview');
  });

  it('carries the red square Beco mark in the home link', () => {
    const { container } = render(
      <AppShell user={admin}>
        <p>Overview</p>
      </AppShell>,
    );
    for (const home of screen.getAllByRole('link', { name: 'Beco Operations, home' })) {
      expect(home).toHaveAttribute('href', '/');
    }
    expect(container.querySelector('a[href="/"] img[src="/logo-mark.png"]')).not.toBeNull();
  });

  it('passes the new-quote count through to Quotes in the bar and the sidebar', () => {
    render(
      <AppShell user={admin} newQuotes={5}>
        <p>Overview</p>
      </AppShell>,
    );
    for (const badge of screen.getAllByLabelText('5 new')) expect(badge).toHaveTextContent('5');
  });

  it('groups the desktop sidebar by job, with Overview first for an admin', () => {
    render(
      <AppShell user={admin}>
        <p>Overview</p>
      </AppShell>,
    );
    const main = screen.getByRole('navigation', { name: 'Main' });
    expect(within(main).getByText('Home')).toBeInTheDocument();
    expect(within(main).getByText('Sales')).toBeInTheDocument();
    expect(within(main).getByText('Admin')).toBeInTheDocument();
    expect(within(main).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(within(main).queryByRole('link', { name: 'Users' })).toBeNull();
  });

  it('names where the reader is in the desktop top bar and the phone header alike', () => {
    render(
      <AppShell user={admin}>
        <p>Overview</p>
      </AppShell>,
    );
    for (const crumb of screen.getAllByRole('list', { name: 'You are here' })) expect(crumb).toHaveTextContent('Overview');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <AppShell user={admin}>
        <p>Overview</p>
      </AppShell>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('lifts the blurred desktop bar above the panel, so the account menu it opens is not hidden', () => {
    const { container } = render(
      <AppShell user={admin}>
        <p>Overview</p>
      </AppShell>,
    );
    const bar = [...container.querySelectorAll('div')].find((d) => d.className.includes('backdrop-blur'));
    expect(bar).toBeDefined();
    // backdrop-blur makes the bar a stacking context; without its own z-index
    // the later <main> paints over it and the menu inside it.
    expect(bar).toHaveClass('relative', 'z-20');
    const main = container.querySelector('main')!;
    expect(main.className).not.toMatch(/\bz-(2|3|4|5)\d\b/);
  });
});

