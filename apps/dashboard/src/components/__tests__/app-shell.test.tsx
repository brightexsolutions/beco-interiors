import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('link', { name: 'Quotes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use dark appearance' })).toBeInTheDocument();
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

  it('passes the new-quote count through to the Quotes pill', () => {
    render(
      <AppShell user={admin} newQuotes={5}>
        <p>Overview</p>
      </AppShell>,
    );
    expect(screen.getByLabelText('5 new')).toHaveTextContent('5');
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
