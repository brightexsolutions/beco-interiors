import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ClientShowcase } from '../client-showcase';
import type { PublishedClient } from '@/lib/clients';

const client = (overrides: Partial<PublishedClient> = {}): PublishedClient => ({
  id: overrides.id ?? 'a', name: 'Art Caffe', slug: 'art-caffe',
  logo: null, project: null, sector: null,
  ...overrides,
});

describe('ClientShowcase', () => {
  it('renders nothing when no client has been published yet, the real state at M4', () => {
    const { container } = render(<ClientShowcase clients={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('falls back to the client name when there is no logo', () => {
    render(<ClientShowcase clients={[client({ name: 'Hass Consult' })]} />);
    expect(screen.getByText('Hass Consult')).toBeInTheDocument();
  });

  it('renders the logo image instead of the name when one is set', () => {
    const withLogo = client({
      logo: { path: '/clients/art-caffe.png', alt: 'Art Caffe', width: 200, height: 80 },
    });
    render(<ClientShowcase clients={[withLogo]} />);
    expect(screen.queryByText('Art Caffe')).toBeNull();
    expect(screen.getByAltText('Art Caffe')).toBeInTheDocument();
  });

  it('shows the sector and the project description when present', () => {
    render(<ClientShowcase clients={[client({
      sector: 'Hospitality', project: 'Sintered stone worktops across three outlets.',
    })]} />);
    expect(screen.getByText('Hospitality')).toBeInTheDocument();
    expect(screen.getByText('Sintered stone worktops across three outlets.')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ClientShowcase clients={[
      client({ id: 'a', name: 'Art Caffe' }),
      client({ id: 'b', name: 'Hass Consult', sector: 'Real estate' }),
    ]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
