import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { LeaderboardPerson } from '@/lib/reports';
import { HomeTeam, rankTeam } from '../home-team';

const person = (over: Partial<LeaderboardPerson>): LeaderboardPerson => ({
  id: 'p',
  full_name: 'Someone',
  raised: 0,
  won: 0,
  lost: 0,
  won_value: 0,
  conversion: null,
  orders: 0,
  order_value: 0,
  invoiced: 0,
  collected: 0,
  ...over,
});

const team = [
  person({ id: 'a', full_name: 'Sam Odhiambo', raised: 9, won: 4, won_value: 420000 }),
  person({ id: 'b', full_name: 'Irene Kariuki', raised: 12, won: 6, won_value: 980000 }),
  person({ id: 'c', full_name: 'Quiet Person', raised: 0, won: 0, won_value: 0 }),
  person({ id: 'd', full_name: 'Tried Hard', raised: 3, won: 0, won_value: 0 }),
];

describe('rankTeam', () => {
  it('ranks by value won, then count, then raised, and leaves out anyone with nothing', () => {
    expect(rankTeam(team).map((row) => row.label)).toEqual(['Irene Kariuki', 'Sam Odhiambo', 'Tried Hard']);
    expect(rankTeam(team)[0]).toEqual({ label: 'Irene Kariuki', value: 980000 });
    expect(rankTeam(team, 2)).toHaveLength(2);
  });
});

describe('HomeTeam', () => {
  it('names the month in raised and won, ranks the team and links to the full report', () => {
    render(<HomeTeam people={team} />);
    expect(screen.getByRole('heading', { name: 'The team this month' })).toBeInTheDocument();
    expect(screen.getByText('24 raised, 10 won, by value won.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Full report' })).toHaveAttribute('href', '/reports');
    // The chart carries a table for a reader who wants the numbers.
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText('Irene Kariuki').length).toBeGreaterThan(0);
  });

  it('says plainly when nothing has been won yet', () => {
    render(<HomeTeam people={[person({ id: 'x' })]} />);
    expect(screen.getByText('No quotes raised yet this month.')).toBeInTheDocument();
    expect(screen.getByText('The first won quote puts a name here.')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<HomeTeam people={team} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
