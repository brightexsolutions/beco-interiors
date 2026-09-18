import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useScrollLock } from '../use-scroll-lock';

function Lock({ open }: { open: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useScrollLock(open, panelRef);
  if (!open) return null;
  return (
    <div ref={panelRef} role="dialog">
      Panel
    </div>
  );
}

describe('useScrollLock', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('locks the page while open and restores it when closed', () => {
    const { rerender } = render(<Lock open />);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');
    rerender(<Lock open={false} />);
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('cancels a wheel on the page behind the panel', () => {
    render(<Lock open />);
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('lets the panel keep a wheel that lands on it', () => {
    function Scrollable() {
      const panelRef = useRef<HTMLDivElement>(null);
      useScrollLock(true, panelRef);
      return (
        <div ref={panelRef} role="dialog">
          <div data-testid="scroller">
            <p>Tall</p>
          </div>
        </div>
      );
    }
    render(<Scrollable />);
    const scroller = screen.getByTestId('scroller');
    const computed = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      if (el === scroller) {
        return { overflowY: 'auto', overflowX: 'hidden' } as CSSStyleDeclaration;
      }
      return computed(el);
    });
    Object.defineProperty(scroller, 'scrollHeight', { value: 400, configurable: true });
    Object.defineProperty(scroller, 'clientHeight', { value: 40, configurable: true });
    Object.defineProperty(scroller, 'scrollTop', { value: 0, configurable: true });
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 });
    scroller.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
