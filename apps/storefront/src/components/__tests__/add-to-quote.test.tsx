import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToQuote } from '../add-to-quote';
import { readList } from '@/lib/quote-list';

/**
 * Rule 3: no decorative controls. "Add to quote" is the primary conversion
 * action on a product page, so the proof required is that the list actually
 * changed, not that a handler exists.
 *
 * Two fixtures, because the stepper's step and floor are a property of the
 * product being added, not a constant: a slab is cut to order and can be
 * bought in halves, and a handle cannot, so "2.5 handles" would mean nothing.
 * See migration 23.
 */
const slabLine = { slug: 'amber-jade', name: 'Amber Jade', unit: 'per slab', image: '/img/a.webp' };
const handleLine = { slug: 'gold-bar-handle', name: 'Gold Bar Handle', unit: 'per piece', image: '/img/h.webp' };

beforeEach(() => window.localStorage.clear());

describe('AddToQuote, a discrete item', () => {
  it('writes the product to the quote list', async () => {
    const user = userEvent.setup();
    render(<AddToQuote line={handleLine} />);
    await user.click(screen.getByRole('button', { name: 'Add to quote' }));
    expect(readList()).toEqual([{ ...handleLine, quantity: 1 }]);
  });

  it('steps by one whole unit at a time', async () => {
    const user = userEvent.setup();
    render(<AddToQuote line={handleLine} />);
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    await user.click(screen.getByRole('button', { name: 'Add to quote' }));
    expect(readList()[0]?.quantity).toBe(3);
  });

  it('never goes below one whole unit', async () => {
    const user = userEvent.setup();
    render(<AddToQuote line={handleLine} />);
    const decrease = screen.getByRole('button', { name: 'Decrease quantity' });
    expect(decrease).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Add to quote' }));
    expect(readList()[0]?.quantity).toBe(1);
  });

  it('confirms that it happened, and offers the route to review the quote', async () => {
    const user = userEvent.setup();
    render(<AddToQuote line={handleLine} />);
    await user.click(screen.getByRole('button', { name: 'Add to quote' }));
    // The add button changes, and a link straight to /quote appears carrying
    // the live count, so the reader is not left to find the header link.
    expect(screen.getByRole('button', { name: 'Add again' })).toBeInTheDocument();
    const review = screen.getByRole('link', { name: /Review quote/ });
    expect(review).toHaveAttribute('href', '/quote');
    expect(review).toHaveTextContent('(1)');
  });
});

describe('AddToQuote, a slab', () => {
  it('starts at one whole slab, the default way a slab is sold', async () => {
    const user = userEvent.setup();
    render(<AddToQuote line={slabLine} />);
    await user.click(screen.getByRole('button', { name: 'Add to quote' }));
    expect(readList()[0]?.quantity).toBe(1);
  });

  it('steps in halves, because a slab is cut to order', async () => {
    const user = userEvent.setup();
    render(<AddToQuote line={slabLine} />);
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    await user.click(screen.getByRole('button', { name: 'Add to quote' }));
    expect(readList()[0]?.quantity).toBe(1.5);
  });

  it('can be brought down to a half slab, not just to a whole one', async () => {
    const user = userEvent.setup();
    render(<AddToQuote line={slabLine} />);
    const decrease = screen.getByRole('button', { name: 'Decrease quantity' });
    // A whole slab is not the floor for this product, so the control is not
    // disabled at the quantity it opens on.
    expect(decrease).not.toBeDisabled();
    await user.click(decrease);
    await user.click(screen.getByRole('button', { name: 'Add to quote' }));
    expect(readList()[0]?.quantity).toBe(0.5);
  });

  it('stops at half a slab and cannot reach zero or a negative amount', async () => {
    const user = userEvent.setup();
    render(<AddToQuote line={slabLine} />);
    const decrease = screen.getByRole('button', { name: 'Decrease quantity' });
    await user.click(decrease);
    expect(decrease).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Add to quote' }));
    expect(readList()[0]?.quantity).toBe(0.5);
  });

  it('says plainly that it is sold whole by default', () => {
    render(<AddToQuote line={slabLine} />);
    expect(screen.getByText(/Sold whole/)).toBeInTheDocument();
  });
});
