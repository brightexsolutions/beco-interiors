import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';

const mockPathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname() }));

const { ShellContext, ShellPageLabel, ShellPageLabelProvider } = await import('../shell-context');

function stubObserver(isIntersecting: boolean) {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe() {
        this.callback(
          [{ isIntersecting } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
}

describe('ShellContext', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stays hidden while the dashboard header is still on screen', () => {
    stubObserver(true);
    mockPathname.mockReturnValue('/orders/BEC-O-00036');
    render(
      <>
        <header data-shell-header="" />
        <ShellContext />
      </>,
    );
    expect(screen.queryByRole('navigation', { name: 'You are here' })).toBeNull();
  });

  it('docks after the header scrolls away, on a phone only: desktop has the sidebar and top bar', () => {
    stubObserver(false);
    mockPathname.mockReturnValue('/orders');
    const { container } = render(
      <>
        <header data-shell-header="" />
        <ShellContext />
      </>,
    );
    const nav = screen.getByRole('navigation', { name: 'You are here' });
    expect(nav.className).toContain('fixed');
    expect(nav.className).toContain('lg:hidden');
    expect(container.querySelector('ol')?.className).toContain('lg:px-8');
  });

  it('names a section root as the current page, not a link', () => {
    stubObserver(false);
    mockPathname.mockReturnValue('/orders');
    render(
      <>
        <header data-shell-header="" />
        <ShellContext />
      </>,
    );
    expect(screen.getByRole('navigation', { name: 'You are here' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Orders' })).toBeNull();
    expect(screen.getByText('Orders')).toHaveAttribute('aria-current', 'page');
  });

  it('shows the section and the page, with the section a real list link', () => {
    stubObserver(false);
    mockPathname.mockReturnValue('/orders/BEC-O-00036');
    render(
      <>
        <header data-shell-header="" />
        <ShellContext />
      </>,
    );
    expect(screen.getByRole('navigation', { name: 'You are here' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/orders');
    expect(screen.getByText('BEC-O-00036')).toBeInTheDocument();
  });

  it('names the create screen New quote', () => {
    stubObserver(false);
    mockPathname.mockReturnValue('/quotes/new');
    render(
      <>
        <header data-shell-header="" />
        <ShellContext />
      </>,
    );
    expect(screen.getByRole('link', { name: 'Quotes' })).toHaveAttribute('href', '/quotes');
    expect(screen.getByText('New quote')).toBeInTheDocument();
  });

  it('shows the article title, not the blog id', () => {
    stubObserver(false);
    mockPathname.mockReturnValue('/studio/blog/e43cf2d0-cafa-48a4-982f-55eb67d4ec25');
    render(
      <ShellPageLabelProvider>
        <header data-shell-header="" />
        <ShellPageLabel label="Sintered Stone in Kenya: A Buying Guide" />
        <ShellContext />
      </ShellPageLabelProvider>,
    );
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/studio/blog');
    expect(screen.getByText('Sintered Stone in Kenya: A Buying Guide')).toBeInTheDocument();
    expect(screen.queryByText(/e43cf2d0/)).toBeNull();
  });

  it('has no accessibility violations', async () => {
    stubObserver(false);
    mockPathname.mockReturnValue('/quotes/BEC-Q-00001');
    const { container } = render(
      <>
        <header data-shell-header="" />
        <ShellContext />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
