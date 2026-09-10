import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { axe } from 'vitest-axe';
import { AnnouncementBar } from '../announcement-bar';
import {
  buildAnnouncementItems,
  type Announcement,
  type AnnouncementBarItem,
} from '@/lib/announcements';
import { SITE } from '@/lib/site';

const announcement = (over: Partial<Announcement> = {}): Announcement => ({
  id: 'a1', title: 'Now on the floor', body: null, type: 'notice',
  cta_label: null, cta_url: null, ...over,
});

const reducedMotion = (matches: boolean) =>
  vi.stubGlobal('matchMedia', () => ({
    matches, addEventListener() {}, removeEventListener() {},
  }));

beforeEach(() => { vi.useFakeTimers(); reducedMotion(false); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const items = (over: Partial<AnnouncementBarItem>[] = []): AnnouncementBarItem[] =>
  over.length
    ? over.map((o, i) => ({ key: `k${i}`, label: 'Item', ...o }))
    : [{ key: 'k0', label: 'Now on the floor', text: 'The full range is in stock.' }];

describe('buildAnnouncementItems', () => {
  it('appends the phone and email after every announcement', () => {
    const built = buildAnnouncementItems([announcement(), announcement({ id: 'a2', title: 'Mid year sale' })]);
    expect(built.map((i) => i.label)).toEqual([
      'Now on the floor', 'Mid year sale', 'Call the showroom', 'Email us:',
    ]);
    expect(built.at(-2)).toMatchObject({ text: SITE.phone, href: SITE.phoneHref });
    expect(built.at(-1)).toMatchObject({ text: SITE.email, href: `mailto:${SITE.email}` });
  });

  it('still yields the two contact items when there are no announcements', () => {
    expect(buildAnnouncementItems([]).map((i) => i.label)).toEqual(['Call the showroom', 'Email us:']);
  });

  it('marks a clearance red and everything else charcoal', () => {
    const built = buildAnnouncementItems([
      announcement({ type: 'clearance' }), announcement({ id: 'a2', type: 'sale' }),
    ]);
    expect(built[0]!.tone).toBe('clearance');
    expect(built[1]!.tone).toBe('charcoal');
  });
});

describe('AnnouncementBar', () => {
  it('renders nothing when there are no items', () => {
    const { container } = render(<AnnouncementBar items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the first item, with its body, before any timer has run', () => {
    render(<AnnouncementBar items={items()} />);
    expect(screen.getByText('Now on the floor')).toBeInTheDocument();
    expect(screen.getByText('The full range is in stock.')).toBeInTheDocument();
  });

  it('rolls to the next item on the interval, and wraps round', () => {
    const { container } = render(
      <AnnouncementBar items={items([{ label: 'First' }, { label: 'Second' }])} />,
    );
    const active = () => container.querySelector('.beco-bar-in')?.textContent;
    expect(active()).toBe('First');

    // One tick: the new line rolls in, the old one is briefly kept as the
    // outgoing layer, then dropped.
    act(() => { vi.advanceTimersByTime(5500); });
    expect(active()).toBe('Second');
    expect(container.querySelector('.beco-bar-out')?.textContent).toBe('First');
    act(() => { vi.advanceTimersByTime(700); });
    expect(container.querySelector('.beco-bar-out')).toBeNull();

    act(() => { vi.advanceTimersByTime(5500); });
    expect(active()).toBe('First');
  });

  it('never rotates under prefers-reduced-motion, and still says the first thing', () => {
    reducedMotion(true);
    render(<AnnouncementBar items={items([{ label: 'First' }, { label: 'Second' }])} />);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.queryByText('Second')).toBeNull();
  });

  it('does not set a timer for a single item', () => {
    render(<AnnouncementBar items={items([{ label: 'Only one' }])} />);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByText('Only one')).toBeInTheDocument();
  });

  it('renders the call to action as a real link', () => {
    render(<AnnouncementBar items={items([{ label: 'Sale', cta: 'Plan a visit', href: '/contact' }])} />);
    expect(screen.getByRole('link', { name: 'Plan a visit' })).toHaveAttribute('href', '/contact');
  });

  it('links the text itself when there is a href but no cta, so the phone dials', () => {
    render(<AnnouncementBar items={items([{ label: 'Call the showroom', text: SITE.phone, href: SITE.phoneHref }])} />);
    expect(screen.getByRole('link', { name: SITE.phone })).toHaveAttribute('href', SITE.phoneHref);
  });

  it('turns the whole bar Warm Red only while a clearance item is showing', () => {
    const { container } = render(
      <AnnouncementBar items={items([{ label: 'Clear out', tone: 'clearance' }, { label: 'Normal', tone: 'charcoal' }])} />,
    );
    expect(container.firstElementChild).toHaveClass('bg-warm-red-deep');
    act(() => { vi.advanceTimersByTime(5500); });
    expect(container.firstElementChild).toHaveClass('bg-charcoal');
  });

  it('has no accessibility violations', async () => {
    vi.useRealTimers();
    const { container } = render(
      <AnnouncementBar items={items([{ label: 'Sale', cta: 'Plan a visit', href: '/contact' }])} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
