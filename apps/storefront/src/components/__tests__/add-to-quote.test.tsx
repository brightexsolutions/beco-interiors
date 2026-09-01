import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToQuote } from '../add-to-quote';
import { readList } from '@/lib/quote-list';

/**
 * Rule 3: no decorative controls. "Add to quote" is the primary conversion
 * action on a product page, so the proof required is that the list actually
 * changed, not that a handler exists.
 */
const line = { slug: 'amber-jade', name: 'Amber Jade', unit: 'per slab', image: '/img/a.webp' };

beforeEach(() => window.localStorage.clear());

describe('AddToQuote', () => {
  it('writes the product to the quote list', async () => {
    const user = userEvent.setup();
    render(<AddToQuote line={line} />);
    await user.click(screen.getByRole('button', { name: 'Add to quote' }));
    expect(readList()).toEqual([{ ...line, quantity: 1 }]);
  });

  it('adds the quantity the customer chose, not always one', async () => {
    const user = userEvent.setup();
    render(<AddToQuote line={line} />);
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    await user.click(screen.getByRole('button', { name: 'Add to quote' }));
    expect(readList()[0]?.quantity).toBe(3);
  });

  it('never goes below one', async () => {
    const user = userEvent.setup();
    render(<AddToQuote line={line} />);
    const decrease = screen.getByRole('button', { name: 'Decrease quantity' });
    expect(decrease).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Add to quote' }));
    expect(readList()[0]?.quantity).toBe(1);
  });

  it('confirms that it happened, rather than looking unchanged', async () => {
    const user = userEvent.setup();
    render(<AddToQuote line={line} />);
    await user.click(screen.getByRole('button', { name: 'Add to quote' }));
    expect(screen.getByRole('button', { name: 'Added to your list' })).toBeInTheDocument();
  });
});
