import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { StatCard } from '../stat-card';

describe('StatCard', () => {
  it('states the value, the comparison and the implication, never just a number', () => {
    render(
      <StatCard
        label="Quotes awaiting response"
        value="12"
        comparison="vs 8 last month"
        implication="4 are over the 2h SLA"
      />,
    );
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('vs 8 last month')).toBeInTheDocument();
    expect(screen.getByText('4 are over the 2h SLA')).toBeInTheDocument();
  });

  it('is plain by default, no colour', () => {
    render(<StatCard label="Won this month" value="6" />);
    expect(screen.getByText('6').className).toContain('text-charcoal');
  });

  it('the attention tone is Warm Red, reserved for a figure that needs action', () => {
    render(<StatCard label="Low or out of stock" value="3" tone="attention" />);
    expect(screen.getByText('3').className).toContain('warm-red-deep');
  });

  it('the positive tone uses the functional success token, not the brand red', () => {
    render(<StatCard label="Conversion" value="34%" tone="positive" />);
    const value = screen.getByText('34%');
    expect(value.className).toContain('success');
    expect(value.className).not.toContain('warm-red');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <StatCard label="Invoiced" value="KES 480,000" comparison="Collected: KES 210,000" tone="plain" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
