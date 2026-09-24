import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { sendQuoteEmail, updateQuoteLines } from '@/app/(app)/quotes/actions';
import { QuoteDocumentPanel } from '../quote-document-panel';
import { QuoteDraftFlushProvider } from '../quote-draft-flush';
import { QuoteLines } from '../quote-lines';
import type { QuoteLine } from '@/lib/quote-detail';

vi.mock('@/app/(app)/quotes/actions', () => ({
  sendQuoteEmail: vi.fn(async () => ({})),
  updateQuoteLines: vi.fn(async () => ({ ok: 'Items saved.', updatedAt: '2026-09-17T12:00:00.000Z' })),
  addCustomLine: vi.fn(async () => ({})),
  addCatalogueLines: vi.fn(async () => ({})),
}));

vi.mock('@/lib/catalogue', () => ({
  listCatalogueRanges: vi.fn(async () => []),
  searchCatalogue: vi.fn(async () => []),
}));

const props = {
  quoteId: 'q',
  updatedAt: 't',
  reference: 'BEC-Q-00042',
  customerEmail: 'a@example.com',
  canMutate: true,
};

describe('QuoteDocumentPanel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), { status: 200 })),
    );
  });

  it('View is the action, and it is a compact button that opens the dialog', async () => {
    const user = userEvent.setup();
    render(<QuoteDocumentPanel {...props} />);
    expect(screen.queryByRole('button', { name: 'Generate PDF' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Preview' })).toBeNull();
    const view = screen.getByRole('button', { name: 'View' });
    expect(view.className).toContain('h-11');
    expect(view.className).toContain('px-3');
    await user.click(view);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('BEC-Q-00042');
  });

  it('loads the PDF into the preview, and Download is a real file link', async () => {
    const user = userEvent.setup();
    render(<QuoteDocumentPanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'View' }));
    expect(await screen.findByRole('img', { name: 'BEC-Q-00042 PDF, page 1 of 1' })).toBeInTheDocument();
    expect(screen.queryByTitle('BEC-Q-00042 PDF')).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      '/quotes/BEC-Q-00042/pdf',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }),
    );
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      '/quotes/BEC-Q-00042/pdf?download=1',
    );
  });

  it('shows the error when the PDF cannot be opened, rather than a blank frame', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Could not render the PDF', { status: 500 })),
    );
    const user = userEvent.setup();
    render(<QuoteDocumentPanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'View' }));
    expect(await screen.findByText(/could not render the pdf/i)).toBeInTheDocument();
    expect(screen.queryByTitle('BEC-Q-00042 PDF')).toBeNull();
  });

  it('Email is a real form, prefilled with the stored address', async () => {
    const user = userEvent.setup();
    render(<QuoteDocumentPanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'View' }));
    expect(screen.getByRole('button', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByLabelText(/email to/i)).toHaveValue('a@example.com');
  });

  it('actually sends through sendQuoteEmail on submit, and dispatches inside a transition', async () => {
    // Regression: the form's own action awaited flush() first, then called
    // useActionState's dispatch directly, which React only wraps in a
    // transition automatically for the form's OWN action, not for a call
    // made after an await inside it. That desync never threw, it only
    // logged "An async function with useActionState was called outside of
    // a transition", so Email had never actually been submitted in a test
    // before this one, only asserted to exist.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<QuoteDocumentPanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'View' }));
    await user.click(screen.getByRole('button', { name: 'Email' }));

    await waitFor(() => expect(sendQuoteEmail).toHaveBeenCalled());
    const form = vi.mocked(sendQuoteEmail).mock.calls.at(-1)?.[1];
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get('to')).toBe('a@example.com');
    expect((form as FormData).get('quoteId')).toBe('q');

    expect(
      consoleError.mock.calls.some((call) => String(call[0]).includes('outside of a transition')),
    ).toBe(false);
    consoleError.mockRestore();
  });

  it('Close actually closes the preview', async () => {
    const user = userEvent.setup();
    render(<QuoteDocumentPanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'View' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is axe clean when closed', async () => {
    const { container } = render(<QuoteDocumentPanel {...props} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('writes dirty quantities before View fetches the PDF', async () => {
    const user = userEvent.setup();
    const line: QuoteLine = {
      id: '11111111-1111-4111-8111-111111111111',
      description: 'Amber Jade',
      quantity: 1,
      unitPrice: 65000,
      listPrice: 65000,
      lineTotal: 65000,
      productId: '22222222-2222-4222-8222-222222222222',
      unit: 'per slab',
      removedFromCatalogue: false,
    };
    render(
      <QuoteDraftFlushProvider>
        <QuoteDocumentPanel
          quoteId="11111111-1111-4111-8111-111111111111"
          updatedAt="lock"
          reference="BEC-Q-00042"
          customerEmail="a@example.com"
          canMutate
        />
        <QuoteLines lines={[line]} quoteId="11111111-1111-4111-8111-111111111111" updatedAt="lock" canMutate />
      </QuoteDraftFlushProvider>,
    );
    await user.click(screen.getByRole('button', { name: /increase quantity of amber jade/i }));
    await user.click(screen.getByRole('button', { name: 'View' }));
    await waitFor(() => expect(updateQuoteLines).toHaveBeenCalled());
    const form = vi.mocked(updateQuoteLines).mock.calls.at(-1)?.[1];
    expect(form).toBeInstanceOf(FormData);
    expect(JSON.parse(String((form as FormData).get('items')))).toEqual([
      { lineId: line.id, quantity: 1.5, unitPrice: 65000 },
    ]);
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/quotes/BEC-Q-00042/pdf',
        expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }),
      ),
    );
    expect(vi.mocked(updateQuoteLines).mock.invocationCallOrder[0]!).toBeLessThan(
      vi.mocked(fetch).mock.invocationCallOrder[0]!,
    );
  });
});
