import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LivePopup } from '@/lib/popups';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const { PromoPopupHost, isQuietPath, popupStorageKey, shouldShowPopup } = await import('../promo-popup-host');

const popup: LivePopup = {
  id: 'p1', variant: 'offer', eyebrow: 'Live offer', badge: '40% off', title: 'Selected stone', body: null,
  cta: { label: 'Explore', href: '/shop' }, trigger: 'delay', triggerValue: 5, triggerSection: null, showAgainDays: 7,
  images: [{ path: '/a.webp', alt: 'Anakin' }],
};

beforeEach(() => {
  pathname = '/';
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe('PromoPopupHost', () => {
  it('opens after the delay Beco set, not before', () => {
    vi.useFakeTimers();
    render(<PromoPopupHost popups={[popup]} />);
    act(() => vi.advanceTimersByTime(4900));
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Selected stone');
  });

  it('remembers a close, so the next page does not open it again', async () => {
    const user = userEvent.setup({ delay: null });
    render(<PromoPopupHost popups={[{ ...popup, triggerValue: 0 }]} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(popupStorageKey('p1'))).not.toBeNull();
    expect(shouldShowPopup(popup)).toBe(false);
  });

  it('never opens on the quote flow', () => {
    vi.useFakeTimers();
    pathname = '/quote';
    render(<PromoPopupHost popups={[popup]} />);
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens on scroll depth when that is the trigger', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    render(<PromoPopupHost popups={[{ ...popup, trigger: 'scroll', triggerValue: 50 }]} />);
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 600, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens a section pop up when its section comes into view, and not before', () => {
    let notify: (entries: Array<{ isIntersecting: boolean }>) => void = () => {};
    const observe = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: typeof notify) {
          notify = cb;
        }
        observe = observe;
        disconnect = vi.fn();
      },
    );
    const section = document.createElement('section');
    section.setAttribute('data-popup-section', 'home-showroom');
    document.body.appendChild(section);
    render(<PromoPopupHost popups={[{ ...popup, trigger: 'section', triggerSection: 'home-showroom' }]} />);
    expect(observe).toHaveBeenCalledWith(section);
    act(() => notify([{ isIntersecting: false }]));
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => notify([{ isIntersecting: true }]));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Selected stone');
    section.remove();
    vi.unstubAllGlobals();
  });

  it('never fires a section pop up on a page without that section', () => {
    const observe = vi.fn();
    vi.stubGlobal('IntersectionObserver', class { observe = observe; disconnect = vi.fn(); });
    render(<PromoPopupHost popups={[{ ...popup, trigger: 'section', triggerSection: 'site-footer' }]} />);
    expect(observe).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('opens one at a time: a second that fires meanwhile is skipped, and still unseen', () => {
    vi.useFakeTimers();
    const later = { ...popup, id: 'p2', title: 'Second offer', triggerValue: 6 };
    render(<PromoPopupHost popups={[popup, later]} />);
    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Selected stone');
    expect(shouldShowPopup(later)).toBe(true);
  });

  it('after one closes, the next to fire still opens', () => {
    vi.useFakeTimers();
    const later = { ...popup, id: 'p2', title: 'Second offer', triggerValue: 20 };
    render(<PromoPopupHost popups={[popup, later]} />);
    act(() => vi.advanceTimersByTime(5100));
    act(() => screen.getByRole('button', { name: 'Close' }).click());
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => vi.advanceTimersByTime(15_000));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Second offer');
  });

  it('renders nothing with no live pop up', () => {
    const { container } = render(<PromoPopupHost popups={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('shouldShowPopup', () => {
  it('shows again once the quiet days have passed', () => {
    const now = Date.now();
    localStorage.setItem(popupStorageKey('p1'), String(now - 8 * 24 * 60 * 60 * 1000));
    expect(shouldShowPopup(popup, now)).toBe(true);
    localStorage.setItem(popupStorageKey('p1'), String(now - 6 * 24 * 60 * 60 * 1000));
    expect(shouldShowPopup(popup, now)).toBe(false);
  });

  it('with 0 days remembers for the visit only', () => {
    sessionStorage.setItem(popupStorageKey('p1'), '1');
    expect(shouldShowPopup({ ...popup, showAgainDays: 0 })).toBe(false);
    sessionStorage.clear();
    expect(shouldShowPopup({ ...popup, showAgainDays: 0 })).toBe(true);
  });

  it('a different pop up is not hidden by closing this one', () => {
    localStorage.setItem(popupStorageKey('p1'), String(Date.now()));
    expect(shouldShowPopup({ ...popup, id: 'p2' })).toBe(true);
  });

  it('refuses when storage throws, rather than nagging on every page', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(shouldShowPopup(popup)).toBe(false);
    spy.mockRestore();
  });
});

describe('isQuietPath', () => {
  it('covers the quote flow and nothing that only starts with the same letters', () => {
    expect(isQuietPath('/quote')).toBe(true);
    expect(isQuietPath('/quote/sent')).toBe(true);
    expect(isQuietPath('/quotes-guide')).toBe(false);
    expect(isQuietPath('/shop')).toBe(false);
  });
});
