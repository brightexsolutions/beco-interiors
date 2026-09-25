import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { Dialog } from '../dialog';

const setup = (over: Partial<React.ComponentProps<typeof Dialog>> = {}) => {
  const onOpenChange = vi.fn();
  const view = render(
    <Dialog open onOpenChange={onOpenChange} title="Preview BEC-Q-00042" {...over}>
      <p>The quote PDF</p>
      <a href="/quotes/BEC-Q-00042/pdf?download=1">Download</a>
    </Dialog>,
  );
  return { onOpenChange, ...view };
};

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    setup({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('names itself, so a screen reader does not hear an untitled modal', () => {
    setup();
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Preview BEC-Q-00042');
  });

  it('Close actually closes, and is a 44px target', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close.className).toContain('min-h-11');
    await user.click(close);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('escape closes', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('is modal', () => {
    setup();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('locks the page behind so a wheel does not scroll it', () => {
    setup();
    expect(document.body.style.overflow).toBe('hidden');
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('has no accessibility violations', async () => {
    const { container } = setup();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('can land focus on a search field instead of Close', () => {
    function Harness() {
      const searchRef = useRef<HTMLInputElement>(null);
      return (
        <Dialog open onOpenChange={vi.fn()} title="Add from catalogue" initialFocusRef={searchRef}>
          <input ref={searchRef} type="search" aria-label="Search" />
        </Dialog>
      );
    }
    render(<Harness />);
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveFocus();
  });
});
