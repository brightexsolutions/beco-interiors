import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { HomeFocus } from '../home-focus';
import type { HomeFocus as Focus } from '@/lib/dashboard-summary';

const base: Focus = {
  waiting: 3,
  waitingLine: 'Oldest has waited 9 hours',
  breached: true,
  slaLine: 'Past the 2 hours target. Answer the oldest first.',
  owed: 250000,
  owedLabel: 'KES 250,000',
  lowStock: 2,
  drafts: 0,
};

describe('HomeFocus', () => {
  it('leads with the waiting count, flags a breach, and links to the queue and a new quote', () => {
    render(<HomeFocus focus={base} approvals={1} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Past target')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open queue/i })).toHaveAttribute('href', '/quotes?owner=unassigned');
    expect(screen.getByRole('link', { name: 'New quote' })).toHaveAttribute('href', '/quotes/new');
  });

  it('says On time rather than Past target inside the SLA', () => {
    render(<HomeFocus focus={{ ...base, breached: false }} approvals={0} />);
    expect(screen.queryByText('Past target')).toBeNull();
    expect(screen.getByText('On time')).toBeInTheDocument();
  });

  it('lists only the rows with something to do, each linked to the list that clears it', () => {
    render(<HomeFocus focus={base} approvals={1} />);
    const plate = screen.getByRole('list');
    const links = within(plate).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/quotes?owner=all&approval=pending',
      '/orders?payment=unpaid',
      '/products?stock=low',
    ]);
    expect(within(plate).queryByText('Unpublished products')).toBeNull();
  });

  it('says nothing else needs you when every row is empty', () => {
    render(<HomeFocus focus={{ ...base, owedLabel: null, owed: 0, lowStock: 0 }} approvals={0} />);
    expect(screen.getByText('Nothing else needs you today.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('is axe clean', async () => {
    const { container } = render(<HomeFocus focus={base} approvals={2} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
