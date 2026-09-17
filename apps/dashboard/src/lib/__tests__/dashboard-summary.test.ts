import { describe, expect, it } from 'vitest';
import {
  EMPTY_SUMMARY,
  fetchDashboardSummary,
  humanAge,
  toStatCards,
  type DashboardSummary,
} from '../dashboard-summary';

const summary = (over: Partial<DashboardSummary> = {}): DashboardSummary => ({
  ...EMPTY_SUMMARY,
  ...over,
});

const card = (s: DashboardSummary, label: string) => {
  const found = toStatCards(s).find((c) => c.label === label);
  if (!found) throw new Error(`No card labelled ${label}`);
  return found;
};

describe('humanAge', () => {
  it('says minutes below the hour, because 0.7 hours is not a thing anyone says', () => {
    expect(humanAge(0.5)).toBe('30 minutes');
  });

  it('never rounds down to zero minutes, so a brand new quote still reads as waited', () => {
    expect(humanAge(0.001)).toBe('1 minute');
  });

  it('singularises', () => {
    expect(humanAge(1)).toBe('1 hour');
    expect(humanAge(1 / 60)).toBe('1 minute');
  });

  it('rounds to whole hours above an hour', () => {
    expect(humanAge(9.4)).toBe('9 hours');
  });
});

describe('toStatCards: the attention tone', () => {
  it('spends Warm Red only when the oldest quote is past the SLA', () => {
    const c = card(summary({ awaiting: { count: 3, oldest_hours: 9, sla_hours: 2 } }), 'Awaiting a response');
    expect(c.tone).toBe('attention');
    expect(c.implication).toMatch(/past the 2 hours target/i);
  });

  it('stays plain while inside the SLA, however many are waiting', () => {
    // The count alone must not turn the card red. A busy morning inside the
    // target is not a problem, and a card that is always red is ignored.
    const c = card(summary({ awaiting: { count: 12, oldest_hours: 1, sla_hours: 2 } }), 'Awaiting a response');
    expect(c.tone).toBe('plain');
    expect(c.implication).toBeUndefined();
  });

  it('stays plain when nothing is waiting, even with a zero SLA', () => {
    const c = card(summary({ awaiting: { count: 0, oldest_hours: 0, sla_hours: 0 } }), 'Awaiting a response');
    expect(c.tone).toBe('plain');
    expect(c.comparison).toBe('Nothing waiting');
  });

  it('reads the SLA from the data, not from a constant in the card', () => {
    const c = card(summary({ awaiting: { count: 1, oldest_hours: 5, sla_hours: 8 } }), 'Awaiting a response');
    expect(c.tone).toBe('plain');
  });
});

describe('toStatCards: comparisons', () => {
  it('states last month rather than dividing by zero', () => {
    const c = card(summary({ won: { count: 4, value: 10, prev_count: 0, prev_value: 0 } }), 'Won this month');
    expect(c.comparison).toBe('None last month');
    expect(c.comparison).not.toContain('Infinity');
    expect(c.comparison).not.toContain('NaN');
  });

  it('singularises a single quote last month', () => {
    const c = card(summary({ won: { count: 2, value: 0, prev_count: 1, prev_value: 5 } }), 'Won this month');
    expect(c.comparison).toBe('vs 1 quote last month');
  });

  it('says no conversion rate rather than 0% when nothing was decided', () => {
    const c = card(summary(), 'Quote to won');
    // A dash, not a sentence: the value slot is display size and holds a
    // figure. The explanation goes in the line beneath it.
    expect(c.value).toBe('—');
    expect(c.value).not.toContain('0%');
    expect(c.implication).toBe('Nothing won or lost yet this month');
  });

  it('shows the rate when there were decisions', () => {
    const c = card(summary({ conversion: { rate: 67, prev_rate: 50, decided: 3 } }), 'Quote to won');
    expect(c.value).toBe('67%');
    expect(c.comparison).toBe('vs 50% last month');
    expect(c.implication).toBe('3 quotes decided');
  });
});

describe('toStatCards: money kept honest', () => {
  it('keeps invoiced and collected separate, and names the gap', () => {
    const c = card(summary({ sales: { invoiced: 400000, collected: 150000, orders: 2 } }), 'Invoiced this month');
    expect(c.value).toContain('400,000');
    expect(c.comparison).toContain('150,000');
    expect(c.implication).toContain('250,000');
  });

  it('claims nothing is owed when everything billed was collected', () => {
    const c = card(summary({ sales: { invoiced: 90000, collected: 90000, orders: 1 } }), 'Invoiced this month');
    expect(c.implication).toBeUndefined();
  });
});

describe('toStatCards: shape', () => {
  it('returns the six cards in reading order', () => {
    expect(toStatCards(summary()).map((c) => c.label)).toEqual([
      'Awaiting a response',
      'Won this month',
      'Quote to won',
      'Invoiced this month',
      'Products live',
      'Leads today',
    ]);
  });

  it('spends at most one Warm Red card, per the page budget', () => {
    const everythingBad = summary({
      awaiting: { count: 9, oldest_hours: 40, sla_hours: 2 },
      sales: { invoiced: 1, collected: 0, orders: 1 },
      catalogue: { published: 1, unavailable: 5, poa: 2, draft: 3 },
    });
    expect(toStatCards(everythingBad).filter((c) => c.tone === 'attention')).toHaveLength(1);
  });
});

describe('fetchDashboardSummary', () => {
  const client = (result: { data: unknown; error: { message: string } | null }) =>
    ({ rpc: async () => result }) as unknown as Parameters<typeof fetchDashboardSummary>[0];

  it('returns the summary the function produced', async () => {
    const payload = summary({ won: { count: 3, value: 1, prev_count: 1, prev_value: 1 } });
    expect(await fetchDashboardSummary(client({ data: payload, error: null }))).toEqual(payload);
  });

  it('falls back to zeros rather than crashing the home screen on a null', async () => {
    expect(await fetchDashboardSummary(client({ data: null, error: null }))).toEqual(EMPTY_SUMMARY);
  });

  it('throws with the cause when the query fails, so it is not silently zero', async () => {
    await expect(
      fetchDashboardSummary(client({ data: null, error: { message: 'permission denied' } })),
    ).rejects.toThrow(/permission denied/);
  });
});
