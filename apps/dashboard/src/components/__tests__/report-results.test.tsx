import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { ConversionReport, LeaderboardReport } from '@/lib/reports';
import { PageHeading } from '../page-heading';
import { ReportFilters } from '../report-filters';
import { ReportResults } from '../report-results';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/reports',
  useSearchParams: () => params,
}));

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

const leaderboard: LeaderboardReport = {
  period: 'This month',
  invoiced: 100000,
  collected: 40000,
  people: [
    {
      id: 'sales-1',
      full_name: 'Sam Odhiambo',
      raised: 4,
      won: 2,
      lost: 1,
      won_value: 80000,
      conversion: 66.7,
      orders: 1,
      order_value: 40000,
    },
  ],
};

const conversion: ConversionReport = {
  period: 'This month',
  products: [
    {
      id: 'p1',
      name: 'Calacatta Gold',
      category: 'Sintered stone',
      views: 10,
      add_to_cart: 2,
      quote_submitted: 1,
      whatsapp: 3,
      calls: 1,
      view_to_cart: 20,
      cart_to_quote: 50,
    },
  ],
  categories: [
    {
      id: 'c1',
      name: 'Sintered stone',
      views: 10,
      add_to_cart: 2,
      quote_submitted: 1,
      whatsapp: 3,
      calls: 1,
      view_to_cart: 20,
      cart_to_quote: 50,
    },
  ],
};

describe('ReportFilters', () => {
  it('writes last month into the URL', async () => {
    const user = userEvent.setup();
    render(<ReportFilters />);
    await user.selectOptions(screen.getByLabelText('Filter by period'), 'last_month');
    expect(push).toHaveBeenCalledWith('/reports?period=last_month');
  });

  it('sits on one row, label then select, so it can live in the heading', () => {
    const { container } = render(<ReportFilters />);
    expect(container.firstChild).toHaveClass('flex', 'items-center');
    expect(container.firstChild).not.toHaveClass('grid');
  });

  it('Download is a real file link for the current period', () => {
    render(<ReportFilters />);
    expect(screen.getByRole('link', { name: 'Download sales review PDF' })).toHaveAttribute(
      'href',
      '/reports/pdf',
    );
  });

  it('keeps last month on the PDF link', () => {
    params = new URLSearchParams('period=last_month');
    render(<ReportFilters />);
    expect(screen.getByRole('link', { name: 'Download sales review PDF' })).toHaveAttribute(
      'href',
      '/reports/pdf?period=last_month',
    );
  });

  it('renders on the title row when passed as a heading action', () => {
    const { container } = render(<PageHeading title="Reports" actions={<ReportFilters />} />);
    const row = container.querySelector('h1')?.parentElement;
    expect(row).toContainElement(screen.getByLabelText('Filter by period'));
    expect(row?.className).toContain('justify-between');
    expect(row?.className).toContain('items-center');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ReportFilters />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ReportResults', () => {
  it('keeps invoiced and collected as two figures', () => {
    const { container } = render(<ReportResults leaderboard={leaderboard} conversion={conversion} />);
    expect(screen.getByText('Invoiced')).toBeInTheDocument();
    expect(screen.getByText('Collected')).toBeInTheDocument();
    expect(screen.getAllByText(/100,000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/40,000/)).toBeInTheDocument();
    const grid = container.querySelector('.grid-cols-2');
    expect(grid).not.toBeNull();
    expect(grid?.className).toContain('lg:grid-cols-4');
  });

  it('opens on Sales, with the leaderboard and a won-value chart', () => {
    render(<ReportResults leaderboard={leaderboard} conversion={conversion} />);
    expect(screen.getByRole('tab', { name: 'Sales' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Sam Odhiambo');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Won value');
    expect(screen.getByRole('tabpanel')).not.toHaveTextContent('Calacatta Gold');
  });

  it('switches to Products and writes the view into the URL', async () => {
    const user = userEvent.setup();
    render(<ReportResults leaderboard={leaderboard} conversion={conversion} />);
    await user.click(screen.getByRole('tab', { name: 'Products' }));
    expect(push).toHaveBeenCalledWith('/reports?view=products');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Calacatta Gold');
    expect(screen.getByText('Funnel')).toBeInTheDocument();
  });

  it('empty states belong to the active view, not the whole page', async () => {
    const user = userEvent.setup();
    render(
      <ReportResults
        leaderboard={{ period: 'This month', invoiced: 0, collected: 0, people: [] }}
        conversion={{ period: 'This month', products: [], categories: [] }}
      />,
    );
    expect(screen.getByText('No salesperson figures')).toBeInTheDocument();
    expect(screen.queryByText('No product events')).toBeNull();
    await user.click(screen.getByRole('tab', { name: 'Products' }));
    expect(push).toHaveBeenCalledWith('/reports?view=products');
    expect(screen.getByText('No product events')).toBeVisible();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ReportResults leaderboard={leaderboard} conversion={conversion} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
