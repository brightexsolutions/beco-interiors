import { describe, expect, it } from 'vitest';
import { reportPdfFilename, toReportPdfInput } from '../report-pdf';
import type { ConversionReport, LeaderboardReport } from '../reports';

const leaderboard: LeaderboardReport = {
  period: 'Last month',
  invoiced: 100000,
  collected: 40000,
  people: [
    {
      id: 'sales-1',
      full_name: 'Sam Odhiambo',
      raised: 4,
      won: 2,
      lost: 1,
      won_value: 80000,
      conversion: 66.7,
      orders: 1,
      order_value: 40000,
    },
  ],
};

const conversion: ConversionReport = {
  period: 'Last month',
  products: [
    {
      id: 'p1',
      name: 'Calacatta Gold',
      views: 10,
      add_to_cart: 2,
      quote_submitted: 1,
      whatsapp: 3,
      calls: 1,
      view_to_cart: 20,
      cart_to_quote: 50,
    },
  ],
  categories: [],
};

describe('reportPdfFilename', () => {
  it('names the file after the period so Downloads stays identifiable', () => {
    expect(reportPdfFilename('This month')).toBe('Beco sales review This month.pdf');
  });

  it('strips path characters so the browser does not treat the name as a folder', () => {
    expect(reportPdfFilename('This / month')).toBe('Beco sales review This month.pdf');
  });
});

describe('toReportPdfInput', () => {
  it('copies the on-screen figures into the document', () => {
    const input = toReportPdfInput(leaderboard, conversion, '2026-09-18T10:00:00.000Z');
    expect(input.period).toBe('Last month');
    expect(input.invoiced).toBe(100000);
    expect(input.collected).toBe(40000);
    expect(input.raised).toBe(4);
    expect(input.won).toBe(2);
    expect(input.conversion).toBe(50);
    expect(input.people[0]).toEqual({
      name: 'Sam Odhiambo',
      raised: 4,
      won: 2,
      wonValue: 80000,
      conversion: 66.7,
    });
    expect(input.products[0]?.name).toBe('Calacatta Gold');
    expect(input.categories).toEqual([]);
  });
});
