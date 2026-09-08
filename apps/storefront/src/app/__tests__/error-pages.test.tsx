import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import ErrorPage from '../error';
import GlobalErrorPage from '../global-error';

/**
 * The two 500s. `error.tsx` renders inside the layout and keeps the chrome;
 * `global-error.tsx` replaces the layout and brings its own html and body,
 * so RTL nests that inside a div and jsdom logs a nesting warning. The
 * assertions still hold: what matters is the heading, the working retry, and
 * the digest showing only when there is one.
 */
const thrown = (digest?: string) =>
  Object.assign(new Error('boom') as Error & { digest?: string }, digest ? { digest } : {});

afterEach(() => vi.restoreAllMocks());

describe('error.tsx, the in-layout 500', () => {
  it('renders the heading and keeps the sale alive with retry, WhatsApp and a call', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorPage error={thrown()} reset={() => {}} />);
    expect(screen.getByRole('heading', { level: 1, name: 'That did not load.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', expect.stringContaining('wa.me'));
    expect(screen.getByRole('link', { name: /254 722 333 730/ })).toHaveAttribute('href', expect.stringContaining('tel:'));
  });

  it('calls reset() when Try again is pressed, the one control that can fix it', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reset = vi.fn();
    render(<ErrorPage error={thrown()} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('shows the digest reference only when the error carries one', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<ErrorPage error={thrown()} reset={() => {}} />);
    expect(screen.queryByText(/Quote reference/)).toBeNull();
    rerender(<ErrorPage error={thrown('abc123')} reset={() => {}} />);
    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('logs the digest so it ties to the server entry', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorPage error={thrown('deadbeef')} reset={() => {}} />);
    expect(spy).toHaveBeenCalledWith('storefront error', 'deadbeef', expect.anything());
  });

  it('has no accessibility violations', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<ErrorPage error={thrown()} reset={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('global-error.tsx, the last resort', () => {
  it('renders a plain branded page with a working reload', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reset = vi.fn();
    render(<GlobalErrorPage error={thrown()} reset={reset} />);
    expect(screen.getByRole('heading', { level: 1, name: 'The site is having a moment.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload the site' }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('offers the phone line, which does not depend on the site working', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<GlobalErrorPage error={thrown()} reset={() => {}} />);
    expect(screen.getByRole('link', { name: /254 722 333 730/ })).toHaveAttribute(
      'href', 'tel:+254722333730',
    );
  });

  it('shows the reference only when there is a digest', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<GlobalErrorPage error={thrown()} reset={() => {}} />);
    expect(screen.queryByText(/Reference/)).toBeNull();
    rerender(<GlobalErrorPage error={thrown('ref-9')} reset={() => {}} />);
    expect(screen.getByText('ref-9')).toBeInTheDocument();
  });
});
