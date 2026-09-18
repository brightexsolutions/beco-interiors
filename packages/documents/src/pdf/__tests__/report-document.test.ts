import { describe, expect, it } from 'vitest';
import { catalogueCopy, categoryCopy, renderReportPdf, summaryCopy } from '../render';
import type { ReportPdfInput } from '../types';

const base = (over: Partial<ReportPdfInput> = {}): ReportPdfInput => ({
  period: 'This month',
  generatedAt: '2026-09-18T10:00:00.000Z',
  invoiced: 100000,
  collected: 40000,
  raised: 4,
  won: 2,
  conversion: 50,
  people: [
    { name: 'Sam Odhiambo', raised: 4, won: 2, wonValue: 80000, conversion: 66.7 },
  ],
  products: [
    {
      name: 'Calacatta Gold',
      views: 10,
      addToCart: 2,
      quoted: 1,
      whatsapp: 3,
      calls: 1,
      viewToCart: 20,
    },
  ],
  categories: [
    {
      name: 'Sintered stone',
      views: 10,
      addToCart: 2,
      quoted: 1,
      whatsapp: 3,
      calls: 1,
      viewToCart: 20,
    },
  ],
  ...over,
});

describe('report copy', () => {
  it('writes a summary sentence, not dashboard labels', () => {
    const copy = summaryCopy(base());
    expect(copy).toContain('raised 4 quotes and won 2');
    expect(copy).toContain('50%');
    expect(copy).toMatch(/Invoiced Ksh\s*100,000/);
    expect(copy).toMatch(/Collected Ksh\s*40,000/);
  });

  it('names the leading product and range', () => {
    expect(catalogueCopy(base())).toContain('Calacatta Gold');
    expect(categoryCopy(base())).toContain('Sintered stone');
  });

  it('empty periods are sentences, not blank tables', () => {
    const empty = base({
      people: [],
      products: [],
      categories: [],
      raised: 0,
      won: 0,
      conversion: null,
    });
    expect(summaryCopy(empty)).toContain('No quotes were raised');
    expect(catalogueCopy(empty)).toBe('The storefront recorded no product events in this period.');
    expect(categoryCopy(empty)).toBe('Nothing to group by range in this period.');
  });
});

describe('renderReportPdf', () => {
  it('produces a performance report PDF, not a quotation', async () => {
    const pdf = await renderReportPdf(base());
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const asText = pdf.toString('latin1');
    expect(asText).toContain('Sales performance report, This month');
    expect(asText).toContain('Beco Interiors Limited');
    expect(asText).toContain('TitilliumWeb');
    expect(asText).toContain('CormorantGaramond');
    expect(asText).not.toContain('Quotation');
  });

  it('uses no em dashes', async () => {
    const pdf = await renderReportPdf(base());
    expect(pdf.includes(Buffer.from([0xe2, 0x80, 0x94]))).toBe(false);
  });
});
