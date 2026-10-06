import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { HomeActivity } from '../home-activity';
import { ReportCharts } from '../report-charts';

const points = [
  { label: '21 Sep', raised: 5, won: 1 },
  { label: '28 Sep', raised: 8, won: 3 },
];
const stages = [
  { key: 'new', label: 'New', value: 2, attention: true },
  { key: 'reviewing', label: 'Reviewing', value: 1 },
  { key: 'quoted', label: 'Quoted', value: 3 },
  { key: 'won', label: 'Won this month', value: 4 },
  { key: 'lost', label: 'Lost this month', value: 0 },
];

describe('HomeActivity', () => {
  it('draws the weekly chart with both series named and the pipeline with its stages, each linking onward', () => {
    render(<HomeActivity points={points} stages={stages} quiet={false} />);
    expect(screen.getByRole('table', { name: 'Quotes by week' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Series' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Raised', 'Won']);
    expect(screen.getByText('10 in all')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/reports');
    expect(screen.getByRole('link', { name: 'Open the list' })).toHaveAttribute('href', '/quotes?owner=all');
  });

  it('says so instead of drawing eight empty bars when the weeks are quiet', () => {
    render(<HomeActivity points={points.map((p) => ({ ...p, raised: 0, won: 0 }))} stages={stages} quiet />);
    expect(screen.getByText(/No quotes in the last eight weeks/)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Quotes by week' })).toBeNull();
  });

  it('is axe clean', async () => {
    const { container } = render(<HomeActivity points={points} stages={stages} quiet={false} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ReportCharts', () => {
  it('tables invoiced beside collected in shillings', () => {
    render(<ReportCharts points={[{ label: '28 Sep', invoiced: 120000, collected: 80000 }]} quiet={false} />);
    const table = screen.getByRole('table', { name: 'Money by week' });
    // The currency symbol differs by runtime (KES or KSh); the figure does not.
    expect(within(table).getByRole('row', { name: /28 Sep/ })).toHaveTextContent(/120,000/);
    expect(within(table).getByRole('row', { name: /28 Sep/ })).toHaveTextContent(/80,000/);
  });

  it('says when there are no orders yet', () => {
    render(<ReportCharts points={[]} quiet />);
    expect(screen.getByText(/No orders in the last eight weeks/)).toBeInTheDocument();
  });
});
