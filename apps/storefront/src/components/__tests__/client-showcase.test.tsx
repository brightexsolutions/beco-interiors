import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ClientShowcase } from '../client-showcase';
import type { PublishedClient } from '@/lib/clients';

const client = (overrides: Partial<PublishedClient> = {}): PublishedClient => ({
  id: overrides.id ?? 'a', name: 'Art Caffe', slug: 'art-caffe',
  logo: null, project: null, sector: null, testimonial: null,
  ...overrides,
});

const media = (reducedMotion: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') && reducedMotion,
    addEventListener() {}, removeEventListener() {},
  }));

beforeEach(() => { vi.useFakeTimers(); media(false); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

// Scoped to the visible layer, not the invisible sizer, which duplicates
// whichever quote is longest on purpose to reserve the box's height and
// would otherwise make a single-client quote match twice, the same
// convention PinnedHero's own lede crossfade tests already use.
const visible = (container: HTMLElement) =>
  container.querySelector('[aria-hidden="false"]');

describe('ClientShowcase', () => {
  it('renders nothing when no client has been published yet, the real state at M4', () => {
    const { container } = render(<ClientShowcase clients={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the first client active on load', () => {
    const { container } = render(<ClientShowcase clients={[
      client({ id: 'a', testimonial: 'First quote.' }),
      client({ id: 'b', testimonial: 'Second quote.' }),
    ]} />);
    expect(visible(container)?.textContent).toContain('First quote.');
  });

  it('falls back to the client name when there is no logo', () => {
    const { container } = render(<ClientShowcase clients={[client({ name: 'Hass Consult' })]} />);
    expect(visible(container)?.textContent).toContain('Hass Consult');
  });

  it('renders the logo image instead of the name when one is set', () => {
    const withLogo = client({
      logo: { path: '/clients/art-caffe.png', alt: 'Art Caffe', width: 200, height: 80 },
    });
    const { container } = render(<ClientShowcase clients={[withLogo]} />);
    expect(visible(container)?.textContent).not.toContain('Art Caffe');
    expect(screen.getByAltText('Art Caffe')).toBeInTheDocument();
  });

  it('shows the sector, and falls back to the project when there is no testimonial', () => {
    const { container } = render(<ClientShowcase clients={[client({
      sector: 'Hospitality', project: 'Sintered stone worktops across three outlets.',
    })]} />);
    const text = visible(container)?.textContent;
    expect(text).toContain('Hospitality');
    expect(text).toContain('Sintered stone worktops across three outlets.');
  });

  it('cycles to the next client on its own', () => {
    const { container } = render(<ClientShowcase clients={[
      client({ id: 'a', testimonial: 'First quote.' }),
      client({ id: 'b', testimonial: 'Second quote.' }),
    ]} />);
    act(() => { vi.advanceTimersByTime(5200); });
    expect(visible(container)?.textContent).toContain('Second quote.');
  });

  it('does not cycle under reduced motion', () => {
    media(true);
    const { container } = render(<ClientShowcase clients={[
      client({ id: 'a', testimonial: 'First quote.' }),
      client({ id: 'b', testimonial: 'Second quote.' }),
    ]} />);
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(visible(container)?.textContent).toContain('First quote.');
  });

  it('does not cycle at all with only one client to show', () => {
    const { container } = render(<ClientShowcase clients={[client({ testimonial: 'Only quote.' })]} />);
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(visible(container)?.textContent).toContain('Only quote.');
  });

  it('shows one progress dot per client, none when there is only one', () => {
    const { container: multi } = render(<ClientShowcase clients={[
      client({ id: 'a' }), client({ id: 'b' }), client({ id: 'c' }),
    ]} />);
    expect(multi.querySelectorAll('.rounded-full')).toHaveLength(3);

    const { container: single } = render(<ClientShowcase clients={[client({ id: 'a' })]} />);
    expect(single.querySelectorAll('.rounded-full')).toHaveLength(0);
  });

  it('has no accessibility violations', async () => {
    // axe's own internals await real timers: fake ones, still active from
    // this file's cycling tests, hang it rather than fail it.
    vi.useRealTimers();
    const { container } = render(<ClientShowcase clients={[
      client({ id: 'a', name: 'Art Caffe' }),
      client({ id: 'b', name: 'Hass Consult', sector: 'Real estate' }),
    ]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
