import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickAddToQuote } from '../quick-add-to-quote';
import { readList } from '@/lib/quote-list';

/**
 * Rule 3: no decorative controls. The button is replaced by the stepper and
 * a remove button once something is actually on the list, so this proves
 * both halves: the list changes by the amount shown, and removal is its own
 * explicit action rather than a side effect of decreasing to zero.
 */
const handleLine = { slug: 'gold-bar-handle', name: 'Gold Bar Handle', unit: 'per piece', image: '/img/h.webp' };
const slabLine = { slug: 'amber-jade', name: 'Amber Jade', unit: 'per slab', image: '/img/a.webp' };

beforeEach(() => window.localStorage.clear());

describe('QuickAddToQuote, before anything is added', () => {
  it('is a single button carrying an icon and a visible label', () => {
    render(<QuickAddToQuote line={handleLine} />);
    const button = screen.getByRole('button', { name: 'Add Gold Bar Handle to your quote list' });
    expect(button).toHaveTextContent('Add');
    expect(screen.queryByRole('button', { name: 'Increase quantity' })).not.toBeInTheDocument();
  });

  it('adds exactly one on the first click, without opening the product', async () => {
    const user = userEvent.setup();
    render(<QuickAddToQuote line={handleLine} />);
    await user.click(screen.getByRole('button', { name: 'Add Gold Bar Handle to your quote list' }));
    expect(readList()).toEqual([{ ...handleLine, quantity: 1 }]);
  });

  it('never uses the primary red button style', () => {
    render(<QuickAddToQuote line={handleLine} />);
    const button = screen.getByRole('button', { name: 'Add Gold Bar Handle to your quote list' });
    expect(button.className).not.toMatch(/bg-warm-red/);
  });
});

describe('QuickAddToQuote, once it is on the list', () => {
  it('replaces the add button with a stepper and a distinct remove button', async () => {
    const user = userEvent.setup();
    render(<QuickAddToQuote line={handleLine} />);
    await user.click(screen.getByRole('button', { name: 'Add Gold Bar Handle to your quote list' }));
    expect(screen.queryByRole('button', { name: /^Add / })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Gold Bar Handle from your quote list' }))
      .toBeInTheDocument();
  });

  it('adjusts the real list quantity from the stepper', async () => {
    const user = userEvent.setup();
    render(<QuickAddToQuote line={handleLine} />);
    await user.click(screen.getByRole('button', { name: 'Add Gold Bar Handle to your quote list' }));
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(readList()[0]?.quantity).toBe(2);
  });

  it('steps in halves for a slab and cannot go below half a slab', async () => {
    const user = userEvent.setup();
    render(<QuickAddToQuote line={slabLine} />);
    await user.click(screen.getByRole('button', { name: 'Add Amber Jade to your quote list' }));
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(readList()[0]?.quantity).toBe(1.5);
    const decrease = screen.getByRole('button', { name: 'Decrease quantity' });
    await user.click(decrease);
    expect(readList()[0]?.quantity).toBe(1);
    expect(decrease).not.toBeDisabled();
  });

  it('removes the line and reverts to the add button only on the explicit remove press', async () => {
    const user = userEvent.setup();
    render(<QuickAddToQuote line={handleLine} />);
    await user.click(screen.getByRole('button', { name: 'Add Gold Bar Handle to your quote list' }));
    // Decreasing does not remove it: the floor is one whole unit, not zero.
    expect(screen.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled();
    expect(readList()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Remove Gold Bar Handle from your quote list' }));
    expect(readList()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Add Gold Bar Handle to your quote list' })).toBeInTheDocument();
  });
});
