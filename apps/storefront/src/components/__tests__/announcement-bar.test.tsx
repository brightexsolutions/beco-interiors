import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
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

/* ------------------------------------------------------------------
   The single line ticker, from Brown and Irene, 7 October 2026: a long
   announcement wrapped the bar onto three lines and pushed the page down.

   jsdom has no layout, so widths are stubbed on the prototype: the bar's
   viewport reports `size.view` as its clientWidth and the line reports
   `size.line` as its offsetWidth. ResizeObserver is replaced with one the
   test can fire.
   ------------------------------------------------------------------ */
describe('AnnouncementBar ticker', () => {
  const IRENE = {
    key: 'csw',
    label: 'HAPPY CUSTOMER SERVICE WEEK',
    text:
      "You inspire the spaces we create. We're here to make every experience count. " +
      'This Customer Service Week, thank you for choosing Beco Interiors.',
    cta: 'Experience Beco',
    href: '/about',
  } satisfies AnnouncementBarItem;

  const size = { view: 1000, line: 400 };
  const observers: Array<() => void> = [];
  const originals = new Map<string, PropertyDescriptor | undefined>();

  const stub = (
    prop: 'clientWidth' | 'offsetWidth' | 'scrollWidth',
    get: (el: HTMLElement) => number,
  ) => {
    if (!originals.has(prop)) {
      originals.set(prop, Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop));
    }
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get(this: HTMLElement) { return get(this); },
    });
  };

  beforeEach(() => {
    size.view = 1000;
    size.line = 400;
    observers.length = 0;
    stub('clientWidth', (el) => (el.dataset.testid === 'announcement-viewport' ? size.view : 0));
    stub('offsetWidth', (el) => (el.tagName === 'P' ? size.line : 0));
    stub('scrollWidth', () => 0);
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: () => void) { observers.push(cb); }
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    for (const [prop, desc] of originals) {
      if (desc) Object.defineProperty(HTMLElement.prototype, prop, desc);
      else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[prop];
    }
    originals.clear();
    sessionStorage.clear();
  });

  const track = () => screen.getByTestId('announcement-track');
  const viewport = () => screen.getByTestId('announcement-viewport');
  const active = (c: HTMLElement) => c.querySelector('.beco-bar-in');
  const resize = (view: number) => {
    size.view = view;
    act(() => { observers.forEach((cb) => cb()); });
  };

  it('sits still and centred when the line fits', () => {
    render(<AnnouncementBar items={[IRENE]} />);
    expect(track()).not.toHaveAttribute('data-ticking');
    expect(viewport()).toHaveClass('justify-center');
    expect(screen.queryByTestId('announcement-loop-copy')).toBeNull();
    expect(track().style.animationDuration).toBe('');
  });

  it('ticks when the measured line is wider than the bar, at a constant pace', () => {
    size.line = 1100;
    render(<AnnouncementBar items={[IRENE]} />);
    expect(track()).toHaveAttribute('data-ticking');
    expect(track()).toHaveClass('beco-ticker-track');
    expect(viewport()).toHaveClass('beco-ticker', 'justify-start');
    expect(screen.getByTestId('announcement-loop-copy')).toBeInTheDocument();
    // (1100 line + 64 gap) at 48px a second.
    expect(track().style.animationDuration).toBe(`${Math.round((1164 / 48) * 1000)}ms`);
  });

  it('keeps the same pace for a longer line by taking longer, not moving faster', () => {
    size.view = 300;
    size.line = 2000;
    render(<AnnouncementBar items={[IRENE]} />);
    expect(track().style.animationDuration).toBe(`${Math.round((2064 / 48) * 1000)}ms`);
  });

  it('measures rather than counting characters: a short line on a narrow bar ticks', () => {
    const short = { key: 's', label: 'Sale', text: 'On now', tone: 'charcoal' as const };
    size.line = 280;
    render(<AnnouncementBar items={[short]} />);
    expect(track()).not.toHaveAttribute('data-ticking');
    resize(240);
    expect(track()).toHaveAttribute('data-ticking');
    resize(1200);
    expect(track()).not.toHaveAttribute('data-ticking');
  });

  it('counts the width a truncated body is hiding when deciding', () => {
    // The still layout clamps the line to the bar and the body ellipsises,
    // so the clamped line on its own would look as if it fitted.
    stub('scrollWidth', (el) => (el.className.includes('shrink-[1000]') ? 900 : 0));
    render(<AnnouncementBar items={[IRENE]} />);
    expect(track()).toHaveAttribute('data-ticking');
  });

  it('keeps the bar one fixed height whether still or ticking', () => {
    const { container } = render(<AnnouncementBar items={[IRENE]} />);
    const bar = () => container.querySelector('aside > div')!;
    expect(bar()).toHaveClass('h-12');
    expect(bar().className).not.toMatch(/min-h|py-/);
    resize(200);
    expect(track()).toHaveAttribute('data-ticking');
    expect(bar()).toHaveClass('h-12');
  });

  it('hides the loop copy from assistive tech and from the tab order', () => {
    size.line = 1100;
    render(<AnnouncementBar items={[IRENE]} />);
    const copy = screen.getByTestId('announcement-loop-copy');
    expect(copy).toHaveAttribute('aria-hidden', 'true');
    expect(copy).toHaveAttribute('inert');
    const focusable = copy.querySelectorAll<HTMLElement>('a, button, input, [tabindex]');
    expect(focusable.length).toBeGreaterThan(0);
    focusable.forEach((el) => expect(el.tabIndex).toBe(-1));
    // A screen reader is given the announcement once.
    expect(screen.getAllByText(IRENE.label, { ignore: '[aria-hidden="true"] *' })).toHaveLength(1);
  });

  it('leaves exactly one link in the tab order while ticking, and it is real', () => {
    size.line = 1100;
    const { container } = render(<AnnouncementBar items={[IRENE]} />);
    const tabbable = [...container.querySelectorAll<HTMLElement>('a')].filter(
      (a) => a.tabIndex >= 0 && !a.closest('[inert]'),
    );
    expect(tabbable).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Experience Beco' })).toHaveAttribute('href', '/about');
  });

  it('pauses on hover and on focus within, in the stylesheet that runs it', () => {
    const css = readFileSync('packages/ui/src/tokens/motion.css', 'utf8');
    expect(css).toMatch(
      /\.beco-ticker:hover \.beco-ticker-track,\s*\.beco-ticker:focus-within \.beco-ticker-track\s*\{\s*animation-play-state: paused;/,
    );
    // The keyframe only exists for readers who have not asked for less motion.
    const noPref = css.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(noPref).toBeGreaterThan(-1);
    expect(css.indexOf('@keyframes beco-ticker')).toBeGreaterThan(noPref);
    expect(css).toMatch(/\.beco-ticker-track\[data-ticking\] \{\s*animation: beco-ticker [^;]*linear[^;]*infinite;/);
  });

  it('brings a focused link the ticker carried out of view back in, and resumes on blur', () => {
    size.view = 300;
    size.line = 1100;
    render(<AnnouncementBar items={[IRENE]} />);
    const link = screen.getByRole('link', { name: 'Experience Beco' });
    Object.defineProperty(link, 'offsetLeft', { configurable: true, value: 980 });
    Object.defineProperty(link, 'offsetWidth', { configurable: true, value: 120 });
    link.getBoundingClientRect = () => ({ left: 980, right: 1100 }) as DOMRect;
    viewport().getBoundingClientRect = () => ({ left: 0, right: 300 }) as DOMRect;

    act(() => { link.focus(); });
    expect(track()).not.toHaveAttribute('data-ticking');
    expect(track().style.transform).toBe('translateX(-800px)');

    act(() => { link.blur(); });
    expect(track()).toHaveAttribute('data-ticking');
    expect(track().style.transform).toBe('');
  });

  it('only pauses, without moving the line, when the focused link is already in view', () => {
    size.view = 300;
    size.line = 1100;
    render(<AnnouncementBar items={[IRENE]} />);
    const link = screen.getByRole('link', { name: 'Experience Beco' });
    link.getBoundingClientRect = () => ({ left: 100, right: 220 }) as DOMRect;
    viewport().getBoundingClientRect = () => ({ left: 0, right: 300 }) as DOMRect;
    act(() => { link.focus(); });
    expect(track()).toHaveAttribute('data-ticking');
    expect(track().style.transform).toBe('');
  });

  it('never ticks under reduced motion: one row, body truncated, full text kept', () => {
    reducedMotion(true);
    size.view = 300;
    size.line = 1100;
    render(<AnnouncementBar items={[IRENE]} />);
    expect(track()).not.toHaveAttribute('data-ticking');
    expect(track().style.animationDuration).toBe('');
    expect(screen.queryByTestId('announcement-loop-copy')).toBeNull();
    const row = screen.getByTitle(`${IRENE.label}: ${IRENE.text}`);
    const body = screen.getByText(IRENE.text).parentElement!;
    expect(row).toContainElement(body);
    expect(body).toHaveClass('truncate');
    expect(body).toHaveTextContent(IRENE.text);
    // The call to action is never what gets cut.
    expect(screen.getByRole('link', { name: 'Experience Beco' })).toHaveClass('shrink-0');
  });

  it('waits for a ticking line to finish its pass before rotating', () => {
    size.line = 1100;
    const second = { key: 'two', label: 'Second', tone: 'charcoal' as const };
    const { container } = render(<AnnouncementBar items={[IRENE, second]} />);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(active(container)).toHaveTextContent(IRENE.label);
    act(() => { fireEvent.animationIteration(track()); });
    expect(active(container)).toHaveTextContent('Second');
  });

  it('does not rotate away from a ticking line under the pointer', () => {
    size.line = 1100;
    const second = { key: 'two', label: 'Second', tone: 'charcoal' as const };
    const { container } = render(<AnnouncementBar items={[IRENE, second]} />);
    fireEvent.mouseEnter(container.querySelector('aside')!);
    act(() => { fireEvent.animationIteration(track()); });
    expect(active(container)).toHaveTextContent(IRENE.label);
  });

  it('still dismisses from the close button, which sits outside the ticker', () => {
    size.line = 1100;
    render(<AnnouncementBar items={[IRENE]} />);
    const close = screen.getByRole('button', { name: 'Dismiss announcement' });
    expect(viewport()).not.toContainElement(close);
    expect(close).toHaveClass('h-11', 'w-11');
    fireEvent.click(close);
    expect(screen.queryByRole('complementary', { name: 'Announcements' })).toBeNull();
    expect(sessionStorage.getItem('beco-announcement-dismissed')).toBe('true');
  });

  it('has no accessibility violations while ticking', async () => {
    vi.useRealTimers();
    size.line = 1100;
    const { container } = render(<AnnouncementBar items={[IRENE]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
