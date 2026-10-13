import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { toast } from '@beco/ui';

const { ConnectionStatus } = await import('../connection-status');

const setOnLine = (value: boolean) => Object.defineProperty(navigator, 'onLine', { value, configurable: true });

afterEach(() => {
  setOnLine(true);
});

describe('ConnectionStatus', () => {
  it('draws nothing while the connection is up', () => {
    setOnLine(true);
    render(<ConnectionStatus />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('says plainly that the person is offline, as soon as the browser does, and announces it', () => {
    setOnLine(true);
    render(<ConnectionStatus />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    const bar = screen.getByRole('status');
    expect(bar).toHaveTextContent('You are offline. Nothing will save until the connection is back.');
    expect(bar).toHaveAttribute('aria-live', 'assertive');
  });

  it('starts shown when the page loads offline', () => {
    setOnLine(false);
    render(<ConnectionStatus />);
    expect(screen.getByRole('status')).toHaveTextContent('You are offline');
  });

  it('goes when the connection is back and says so in a toast', () => {
    setOnLine(false);
    const success = vi.spyOn(toast, 'success').mockImplementation(() => '' as never);
    render(<ConnectionStatus />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByRole('status')).toBeNull();
    expect(success).toHaveBeenCalledWith('Back online. You can carry on.');
    success.mockRestore();
  });

  it('has no accessibility violations while offline', async () => {
    setOnLine(false);
    const { container } = render(<ConnectionStatus />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
