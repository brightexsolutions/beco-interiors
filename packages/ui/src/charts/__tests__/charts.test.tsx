import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { TrendBars } from '../trend-bars';
import { StageBar } from '../stage-bar';
import { RankedBars } from '../ranked-bars';
import { compactNumber, readChartTheme } from '../chart-theme';

const points = [
  { label: '8 Sep', raised: 6, won: 2 },
  { label: '15 Sep', raised: 9, won: 4 },
  { label: '22 Sep', raised: 4, won: 0 },
];

describe('TrendBars', () => {
  it('names both series in a legend and carries every figure in a table, so identity never rests on colour', () => {
    render(<TrendBars title="Quotes by week" points={points} primary={{ key: 'won', label: 'Won' }} secondary={{ key: 'raised', label: 'Raised' }} />);
    const legend = screen.getByRole('list', { name: 'Series' });
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Raised', 'Won']);
    const table = screen.getByRole('table', { name: 'Quotes by week' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByRole('row', { name: /15 Sep/ })).toHaveTextContent('9');
  });

  it('has no legend for a single series: the title names it', () => {
    render(<TrendBars title="Won" points={points} primary={{ key: 'won', label: 'Won' }} />);
    expect(screen.queryByRole('list', { name: 'Series' })).toBeNull();
  });

  it('is axe clean', async () => {
    const { container } = render(<TrendBars title="Quotes by week" points={points} primary={{ key: 'won', label: 'Won' }} secondary={{ key: 'raised', label: 'Raised' }} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('StageBar', () => {
  const stages = [
    { key: 'new', label: 'New', value: 3, attention: true },
    { key: 'reviewing', label: 'Reviewing', value: 2 },
    { key: 'quoted', label: 'Quoted', value: 5 },
    { key: 'won', label: 'Won', value: 4 },
    { key: 'lost', label: 'Lost', value: 1 },
  ];

  it('lists every stage with its count and the total', () => {
    render(<StageBar title="Pipeline" stages={stages} />);
    expect(screen.getByText('15 in all')).toBeInTheDocument();
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(within(list).getByText('Quoted').closest('li')).toHaveTextContent('5');
  });

  it('says plainly when the pipeline is empty rather than drawing a blank bar', () => {
    render(<StageBar title="Pipeline" stages={stages.map((s) => ({ ...s, value: 0 }))} />);
    expect(screen.getByText('Nothing in the pipeline yet.')).toBeInTheDocument();
  });

  it('is axe clean', async () => {
    const { container } = render(<StageBar title="Pipeline" stages={stages} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('RankedBars', () => {
  it('tables the ranked figures with the value label as the column', () => {
    render(<RankedBars title="Won value" valueLabel="KES" items={[{ label: 'Sam', value: 120000 }, { label: 'Ken', value: 40000 }]} />);
    const table = screen.getByRole('table', { name: 'Won value' });
    expect(within(table).getByRole('columnheader', { name: 'KES' })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /Sam/ })).toHaveTextContent('120k');
  });

  it('says when there is nothing to rank', () => {
    render(<RankedBars title="Won value" valueLabel="KES" items={[]} />);
    expect(screen.getByText('Nothing to rank yet.')).toBeInTheDocument();
  });
});

describe('chart theme helpers', () => {
  it('compacts large numbers the way a label needs', () => {
    expect(compactNumber(850)).toBe('850');
    expect(compactNumber(65000)).toBe('65k');
    expect(compactNumber(1_250_000)).toBe('1.3M');
    expect(compactNumber(2_000_000)).toBe('2M');
  });

  it('falls back to the light palette with no document', () => {
    expect(readChartTheme(null).primary).toBe('#101820');
  });
});
