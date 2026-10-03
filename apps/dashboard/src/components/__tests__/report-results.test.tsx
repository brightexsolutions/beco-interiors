import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

afterEach(() => {
  vi.unstubAllGlobals();
});

const SAM = 'd5c0ffee-0000-4000-8000-000000000002';

const leaderboard: LeaderboardReport = {
  period: 'This month',
  invoiced: 100000,
  collected: 40000,
  people: [
    {
      id: SAM,
      full_name: 'Sam Odhiambo',
      raised: 4,
      won: 2,
      lost: 1,
      won_value: 80000,
      conversion: 66.7,
      orders: 1,
      order_value: 40000,
      invoiced: 40000,
      collected: 20000,
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

  it('Custom writes start and end dates into the URL', async () => {
    const user = userEvent.setup();
    render(<ReportFilters />);
    expect(screen.queryByLabelText('Start date')).toBeNull();
    await user.selectOptions(screen.getByLabelText('Filter by period'), 'custom');
    const href = String(push.mock.calls[0]?.[0]);
    expect(href).toMatch(/^\/reports\?period=custom&from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/);
  });

  it('changing a custom date rewrites from and to', () => {
    params = new URLSearchParams('period=custom&from=2026-09-01&to=2026-09-18');
    render(<ReportFilters />);
    expect(screen.getByLabelText('Start date')).toHaveValue('2026-09-01');
    expect(screen.getByLabelText('End date')).toHaveValue('2026-09-18');
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-09-10' } });
    expect(push).toHaveBeenCalledWith('/reports?period=custom&from=2026-09-10&to=2026-09-18');
  });

  it('leaving Custom drops the dates from the URL', async () => {
    params = new URLSearchParams('period=custom&from=2026-09-01&to=2026-09-18');
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

  it('View opens the document first, and Download is a real file link', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), { status: 200 })),
    );
    const user = userEvent.setup();
    render(<ReportFilters />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'View sales review PDF' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Overall sales review, This month');
    expect(
      await screen.findByRole('img', { name: 'Overall sales review, This month PDF, page 1 of 1' }),
    ).toBeInTheDocument();
    expect(screen.queryByTitle('Overall sales review, This month PDF')).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      '/reports/pdf',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }),
    );
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', '/reports/pdf?download=1');
    expect(screen.getByLabelText('Review overall or one salesperson')).toHaveValue('');
  });

  it('an individual review fetches that salesperson and names them on the dialog', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), { status: 200 })),
    );
    const user = userEvent.setup();
    render(<ReportFilters people={[{ id: SAM, name: 'Sam Odhiambo' }]} />);
    await user.click(screen.getByRole('button', { name: 'View sales review PDF' }));
    await user.selectOptions(screen.getByLabelText('Review overall or one salesperson'), SAM);
    expect(push).toHaveBeenCalledWith(`/reports?person=${SAM}`);
  });

  it('keeps last month on the preview fetch and the download link', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), { status: 200 })),
    );
    params = new URLSearchParams('period=last_month');
    const user = userEvent.setup();
    render(<ReportFilters />);
    await user.click(screen.getByRole('button', { name: 'View sales review PDF' }));
    expect(fetch).toHaveBeenCalledWith(
      '/reports/pdf?period=last_month',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }),
    );
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      '/reports/pdf?period=last_month&download=1',
    );
  });

  it('keeps custom dates on the preview fetch and the download link', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), { status: 200 })),
    );
    params = new URLSearchParams('period=custom&from=2026-09-01&to=2026-09-18');
    const user = userEvent.setup();
    render(<ReportFilters />);
    await user.click(screen.getByRole('button', { name: 'View sales review PDF' }));
    expect(fetch).toHaveBeenCalledWith(
      '/reports/pdf?period=custom&from=2026-09-01&to=2026-09-18',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }),
    );
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      '/reports/pdf?period=custom&from=2026-09-01&to=2026-09-18&download=1',
    );
    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      'Overall sales review, 1 Sep 2026 to 18 Sep 2026',
    );
  });

  it('opens an individual review from the URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), { status: 200 })),
    );
    params = new URLSearchParams(`person=${SAM}`);
    const user = userEvent.setup();
    render(<ReportFilters people={[{ id: SAM, name: 'Sam Odhiambo' }]} />);
    await user.click(screen.getByRole('button', { name: 'View sales review PDF' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Salesperson review, Sam Odhiambo, This month');
    expect(fetch).toHaveBeenCalledWith(
      `/reports/pdf?person=${SAM}`,
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }),
    );
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      `/reports/pdf?person=${SAM}&download=1`,
    );
  });

  it('shows the error when the PDF cannot be opened, rather than a blank frame', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Could not render the PDF', { status: 500 })));
    const user = userEvent.setup();
    render(<ReportFilters />);
    await user.click(screen.getByRole('button', { name: 'View sales review PDF' }));
    expect(await screen.findByText(/could not render the pdf/i)).toBeInTheDocument();
    expect(screen.queryByTitle('Overall sales review, This month PDF')).toBeNull();
  });

  it('renders on the title row when passed as a heading action', () => {
    const { container } = render(<PageHeading title="Reports" actions={<ReportFilters />} />);
    const row = container.querySelector('h1')?.parentElement;
    expect(row).toContainElement(screen.getByLabelText('Filter by period'));
    expect(row?.className).toContain('sm:grid-cols-[minmax(0,1fr)_auto]');
    expect(row?.className).toContain('sm:items-center');
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
    expect(screen.getAllByText('Funnel').length).toBeGreaterThan(0);
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
