import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { Dialog, DialogBody, DialogFooter } from '../dialog';

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

describe('Dialog with an on screen keyboard', () => {
  it('pins itself to the visible area while the keyboard is open, so its footer stays above the keys', () => {
    const listeners: Record<string, () => void> = {};
    const vv = {
      height: 420,
      offsetTop: 60,
      addEventListener: (type: string, fn: () => void) => {
        listeners[type] = fn;
      },
      removeEventListener: () => {},
    };
    const original = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });
    try {
      setup();
      const overlay = screen.getByRole('dialog').parentElement!;
      expect(overlay).toHaveAttribute('data-keyboard-open', 'true');
      expect(overlay.style.top).toBe('60px');
      expect(overlay.style.height).toBe('420px');
    } finally {
      if (original) Object.defineProperty(window, 'visualViewport', original);
      else delete (window as { visualViewport?: unknown }).visualViewport;
    }
  });

  it('keeps its normal CSS sizing when no keyboard is open', () => {
    setup();
    const overlay = screen.getByRole('dialog').parentElement!;
    expect(overlay).not.toHaveAttribute('data-keyboard-open');
    expect(overlay.style.top).toBe('');
  });
});

describe('DialogBody and DialogFooter', () => {
  it('pads and scrolls the body, and pins the actions under it with a rule', () => {
    render(
      <Dialog open onOpenChange={() => undefined} title="Access for Aisha Farah">
        <DialogBody>
          <p>Product manager by role.</p>
        </DialogBody>
        <DialogFooter start={<span>3 sections</span>}>
          <button type="button">Cancel</button>
          <button type="button">Save access</button>
        </DialogFooter>
      </Dialog>,
    );
    const body = screen.getByText('Product manager by role.').parentElement!;
    expect(body).toHaveClass('overflow-y-auto', 'px-5', 'py-5', 'flex-1', 'min-h-0');
    const footer = screen.getByRole('button', { name: 'Save access' }).closest('.border-t')!;
    expect(footer).toHaveClass('shrink-0', 'border-neutral-200');
    // The body comes before the footer, so the actions stay put while it scrolls.
    expect(body.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(footer).toHaveTextContent('3 sections');
  });

  it('has no accessibility violations with a body and a footer', async () => {
    render(
      <Dialog open onOpenChange={() => undefined} title="Access">
        <DialogBody>
          <p>Body</p>
        </DialogBody>
        <DialogFooter>
          <button type="button">Save</button>
        </DialogFooter>
      </Dialog>,
    );
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
