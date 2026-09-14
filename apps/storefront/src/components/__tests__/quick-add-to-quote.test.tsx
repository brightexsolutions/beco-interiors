import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickAddToQuote } from '../quick-add-to-quote';
import { readList } from '@/lib/quote-list';

/**
 * Rule 3: no decorative controls. This card level control used to always add
 * exactly one, which is why the quantity behaviour gets the same proof as
 * AddToQuote's: the list actually changed by the amount shown, not just that
 * a handler exists.
 *
 * The button's accessible name carries the product and the quantity, e.g.
 * "Add 1 of Gold Bar Handle to your quote list", so a screen reader can tell
 * one card's trigger from another's in a grid of otherwise identical
 * "Add to quote" buttons. Queried by that pattern rather than the visible
 * text alone.
 */
const handleLine = { slug: 'gold-bar-handle', name: 'Gold Bar Handle', unit: 'per piece', image: '/img/h.webp' };
const slabLine = { slug: 'amber-jade', name: 'Amber Jade', unit: 'per slab', image: '/img/a.webp' };
const trigger = (name: string) => screen.getByRole('button', { name: new RegExp(`^Add .* ${name} `) });

beforeEach(() => window.localStorage.clear());

describe('QuickAddToQuote, a discrete item', () => {
  it('adds one by default, without opening the product', async () => {
    const user = userEvent.setup();
    render(<QuickAddToQuote line={handleLine} />);
    await user.click(trigger('Gold Bar Handle'));
    expect(readList()).toEqual([{ ...handleLine, quantity: 1 }]);
  });

  it('adds the quantity set on the stepper, not always one', async () => {
    const user = userEvent.setup();
    render(<QuickAddToQuote line={handleLine} />);
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    await user.click(trigger('Gold Bar Handle'));
    expect(readList()[0]?.quantity).toBe(3);
  });

  it('never uses the primary red button style, rationed for one action a page', () => {
    // Reported directly: a grid of eight or twelve of these, each a filled
    // red button, read as "many red buttons" rather than a considered page.
    render(<QuickAddToQuote line={handleLine} />);
    expect(trigger('Gold Bar Handle').className).not.toMatch(/bg-warm-red/);
  });

  it('confirms that it happened', async () => {
    const user = userEvent.setup();
    render(<QuickAddToQuote line={handleLine} />);
    await user.click(trigger('Gold Bar Handle'));
    expect(screen.getByRole('button', { name: 'Gold Bar Handle is on your quote list' }))
      .toBeInTheDocument();
  });
});

describe('QuickAddToQuote, a slab', () => {
  it('steps in halves, the same rule the product page uses', async () => {
    const user = userEvent.setup();
    render(<QuickAddToQuote line={slabLine} />);
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    await user.click(trigger('Amber Jade'));
    expect(readList()[0]?.quantity).toBe(1.5);
  });

  it('can be brought down to a half slab, not just to a whole one', async () => {
    const user = userEvent.setup();
    render(<QuickAddToQuote line={slabLine} />);
    const decrease = screen.getByRole('button', { name: 'Decrease quantity' });
    // A whole slab is not the floor, so the control does not open disabled.
    expect(decrease).not.toBeDisabled();
    await user.click(decrease);
    await user.click(trigger('Amber Jade'));
    expect(readList()[0]?.quantity).toBe(0.5);
  });
});
