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

  it('still exposes the section nav, which the photograph must not cover', () => {
    render(
      <AppShell user={admin}>
        <p>Overview</p>
      </AppShell>,
    );
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeInTheDocument();
    // Once in the phone strip, once in the desktop sidebar; CSS shows one at a time.
    expect(screen.getAllByRole('link', { name: 'Quotes' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Use dark appearance' })).toHaveLength(2);
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

  it('passes the new-quote count through to the Quotes pill', () => {
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

  it('names where the reader is in the desktop top bar', () => {
    render(
      <AppShell user={admin}>
        <p>Overview</p>
      </AppShell>,
    );
    expect(screen.getByRole('list', { name: 'You are here' })).toHaveTextContent('Overview');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <AppShell user={admin}>
        <p>Overview</p>
      </AppShell>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
