import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

let pathname = '/quotes';
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => search,
}));

const { RouteProgress } = await import('../route-progress');

const click = (anchor: HTMLAnchorElement, init: MouseEventInit = {}) => {
  act(() => {
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }));
  });
};

const link = (href: string, attrs: Record<string, string> = {}) => {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.textContent = href;
  for (const [key, value] of Object.entries(attrs)) anchor.setAttribute(key, value);
  // A click on an anchor in jsdom navigates nowhere, so it is left alone:
  // a listener that prevented it would also hide it from the bar.
  document.body.appendChild(anchor);
  return anchor;
};

beforeEach(() => {
  vi.useFakeTimers();
  pathname = '/quotes';
  search = new URLSearchParams();
  window.history.replaceState(null, '', '/quotes');
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('RouteProgress', () => {
  it('shows a progress bar when an in-app link is pressed, and finishes when the URL changes', () => {
    const { rerender } = render(<RouteProgress />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    click(link('/orders'));
    const bar = screen.getByRole('progressbar', { name: 'Loading the next screen' });
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThan(12);
    pathname = '/orders';
    rerender(<RouteProgress />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('ignores a new tab, a download, another site, a modified click and the current screen', () => {
    render(<RouteProgress />);
    click(link('/orders', { target: '_blank' }));
    click(link('/orders', { download: '' }));
    click(link('https://beco.co.ke/'));
    click(link('/orders'), { metaKey: true });
    click(link('/quotes'));
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('gives up after a while so a link that opened nothing does not leave the bar on screen', () => {
    render(<RouteProgress />);
    click(link('/orders'));
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(21_000);
    });
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
