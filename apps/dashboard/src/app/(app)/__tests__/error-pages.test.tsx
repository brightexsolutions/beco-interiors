import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import DashboardError from '../error';
import DashboardNotFound from '../not-found';

const thrown = (digest?: string) =>
  Object.assign(new Error('boom') as Error & { digest?: string }, digest ? { digest } : {});

afterEach(() => vi.restoreAllMocks());

describe('dashboard error.tsx', () => {
  it('says saved work is safe and offers a real retry and a way home', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DashboardError error={thrown()} reset={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('This screen did not load');
    expect(screen.getByText(/anything you already saved is safe/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/');
  });

  it('Try again calls reset()', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reset = vi.fn();
    render(<DashboardError error={thrown()} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('shows and logs the digest only when there is one', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<DashboardError error={thrown()} reset={() => {}} />);
    expect(screen.queryByText(/Reference/)).toBeNull();
    rerender(<DashboardError error={thrown('d1g3st')} reset={() => {}} />);
    expect(screen.getByText('d1g3st')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith('dashboard error', 'd1g3st', expect.anything());
  });

  it('has no accessibility violations', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<DashboardError error={thrown()} reset={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('dashboard not-found.tsx', () => {
  it('names the problem and links back to real lists', () => {
    render(<DashboardNotFound />);
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quotes' })).toHaveAttribute('href', '/quotes');
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<DashboardNotFound />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
