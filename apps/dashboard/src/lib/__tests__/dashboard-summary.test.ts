import { describe, expect, it } from 'vitest';
import {
  EMPTY_SUMMARY,
  fetchDashboardSummary,
  humanAge,
  toFocus,
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

describe('toFocus: the attention tone', () => {
  it('spends Warm Red only when the oldest quote is past the SLA', () => {
    const f = toFocus(summary({ awaiting: { count: 3, oldest_hours: 9, sla_hours: 2 } }));
    expect(f.breached).toBe(true);
    expect(f.slaLine).toMatch(/past the 2 hours target/i);
    expect(f.waitingLine).toBe('Oldest has waited 9 hours');
  });

  it('stays calm while inside the SLA, however many are waiting', () => {
    const f = toFocus(summary({ awaiting: { count: 12, oldest_hours: 1, sla_hours: 2 } }));
    expect(f.breached).toBe(false);
    expect(f.slaLine).toBe('Target: answer within 2 hours');
  });

  it('says nothing is waiting, even with a zero SLA', () => {
    const f = toFocus(summary({ awaiting: { count: 0, oldest_hours: 0, sla_hours: 0 } }));
    expect(f.breached).toBe(false);
    expect(f.waitingLine).toBe('Nothing waiting');
  });

  it('reads the SLA from the data, not from a constant', () => {
    expect(toFocus(summary({ awaiting: { count: 1, oldest_hours: 5, sla_hours: 8 } })).breached).toBe(false);
  });

  it('names what is owed and what is low, and never a negative debt', () => {
    const f = toFocus(
      summary({
        sales: { invoiced: 400000, collected: 150000, orders: 2 },
        catalogue: { published: 20, unavailable: 0, poa: 0, draft: 2, low_stock: 3 },
      }),
    );
    expect(f.owed).toBe(250000);
    expect(f.owedLabel).toContain('250,000');
    expect(f.lowStock).toBe(3);
    expect(f.drafts).toBe(2);
    expect(toFocus(summary({ sales: { invoiced: 10, collected: 50, orders: 1 } })).owedLabel).toBeNull();
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
    expect(c.value).toBe('None');
    expect(c.meter).toBeUndefined();
    expect(c.value).not.toContain('0%');
    expect(c.implication).toBe('Nothing won or lost yet this month');
  });

  it('shows the rate when there were decisions', () => {
    const c = card(summary({ conversion: { rate: 67, prev_rate: 50, decided: 3 } }), 'Quote to won');
    expect(c.value).toBe('67%');
    expect(c.comparison).toBe('vs 50% last month');
    expect(c.meter).toEqual({ value: 0.67, label: '3 quotes decided' });
    expect(c.delta).toEqual({ direction: 'up', label: '+17 pts', sentiment: 'good' });
  });
});

describe('toStatCards: money kept honest', () => {
  it('keeps invoiced and collected separate, and names the gap', () => {
    const c = card(summary({ sales: { invoiced: 400000, collected: 150000, orders: 2 } }), 'Invoiced this month');
    expect(c.value).toContain('400,000');
    expect(c.meter?.label).toContain('150,000');
    expect(c.meter?.value).toBeCloseTo(0.375);
    expect(c.implication).toContain('250,000');
  });

  it('claims nothing is owed when everything billed was collected', () => {
    const c = card(summary({ sales: { invoiced: 90000, collected: 90000, orders: 1 } }), 'Invoiced this month');
    expect(c.implication).toBeUndefined();
  });
});

describe('toStatCards: shape', () => {
  it('returns the five month tiles in reading order, each linked to its screen', () => {
    const cards = toStatCards(summary());
    expect(cards.map((c) => c.label)).toEqual([
      'Won this month',
      'Quote to won',
      'Invoiced this month',
      'Leads today',
      'Products live',
    ]);
    expect(cards.map((c) => c.href)).toEqual([
      '/quotes?owner=all&status=won',
      '/reports',
      '/orders?payment=unpaid',
      '/reports',
      '/products',
    ]);
  });

  it('never spends Warm Red on a month tile, since the focus panel owns it', () => {
    const everythingBad = summary({
      awaiting: { count: 9, oldest_hours: 40, sla_hours: 2 },
      sales: { invoiced: 1, collected: 0, orders: 1 },
      catalogue: { published: 1, unavailable: 5, poa: 2, draft: 3, low_stock: 4 },
    });
    expect(toStatCards(everythingBad).filter((c) => c.tone === 'attention')).toHaveLength(0);
  });

  it('shows a trend against last month, and none when both months are empty', () => {
    expect(card(summary({ won: { count: 2, value: 0, prev_count: 5, prev_value: 0 } }), 'Won this month').delta).toEqual({
      direction: 'down',
      label: '-3',
      sentiment: 'bad',
    });
    expect(card(summary(), 'Won this month').delta).toBeUndefined();
    expect(card(summary({ won: { count: 3, value: 0, prev_count: 3, prev_value: 0 } }), 'Won this month').delta?.direction).toBe('flat');
  });

  it('splits leads by where they came from', () => {
    const c = card(summary({ leads: { submissions: 2, whatsapp: 3, calls: 1, total: 6 } }), 'Leads today');
    expect(c.segments).toEqual([
      { label: 'quoted', value: 2 },
      { label: 'WhatsApp', value: 3 },
      { label: 'called', value: 1 },
    ]);
    expect(c.implication).toBe('4 left the site to reach you');
  });

  it('names low stock on the catalogue card without spending Warm Red on it', () => {
    const c = card(summary({ catalogue: { published: 24, unavailable: 0, poa: 2, draft: 1, low_stock: 3 } }), 'Products live');
    expect(c.tone).toBe('plain');
    expect(c.implication).toMatch(/3 at or below the low-stock mark/);
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
