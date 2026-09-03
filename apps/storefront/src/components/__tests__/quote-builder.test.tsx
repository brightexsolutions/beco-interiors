import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteBuilder } from '../quote-builder';
import { STORAGE_KEY, readList } from '@/lib/quote-list';

/**
 * The quote flow is the product, so the form is proven to RENDER and to carry
 * its values, not just to exist.
 *
 * The fields moved onto the shared Field and Input from @beco/ui under rule 5.
 * A refactor of the most important form on the site is exactly the change that
 * can silently drop a label, break the id that ties it to its input, or lose a
 * name attribute so a value never reaches the server action. Each of those
 * still renders perfectly and passes a visual review.
 *
 * The server action itself is covered against the real database by
 * submit-quote.integration.test.ts. This file is about the form.
 */
vi.mock('@/app/quote/actions', () => ({
  submitQuote: vi.fn(async () => ({ ok: true as const, reference: 'BQ-2026-0001' })),
}));

const line = {
  slug: 'amber-jade', name: 'Amber Jade', unit: 'per slab',
  image: '/img/a.webp', quantity: 2,
};

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([line]));
});

describe('QuoteBuilder', () => {
  it('shows the list it was given rather than the empty state', async () => {
    render(<QuoteBuilder />);
    expect(await screen.findByText('Amber Jade')).toBeDefined();
  });

  it('labels every field it asks for, so each input is reachable by its name', async () => {
    render(<QuoteBuilder />);
    // getByLabelText fails unless the label is genuinely tied to the control,
    // which is the half of the refactor most likely to have broken.
    expect(await screen.findByLabelText(/Your name/)).toBeDefined();
    expect(screen.getByLabelText(/Phone number/)).toBeDefined();
    expect(screen.getByLabelText(/Email/)).toBeDefined();
    expect(screen.getByLabelText(/Company/)).toBeDefined();
    expect(screen.getByLabelText(/Anything else we should know\?/)).toBeDefined();
  });

  it('keeps the name attributes the server action reads', async () => {
    render(<QuoteBuilder />);
    const name = (await screen.findByLabelText(/Your name/)) as HTMLInputElement;
    const phone = screen.getByLabelText(/Phone number/) as HTMLInputElement;
    const details = screen.getByLabelText(/Anything else we should know\?/) as HTMLTextAreaElement;

    // A missing name attribute means the value never arrives, and the form
    // still looks and behaves completely normally.
    expect(name.name).toBe('customerName');
    expect(phone.name).toBe('customerPhone');
    expect(details.name).toBe('projectDetails');
  });

  it('accepts typing into the fields', async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder />);
    const name = (await screen.findByLabelText(/Your name/)) as HTMLInputElement;
    await user.type(name, 'Wanjiru');
    expect(name.value).toBe('Wanjiru');
  });

  it('leaves the stored list alone just by rendering the form', async () => {
    render(<QuoteBuilder />);
    await screen.findByText('Amber Jade');
    expect(readList()).toEqual([line]);
  });
});

describe('QuoteBuilder, on success', () => {
  it('brings the reference into view and focuses it, rather than leaving the reader in the footer', async () => {
    // The confirmation is much shorter than the form and list it replaces, so
    // the page collapses and the browser keeps the old scroll offset. On a
    // list of any length that lands the reader in the footer, having just
    // been given a reference number they never saw. jsdom has no layout, so
    // what is asserted is that the component asks to be scrolled to and takes
    // focus, which is the behaviour that was missing.
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    const user = userEvent.setup();
    render(<QuoteBuilder />);

    await user.type(await screen.findByLabelText(/Your name/), 'Wanjiru');
    await user.type(screen.getByLabelText(/Phone number/), '0722000000');
    await user.click(screen.getByRole('button', { name: /Send my request/ }));

    const heading = await screen.findByRole('heading', { name: /Reference BQ-2026-0001/ });
    expect(scrollIntoView).toHaveBeenCalled();
    expect(heading).toBe(document.activeElement);
  });

  it('shows the reference the server minted, not one it made up', async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder />);

    await user.type(await screen.findByLabelText(/Your name/), 'Wanjiru');
    await user.type(screen.getByLabelText(/Phone number/), '0722000000');
    await user.click(screen.getByRole('button', { name: /Send my request/ }));

    expect(await screen.findByText(/BQ-2026-0001/)).toBeDefined();
  });
});
