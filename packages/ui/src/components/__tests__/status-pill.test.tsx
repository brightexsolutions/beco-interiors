import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { StatusPill } from '../status-pill';

describe('StatusPill', () => {
  it('renders the label', () => {
    render(<StatusPill label="Won" />);
    expect(screen.getByText('Won')).toBeInTheDocument();
  });

  it('defaults to the neutral tone', () => {
    render(<StatusPill label="New" />);
    expect(screen.getByText('New').className).toContain('bg-neutral-100');
  });

  it('draws the attention tone from Warm Red, never the functional error token', () => {
    render(<StatusPill label="Awaiting approval" tone="attention" />);
    const el = screen.getByText('Awaiting approval');
    expect(el.className).toContain('warm-red-deep');
    expect(el.className).not.toContain('text-error');
  });

  it('draws the positive tone from the functional success token, not the brand red', () => {
    render(<StatusPill label="Paid" tone="positive" />);
    const el = screen.getByText('Paid');
    expect(el.className).toContain('success');
    expect(el.className).not.toContain('warm-red');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StatusPill label="Reviewing" tone="muted" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
