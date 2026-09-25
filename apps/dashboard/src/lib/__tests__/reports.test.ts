import { describe, expect, it, vi } from 'vitest';
import {
  fetchLeaderboard,
  formatYmd,
  funnelTotals,
  invalidCustomRange,
  parsePersonId,
  parseReportQuery,
  parseView,
  periodDisplayLabel,
  reportFigures,
} from '../reports';

describe('parsePersonId', () => {
  it('empty is the team review', () => {
    expect(parsePersonId(undefined)).toEqual({ ok: true, id: null });
    expect(parsePersonId('')).toEqual({ ok: true, id: null });
  });

  it('accepts a salesperson id', () => {
    expect(parsePersonId('D5C0FFEE-0000-4000-8000-000000000002')).toEqual({
      ok: true,
      id: 'd5c0ffee-0000-4000-8000-000000000002',
    });
  });

  it('refuses a value that is not an id', () => {
    expect(parsePersonId('sam')).toEqual({ ok: false });
  });
});

describe('parseReportQuery', () => {
  it('treats an unknown period as this month', () => {
    expect(parseReportQuery(undefined)).toEqual({ period: 'this_month', from: null, to: null });
    expect(parseReportQuery('last_month')).toEqual({ period: 'last_month', from: null, to: null });
  });

  it('keeps custom dates when they are a valid range', () => {
    expect(parseReportQuery('custom', '2026-09-01', '2026-09-18')).toEqual({
      period: 'custom',
      from: '2026-09-01',
      to: '2026-09-18',
    });
  });

  it('falls back when the custom dates are inverted', () => {
    expect(parseReportQuery('custom', '2026-09-18', '2026-09-01')).toEqual({
      period: 'this_month',
      from: null,
      to: null,
    });
    expect(invalidCustomRange('custom', '2026-09-18', '2026-09-01')).toBe(true);
    expect(invalidCustomRange('custom')).toBe(false);
  });
});

describe('periodDisplayLabel', () => {
  it('prints a custom range as start to end', () => {
    expect(formatYmd('2026-09-01')).toBe('1 Sep 2026');
    expect(periodDisplayLabel('custom', '2026-09-01', '2026-09-18')).toBe('1 Sep 2026 to 18 Sep 2026');
    expect(periodDisplayLabel('custom', '2026-09-18', '2026-09-18')).toBe('18 Sep 2026');
    expect(periodDisplayLabel('last_month')).toBe('Last month');
  });
});

describe('fetchLeaderboard', () => {
  it('passes custom dates to the RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    await fetchLeaderboard({ rpc } as never, {
      period: 'custom',
      from: '2026-09-01',
      to: '2026-09-18',
    });
    expect(rpc).toHaveBeenCalledWith('salesperson_leaderboard', {
      p_period: 'custom',
      p_from: '2026-09-01',
      p_to: '2026-09-18',
    });
  });
});

describe('parseView', () => {
  it('defaults to sales', () => {
    expect(parseView(undefined)).toBe('sales');
    expect(parseView('nope')).toBe('sales');
  });

  it('accepts products and categories', () => {
    expect(parseView('products')).toBe('products');
    expect(parseView('categories')).toBe('categories');
  });
});

describe('reportFigures', () => {
  it('is silent on conversion when nothing was raised', () => {
    expect(
      reportFigures({ period: 'This month', invoiced: 0, collected: 0, people: [] }),
    ).toEqual({ raised: 0, won: 0, conversion: null });
  });

  it('counts won of raised across the team', () => {
    expect(
      reportFigures({
        period: 'This month',
        invoiced: 1,
        collected: 1,
        people: [
          {
            id: 'a',
            full_name: 'A',
            raised: 4,
            won: 2,
            lost: 1,
            won_value: 8,
            conversion: 50,
            orders: 1,
            order_value: 8,
            invoiced: 1,
            collected: 1,
          },
        ],
      }),
    ).toEqual({ raised: 4, won: 2, conversion: 50 });
  });
});

describe('funnelTotals', () => {
  it('adds the funnel steps', () => {
    expect(
      funnelTotals([
        {
          id: '1',
          name: 'A',
          views: 10,
          add_to_cart: 2,
          quote_submitted: 1,
          whatsapp: 0,
          calls: 0,
          view_to_cart: 20,
          cart_to_quote: 50,
        },
        {
          id: '2',
          name: 'B',
          views: 5,
          add_to_cart: 1,
          quote_submitted: 0,
          whatsapp: 0,
          calls: 0,
          view_to_cart: 20,
          cart_to_quote: null,
        },
      ]),
    ).toEqual({ views: 15, add_to_cart: 3, quote_submitted: 1 });
  });
});
