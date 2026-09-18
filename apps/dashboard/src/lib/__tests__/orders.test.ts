import { describe, expect, it } from 'vitest';
import { orderMilestones } from '../orders';
import { orderMutationMessage } from '../order-errors';
import { parsePeriod, rateLabel } from '../reports';

describe('orderMilestones', () => {
  it('lists only the stamps that exist, with Raised first', () => {
    const rows = orderMilestones({
      createdAt: '2026-09-18T07:00:00.000Z',
      confirmedAt: '2026-09-18T08:00:00.000Z',
      paidAt: null,
      fulfilledAt: null,
      cancelledAt: null,
    });
    expect(rows.map((row) => row.label)).toEqual(['Raised', 'Confirmed']);
  });
});

describe('orderMutationMessage', () => {
  it('names a stale lock so the salesperson reloads', () => {
    expect(orderMutationMessage({ code: '40001', message: 'This order changed while you were editing' })).toMatch(
      /changed while you were editing/i,
    );
  });

  it('does not leak a permission-denied SQLSTATE', () => {
    expect(orderMutationMessage({ code: '42501', message: 'Not allowed' })).toMatch(/do not have permission/i);
  });
});

describe('report helpers', () => {
  it('treats an unknown period as this month', () => {
    expect(parsePeriod(undefined)).toBe('this_month');
    expect(parsePeriod('last_month')).toBe('last_month');
  });

  it('prints a dash when a rate has no denominator', () => {
    expect(rateLabel(null)).toBe('n/a');
    expect(rateLabel(50)).toBe('50%');
  });
});
