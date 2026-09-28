import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { RecentQuotes, ageLabel } from '../recent-quotes';
import type { QuoteListItem } from '@/lib/quotes';

const quote = (over: Partial<QuoteListItem> = {}): QuoteListItem => ({
  id: 'q1',
  referenceNumber: 'BEC-Q-00042',
  customerName: 'Achieng Otieno',
  customerPhone: '0722333730',
  status: 'new',
  source: 'web',
  createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
  validUntil: null,
  requiresApproval: false,
  approvedAt: null,
  assignedTo: null,
  assignedToName: null,
  createdBy: null,
  createdByName: null,
  value: 95000,
  isPriced: true,
  itemCount: 1,
  ...over,
});

describe('ageLabel', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');
  it('reads minutes, hours and days, never zero minutes', () => {
    expect(ageLabel('2026-09-28T11:59:50Z', now)).toBe('1 min ago');
    expect(ageLabel('2026-09-28T11:20:00Z', now)).toBe('40 min ago');
    expect(ageLabel('2026-09-28T09:00:00Z', now)).toBe('3 h ago');
    expect(ageLabel('2026-09-25T12:00:00Z', now)).toBe('3 d ago');
  });
});

describe('RecentQuotes', () => {
  it('links each row to its quote, with status and value', () => {
    render(<RecentQuotes quotes={[quote(), quote({ id: 'q2', referenceNumber: 'BEC-Q-00043', isPriced: false, status: 'quoted' })]} />);
    expect(screen.getAllByRole('link', { name: /Achieng Otieno/ })[0]).toHaveAttribute('href', '/quotes/BEC-Q-00042');
    expect(screen.getAllByText('New')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Quoted')[0]).toBeInTheDocument();
    expect(screen.getAllByText('POA').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'All quotes' })).toHaveAttribute('href', '/quotes?owner=all');
  });

  it('has a designed empty state', () => {
    render(<RecentQuotes quotes={[]} />);
    expect(screen.getByText(/no quotes yet/i)).toBeInTheDocument();
  });

  it('is axe clean', async () => {
    const { container } = render(<RecentQuotes quotes={[quote()]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
