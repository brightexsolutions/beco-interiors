import { describe, expect, it } from 'vitest';
import {
  hasActivity,
  toActivityWeek,
  toMoneyPoints,
  toQuotePoints,
  toStages,
  weekLabel,
  type ActivityWeek,
} from '../activity';

const week = (over: Partial<ActivityWeek> = {}): ActivityWeek => ({
  weekStart: '2026-09-28',
  raised: 0,
  won: 0,
  lost: 0,
  wonValue: 0,
  invoiced: 0,
  collected: 0,
  ...over,
});

describe('activity mapping', () => {
  it('reads a row from Postgres, numerics arriving as strings included', () => {
    expect(toActivityWeek({ week_start: '2026-09-28', raised: 6, won: '2', lost: null, won_value: '120000.00', invoiced: 'x', collected: 5000 })).toEqual({
      weekStart: '2026-09-28', raised: 6, won: 2, lost: 0, wonValue: 120000, invoiced: 0, collected: 5000,
    });
  });

  it('labels a week by the Monday it starts, as a reader says it', () => {
    expect(weekLabel('2026-09-28')).toBe('28 Sep');
    expect(weekLabel('2026-10-05')).toBe('5 Oct');
    expect(weekLabel('bad')).toBe('bad');
  });

  it('builds the quote points with raised beside won', () => {
    expect(toQuotePoints([week({ raised: 6, won: 2 })])).toEqual([{ label: '28 Sep', raised: 6, won: 2 }]);
  });

  it('builds the money points in whole shillings', () => {
    expect(toMoneyPoints([week({ invoiced: 12345.6, collected: 100 })])).toEqual([{ label: '28 Sep', invoiced: 12346, collected: 100 }]);
  });

  it('orders the stages first to last and marks New for attention only when the target is breached', () => {
    const calm = toStages({ new: 3, reviewing: 1, quoted: 2, won: 4, lost: 1 }, false);
    expect(calm.map((s) => s.key)).toEqual(['new', 'reviewing', 'quoted', 'won', 'lost']);
    expect(calm[0]!.attention).toBe(false);
    expect(toStages({ new: 3, reviewing: 0, quoted: 0, won: 0, lost: 0 }, true)[0]!.attention).toBe(true);
    expect(toStages({ new: 0, reviewing: 0, quoted: 0, won: 0, lost: 0 }, true)[0]!.attention).toBe(false);
  });

  it('knows an empty run from a quiet one', () => {
    expect(hasActivity([week(), week()])).toBe(false);
    expect(hasActivity([week(), week({ collected: 1 })])).toBe(true);
  });
});
