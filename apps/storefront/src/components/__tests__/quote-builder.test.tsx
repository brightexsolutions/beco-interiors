import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteBuilder } from '../quote-builder';
import { STORAGE_KEY, readList } from '@/lib/quote-list';
import { track } from '@/lib/analytics';

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
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

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
  vi.mocked(track).mockClear();
});

describe('QuoteBuilder: analytics (D128)', () => {
  it('records quote_submitted once the server returns a reference, carrying nothing from the form', async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder />);
    await user.type(await screen.findByLabelText(/Your name/), 'Achieng');
    await user.type(screen.getByLabelText(/Phone number/), '0722333730');
    await user.click(screen.getByRole('button', { name: 'Send my request' }));
    await vi.waitFor(() => expect(track).toHaveBeenCalledTimes(1));
    // No second argument at all: no name, phone, reference or list contents.
    expect(vi.mocked(track).mock.calls[0]).toEqual(['quote_submitted']);
  });

  it('records nothing when the server rejects the submission', async () => {
    const { submitQuote } = await import('@/app/quote/actions');
    vi.mocked(submitQuote).mockResolvedValueOnce({
      ok: false,
      error: 'Please check the highlighted fields.',
      fieldErrors: { customerPhone: ['Enter a valid Kenyan phone number'] },
    } as never);
    const user = userEvent.setup();
    render(<QuoteBuilder />);
    await user.type(await screen.findByLabelText(/Your name/), 'Achieng');
    await user.type(screen.getByLabelText(/Phone number/), '123');
    await user.click(screen.getByRole('button', { name: 'Send my request' }));
    expect(await screen.findByText('Enter a valid Kenyan phone number')).toBeDefined();
    expect(track).not.toHaveBeenCalled();
  });
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

  it('fills the second column with real information instead of leaving it blank', async () => {
    // Regression: the confirmation used to be a single narrow block dropped
    // into the page's full width grid, reported directly as extreme empty
    // space on a wide screen. It now keeps the same two column shape the
    // form uses, with hours, the phone line and the showroom address on the
    // right rather than nothing.
    const user = userEvent.setup();
    render(<QuoteBuilder />);

    await user.type(await screen.findByLabelText(/Your name/), 'Wanjiru');
    await user.type(screen.getByLabelText(/Phone number/), '0722000000');
    await user.click(screen.getByRole('button', { name: /Send my request/ }));

    await screen.findByText(/BQ-2026-0001/);
    expect(screen.getByText('Mon to Fri, 8am to 4pm. Sat, 8am to 2pm')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+254 722 333 730' })).toHaveAttribute(
      'href',
      'tel:+254722333730',
    );
    expect(screen.getByText(/Urban Square/)).toBeInTheDocument();
  });
});

describe('QuoteBuilder, removing a line', () => {
  it('removes the line from the stored list, not just from the screen', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([line]));
    const user = userEvent.setup();
    render(<QuoteBuilder />);

    await user.click(
      await screen.findByRole('button', { name: `Remove ${line.name} from your quote list` }),
    );

    expect(screen.queryByText(line.name)).not.toBeInTheDocument();
    expect(readList()).toEqual([]);
  });
});

describe('QuoteBuilder, the per-line quantity stepper', () => {
  const handleLine = {
    slug: 'gold-bar-handle', name: 'Gold Bar Handle', unit: 'per piece',
    image: '/img/h.webp', quantity: 2,
  };

  it('steps a slab line in halves, because it is cut to order', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([line]));
    const user = userEvent.setup();
    render(<QuoteBuilder />);

    await user.click(await screen.findByRole('button', { name: `Increase quantity of ${line.name}` }));
    expect(readList()[0]?.quantity).toBe(2.5);
  });

  it('steps a discrete line by one whole unit, not by half', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([handleLine]));
    const user = userEvent.setup();
    render(<QuoteBuilder />);

    await user.click(await screen.findByRole('button', { name: `Increase quantity of ${handleLine.name}` }));
    expect(readList()[0]?.quantity).toBe(3);
  });
});

describe('QuoteBuilder, collection or delivery', () => {
  // Closes the QA checklist's own "NOT CONFIRMED by test" gap on this control.
  it('reveals the delivery charge notice and the address field only once delivery is chosen', async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder />);

    expect(screen.queryByText(/Delivery is charged separately/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Delivery address/)).not.toBeInTheDocument();

    await user.click(await screen.findByRole('radio', { name: 'Please deliver' }));

    expect(screen.getByText(/Delivery is charged separately/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Delivery address/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'I will collect' }));

    expect(screen.queryByText(/Delivery is charged separately/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Delivery address/)).not.toBeInTheDocument();
  });
});

describe('QuoteBuilder, adding more materials', () => {
  it('links back to the shop rather than leaving the list a dead end', async () => {
    render(<QuoteBuilder />);

    expect(await screen.findByRole('link', { name: /Add more materials/ })).toHaveAttribute(
      'href',
      '/shop',
    );
  });
});

describe('QuoteBuilder: guidance and recovery', () => {
  it('shows where the reader is in three steps, the details step current', async () => {
    render(<QuoteBuilder />);
    const steps = await screen.findByRole('list', { name: 'How a quote works' });
    const items = steps.querySelectorAll('li');
    expect([...items].map((li) => li.textContent)).toEqual(['Your list', '2Your details', '3We price it']);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
  });

  it('moves focus to the first field the server rejected, so it is not left off screen', async () => {
    const { submitQuote } = await import('@/app/quote/actions');
    vi.mocked(submitQuote).mockResolvedValueOnce({
      ok: false,
      error: 'Please check the highlighted fields.',
      fieldErrors: { customerPhone: ['Enter a valid Kenyan phone number'] },
    } as never);
    const user = userEvent.setup();
    render(<QuoteBuilder />);
    await user.type(await screen.findByLabelText(/Your name/), 'Achieng');
    await user.type(screen.getByLabelText(/Phone number/), '123');
    await user.click(screen.getByRole('button', { name: 'Send my request' }));
    expect(await screen.findByText('Enter a valid Kenyan phone number')).toBeDefined();
    expect(screen.getByLabelText(/Phone number/)).toHaveFocus();
  });

  it('offers WhatsApp beside the phone line, and says when we reply', async () => {
    render(<QuoteBuilder />);
    const link = await screen.findByRole('link', { name: 'message us on WhatsApp' });
    expect(link.getAttribute('href')).toContain('wa.me');
    expect(screen.getByText(/We reply in working hours/)).toBeDefined();
  });
});

describe('QuoteBuilder: the list summary', () => {
  it('never deletes a line from the minus button: it stops at one step, and Remove deletes', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...line, quantity: 0.5 }]));
    const user = userEvent.setup();
    render(<QuoteBuilder />);
    const minus = await screen.findByRole('button', { name: /decrease quantity of amber jade/i });
    expect(minus).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /increase quantity of amber jade/i }));
    expect(readList()[0]?.quantity).toBe(1);
    await user.click(screen.getByRole('button', { name: /remove amber jade/i }));
    expect(readList()).toHaveLength(0);
  });

  it('heads the list with its count', async () => {
    render(<QuoteBuilder />);
    const heading = await screen.findByRole('heading', { name: /your list/i });
    expect(heading.textContent).toMatch(/^Your list\d+items?$/);
  });
});
