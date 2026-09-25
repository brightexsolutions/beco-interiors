import { describe, expect, it } from 'vitest';
import { reportRangeSchema } from '../dashboard-report';

describe('reportRangeSchema', () => {
  it('accepts this month and last month without dates', () => {
    expect(reportRangeSchema.safeParse({ period: 'this_month' }).success).toBe(true);
    expect(reportRangeSchema.safeParse({ period: 'last_month' }).success).toBe(true);
  });

  it('needs both dates on a custom range', () => {
    expect(reportRangeSchema.safeParse({ period: 'custom' }).success).toBe(false);
    expect(
      reportRangeSchema.safeParse({ period: 'custom', from: '2026-09-01', to: '2026-09-18' }).success,
    ).toBe(true);
  });

  it('refuses an inverted range and a span longer than a year', () => {
    expect(
      reportRangeSchema.safeParse({ period: 'custom', from: '2026-09-18', to: '2026-09-01' }).success,
    ).toBe(false);
    expect(
      reportRangeSchema.safeParse({ period: 'custom', from: '2025-01-01', to: '2026-01-02' }).success,
    ).toBe(false);
    expect(
      reportRangeSchema.safeParse({ period: 'custom', from: '2024-01-01', to: '2024-12-31' }).success,
    ).toBe(true);
  });
});
