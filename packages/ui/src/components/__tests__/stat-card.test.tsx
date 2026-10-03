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

  it('the inverse tone is charcoal, so a featured figure does not spend Warm Red', () => {
    const { container } = render(<StatCard label="In this view" value="5" tone="inverse" />);
    expect(container.firstElementChild?.className).toContain('bg-charcoal');
    expect(screen.getByText('5').className).toContain('text-high-vis-white');
    expect(screen.getByText('5').className).not.toContain('warm-red');
  });

  it('compact is shorter: smaller value and padding', () => {
    const { container } = render(<StatCard label="Won" value="1" comparison="of 3 raised" size="compact" />);
    expect(container.firstElementChild?.className).toContain('p-2.5');
    expect(screen.getByText('1').className).toContain('text-lg');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <StatCard label="Invoiced" value="KES 480,000" comparison="Collected: KES 210,000" tone="plain" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('StatCard visuals and link', () => {
  it('shows a trend chip with its direction and label', () => {
    const { container } = render(
      <StatCard label="Won" value="5" delta={{ direction: 'up', label: '+2', sentiment: 'good' }} />,
    );
    const chip = screen.getByText('+2');
    expect(chip.className).toContain('text-success');
    expect(container.querySelector('path[d="M6 15l6-6 6 6"]')).not.toBeNull();
  });

  it('renders a meter clamped to 0 to 100 and named for assistive tech', () => {
    render(<StatCard label="Quote to won" value="140%" meter={{ value: 1.4, label: '5 decided' }} />);
    const meter = screen.getByRole('meter', { name: '5 decided' });
    expect(meter).toHaveAttribute('aria-valuenow', '100');
    expect((meter.firstElementChild as HTMLElement).style.width).toBe('100%');
  });

  it('splits segments in proportion and lists each with its count', () => {
    const { container } = render(
      <StatCard
        label="Leads"
        value="4"
        segments={[
          { label: 'quoted', value: 1 },
          { label: 'WhatsApp', value: 3 },
          { label: 'called', value: 0 },
        ]}
      />,
    );
    const bars = container.querySelectorAll<HTMLElement>('[aria-hidden] > div');
    expect([...bars].map((b) => b.style.width)).toEqual(['25%', '75%']);
    expect(screen.getByText('WhatsApp').parentElement).toHaveTextContent('3 WhatsApp');
    expect(screen.getByText('called').parentElement).toHaveTextContent('0 called');
  });

  it('draws an empty track rather than dividing by zero when every segment is zero', () => {
    const { container } = render(
      <StatCard label="Leads" value="0" segments={[{ label: 'quoted', value: 0 }]} />,
    );
    expect(container.querySelectorAll('[aria-hidden] > div')).toHaveLength(0);
  });

  it('stretches the supplied link over the card, as the only interactive element', () => {
    render(<StatCard label="Won" value="5" action={<a href="/quotes?status=won">Won quotes</a>} />);
    const link = screen.getByRole('link', { name: 'Won quotes' });
    expect(link).toHaveAttribute('href', '/quotes?status=won');
    expect(link.parentElement?.className).toContain('[&_a]:after:absolute');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('is axe clean with every visual at once', async () => {
    const { container } = render(
      <StatCard
        label="Invoiced"
        value="KES 400,000"
        delta={{ direction: 'down', label: '-1', sentiment: 'bad' }}
        meter={{ value: 0.4, label: 'KES 160,000 collected' }}
        action={<a href="/orders">Unpaid orders</a>}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
