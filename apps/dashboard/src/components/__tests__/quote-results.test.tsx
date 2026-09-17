import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { QuoteListItem } from '@/lib/quotes';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/quotes',
  useSearchParams: () => params,
}));

const { QuoteResults } = await import('../quote-results');

const quote = (patch: Partial<QuoteListItem> = {}): QuoteListItem => ({
  id: '11111111-1111-4111-8111-111111111111',
  referenceNumber: 'BEC-Q-00001',
  customerName: 'Njeri Kamau',
  customerPhone: '0711222333',
  status: 'reviewing',
  source: 'web',
  createdAt: '2026-09-17T10:28:00.000Z',
  validUntil: null,
  requiresApproval: false,
  approvedAt: null,
  assignedTo: 'sales-1',
  assignedToName: 'Ken Mutiso',
  createdBy: 'sales-1',
  createdByName: 'Ken Mutiso',
  value: 30000,
  isPriced: true,
  itemCount: 2,
  ...patch,
});

const many = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    quote({
      id: `id-${i + 1}`,
      referenceNumber: `BEC-Q-${String(i + 1).padStart(5, '0')}`,
      customerName: `Customer ${i + 1}`,
    }),
  );

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('QuoteResults', () => {
  it('labels a web quote as Website, never Web', () => {
    render(<QuoteResults quotes={[quote()]} />);
    expect(screen.getAllByText('Website').length).toBeGreaterThan(0);
    expect(screen.queryByText('Web')).toBeNull();
  });

  it('gives every quote an explicit View action to its detail page', () => {
    render(
      <QuoteResults
        quotes={[
          quote(),
          quote({
            id: '22222222-2222-4222-8222-222222222222',
            referenceNumber: 'BEC-Q-00004',
            customerName: 'Mutua Peter',
          }),
        ]}
      />,
    );

    const first = screen.getAllByRole('link', { name: /view.*BEC-Q-00001/i });
    const second = screen.getAllByRole('link', { name: /view.*BEC-Q-00004/i });
    expect(first.length).toBeGreaterThan(0);
    expect(second.length).toBeGreaterThan(0);
    for (const link of first) {
      expect(link).toHaveAttribute('href', '/quotes/BEC-Q-00001');
    }
    for (const link of second) {
      expect(link).toHaveAttribute('href', '/quotes/BEC-Q-00004');
    }
  });

  it('keeps the quote number itself a link to the same detail page', () => {
    render(<QuoteResults quotes={[quote()]} />);
    const references = screen.getAllByRole('link', { name: 'BEC-Q-00001' });
    expect(references.length).toBeGreaterThan(0);
    for (const link of references) {
      expect(link).toHaveAttribute('href', '/quotes/BEC-Q-00001');
    }
  });

  it('paginates a long list so the first page does not include later rows', () => {
    render(<QuoteResults quotes={many(9)} />);
    expect(screen.getAllByRole('link', { name: 'BEC-Q-00001' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'BEC-Q-00009' })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });

  it('Next writes page into the URL, so the row set can actually change', async () => {
    const user = userEvent.setup();
    render(<QuoteResults quotes={many(9)} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(push).toHaveBeenCalledWith('/quotes?page=2');
  });

  it('renders the later page from the URL', () => {
    params = new URLSearchParams('page=2');
    render(<QuoteResults quotes={many(9)} />);
    expect(screen.getAllByRole('link', { name: 'BEC-Q-00009' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'BEC-Q-00001' })).toBeNull();
  });

  it('hides the pager when every quote fits on one page', () => {
    render(<QuoteResults quotes={many(3)} />);
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  });

  it('makes the phone card itself the View action, not a second full-width button', () => {
    render(<QuoteResults quotes={[quote()]} />);
    expect(screen.queryByRole('link', { name: /view quote BEC-Q-00001/i })).toBeNull();
    const views = screen.getAllByRole('link', { name: 'View BEC-Q-00001' });
    expect(views.length).toBeGreaterThan(0);
    for (const link of views) {
      expect(link).toHaveAttribute('href', '/quotes/BEC-Q-00001');
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<QuoteResults quotes={[quote()]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
