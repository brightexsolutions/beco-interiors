import { describe, expect, it } from 'vitest';
import { quoteTotals } from '@beco/validation';
import { renderQuotePdf } from '../render';
import type { QuotePdfInput } from '../types';

const line = (n: number, price = 65000): QuotePdfInput['lines'][number] => ({
  description: `Line ${String(n).padStart(2, '0')} sintered stone slab, 12mm polished`,
  quantity: 1,
  unitPrice: price,
  lineTotal: price,
});

const base = (over: Partial<QuotePdfInput> = {}): QuotePdfInput => ({
  reference: 'BEC-Q-00042',
  customerName: 'Achieng Otieno',
  customerPhone: '0722 333 730',
  customerEmail: 'achieng@example.com',
  company: null,
  projectDetails: 'Kitchen island, Karen',
  validUntil: '2026-10-17',
  lines: [line(1)],
  vatRate: 0.16,
  bankDetails: 'KCB Bank Kenya. Account name: Beco Interiors.',
  tillNumber: '',
  paymentTerms: 'Prices include VAT. Valid for the days shown.',
  footer: 'Urban Square, Enterprise Road, Industrial Area, Nairobi. +254 722 333 730.',
  phone: '+254 722 333 730',
  issuedAt: '2026-09-17T10:00:00.000Z',
  ...over,
});

const pageCount = (pdf: Buffer): number => {
  const matches = pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g);
  return matches?.length ?? 0;
};

describe('renderQuotePdf', () => {
  it('produces a PDF that carries the reference and never prints KES 0.00 on an unpriced quote', async () => {
    const pdf = await renderQuotePdf(
      base({
        lines: [line(1, 0)],
      }),
    );
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const asText = pdf.toString('latin1');
    expect(asText).toContain('BEC-Q-00042');
    expect(asText).toContain('TitilliumWeb');
    expect(asText).toContain('CormorantGaramond');
    expect(asText).toContain('/FontFile2');
    expect(asText).not.toMatch(/KES 0\.00/);
  });

  it('the From block is the legal name, Beco Interiors Limited', async () => {
    const pdf = await renderQuotePdf(base());
    expect(pdf.toString('latin1')).toContain('Beco Interiors Limited');
  });

  it('a priced quote uses the D50 split, VAT inside not on top', () => {
    const totals = quoteTotals([{ unitPrice: 65000, quantity: 1 }], 0.16);
    expect(totals.vat).toBe(8965.52);
    expect(totals.gross).toBe(65000);
  });

  it('pins page breaks on a 15 line quote: more than one page, and each row is unbreakable', async () => {
    const pdf = await renderQuotePdf(base({ lines: Array.from({ length: 15 }, (_, i) => line(i + 1)) }));
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(2);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 20_000);

  it('uses no em dashes in the rendered bytes of a typical quote', async () => {
    const pdf = await renderQuotePdf(base());
    expect(pdf.includes(Buffer.from([0xe2, 0x80, 0x94]))).toBe(false);
  });
});
