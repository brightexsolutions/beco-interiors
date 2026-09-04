import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MobileActionBar } from '../mobile-action-bar';

const scrollTo = (y: number) => {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  fireEvent.scroll(window);
};

describe('MobileActionBar', () => {
  it('sits off screen and out of the tab order before any scroll', () => {
    scrollTo(0);
    render(<MobileActionBar />);
    expect(screen.getByText('WhatsApp').closest('div[aria-hidden]')).toHaveClass(
      'translate-y-full',
    );
    expect(screen.getByText('WhatsApp').closest('a')).toHaveAttribute('tabIndex', '-1');
  });

  it('slides into view and into the tab order once the reader scrolls', () => {
    scrollTo(0);
    render(<MobileActionBar />);
    scrollTo(20);
    expect(screen.getByText('WhatsApp').closest('div[aria-hidden]')).toHaveClass(
      'translate-y-0',
    );
    expect(screen.getByText('WhatsApp').closest('a')).not.toHaveAttribute('tabIndex');
  });

  it('hides again on scrolling back to the very top, not a once seen flag', () => {
    scrollTo(20);
    render(<MobileActionBar />);
    scrollTo(0);
    expect(screen.getByText('WhatsApp').closest('div[aria-hidden]')).toHaveClass(
      'translate-y-full',
    );
  });

  it('links to a real WhatsApp chat and the real phone number, not a placeholder', () => {
    scrollTo(20);
    render(<MobileActionBar />);
    expect(screen.getByText('WhatsApp').closest('a')).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/'),
    );
    expect(screen.getByText('Call').closest('a')).toHaveAttribute('href', 'tel:+254722333730');
  });
});
