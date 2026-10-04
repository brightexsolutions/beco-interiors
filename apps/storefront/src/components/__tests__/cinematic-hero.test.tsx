import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { HERO_ROOMS } from '@/lib/hero-rooms';
import { CinematicHero, SLIDE_MS, type CinematicRoom } from '../cinematic-hero';

const rooms: CinematicRoom[] = HERO_ROOMS.map((r) => ({ ...r, href: r.rangeSlug === 'wall-panels' ? null : `/shop/${r.rangeSlug}` }));

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
};

const current = () => screen.getAllByRole('button', { current: true })[0]!;

beforeEach(() => setReducedMotion(false));
afterEach(() => vi.useRealTimers());

describe('CinematicHero', () => {
  it('says one line and offers the two actions, to the shop and to the visit page', () => {
    render(<CinematicHero rooms={rooms} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('The room starts with the surface.');
    expect(screen.getByRole('link', { name: 'View products' })).toHaveAttribute('href', '/shop');
    expect(screen.getByRole('link', { name: 'Plan a visit' })).toHaveAttribute('href', '/contact');
  });

  it('opens on the first room, names it and what we supplied, and fetches only it and the next', () => {
    const { container } = render(<CinematicHero rooms={rooms} />);
    expect(current()).toHaveAccessibleName('Show the kitchen');
    expect(screen.getAllByText('Sintered stone island, fluted face').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('picture')).toHaveLength(2);
    const visible = screen.getByRole('group', { name: '1 of 5, Kitchen' });
    expect(visible).not.toHaveAttribute('aria-hidden', 'true');
    expect(within(visible).getByRole('img')).toHaveAttribute('alt', HERO_ROOMS[0]!.alt);
  });

  it('jumps to a room when its button is pressed, and links the caption to that range', () => {
    render(<CinematicHero rooms={rooms} />);
    act(() => screen.getByRole('button', { name: 'Show the reception' }).click());
    expect(current()).toHaveAccessibleName('Show the reception');
    expect(screen.getByRole('group', { name: '4 of 5, Reception' })).toHaveAttribute('aria-hidden', 'false');
    const links = screen.getAllByRole('link', { name: /See the range|Curved stone reception desk/ });
    expect(links.every((l) => l.getAttribute('href') === '/shop/sintered-stone')).toBe(true);
  });

  it('does not link a caption whose range has no stock', () => {
    render(<CinematicHero rooms={rooms} />);
    act(() => screen.getByRole('button', { name: 'Show the living room' }).click());
    expect(screen.queryByRole('link', { name: 'See the range' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Fluted timber wall panels' })).toBeNull();
    expect(screen.getAllByText('Fluted timber wall panels').length).toBeGreaterThan(0);
  });

  it('moves to the next room on its own, and wraps after the last', () => {
    vi.useFakeTimers();
    render(<CinematicHero rooms={rooms} />);
    act(() => { vi.advanceTimersByTime(SLIDE_MS); });
    expect(current()).toHaveAccessibleName('Show the bathroom');
    act(() => screen.getByRole('button', { name: 'Show the bar' }).click());
    act(() => { vi.advanceTimersByTime(SLIDE_MS); });
    expect(current()).toHaveAccessibleName('Show the kitchen');
  });

  it('stops when paused and carries on when played again', () => {
    vi.useFakeTimers();
    render(<CinematicHero rooms={rooms} />);
    act(() => screen.getByRole('button', { name: 'Pause the rooms' }).click());
    act(() => { vi.advanceTimersByTime(SLIDE_MS * 3); });
    expect(current()).toHaveAccessibleName('Show the kitchen');
    act(() => screen.getByRole('button', { name: 'Play the rooms' }).click());
    act(() => { vi.advanceTimersByTime(SLIDE_MS); });
    expect(current()).toHaveAccessibleName('Show the bathroom');
  });

  it('never moves on its own under reduced motion, and offers Play instead', () => {
    setReducedMotion(true);
    vi.useFakeTimers();
    render(<CinematicHero rooms={rooms} />);
    act(() => { vi.advanceTimersByTime(SLIDE_MS * 2); });
    expect(current()).toHaveAccessibleName('Show the kitchen');
    expect(screen.getByRole('button', { name: 'Play the rooms' })).toBeInTheDocument();
  });

  it('holds the first photograph still for its first moments, so the LCP image is not animated on entry', () => {
    const { container } = render(<CinematicHero rooms={rooms} />);
    expect(container.querySelector('.beco-hero-push[data-first]')).not.toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<CinematicHero rooms={rooms} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
