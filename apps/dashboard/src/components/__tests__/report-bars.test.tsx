import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportBars } from '../report-bars';

describe('ReportBars', () => {
  it('names each row and sizes the leader as charcoal', () => {
    const { container } = render(
      <ReportBars
        caption="Won value"
        items={[
          { label: 'Sam Odhiambo', value: 80 },
          { label: 'Ken Mutiso', value: 20 },
        ]}
      />,
    );
    expect(screen.getByText('Won value')).toBeInTheDocument();
    expect(screen.getByText('Sam Odhiambo')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    const fills = container.querySelectorAll('[aria-hidden] > div');
    expect(fills[0]?.className).toContain('bg-charcoal');
    expect(fills[1]?.className).toContain('bg-neutral-400');
    expect(fills[0]).toHaveStyle({ width: '100%' });
    expect(fills[1]).toHaveStyle({ width: '25%' });
  });

  it('formats values when given a formatter', () => {
    render(
      <ReportBars
        caption="Won value"
        items={[{ label: 'Sam Odhiambo', value: 80000 }]}
        format={(n) => `Ksh ${n}`}
      />,
    );
    expect(screen.getByText('Ksh 80000')).toBeInTheDocument();
  });
});
