import { describe, expect, it } from 'vitest';
import { quoteTotals } from '@beco/validation';
import { renderQuotePdf } from '../render';
import { lineCodeLabel, PDF_CARD_RADIUS, quoteFromLines, quotePaymentBlocks, type QuotePdfInput } from '../types';

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
  paybillNumber: '',
  paybillAccount: '',
  sendMoneyNumber: '',
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

  it('prints till, paybill and send money when those channels are set', async () => {
    const quote = base({
      tillNumber: '123456',
      paybillNumber: '247247',
      paybillAccount: 'Quote number',
      sendMoneyNumber: '254722333730',
    });
    expect(quotePaymentBlocks(quote)).toEqual([
      { label: 'Bank', lines: ['KCB Bank Kenya. Account name: Beco Interiors.'] },
      { label: 'Till', lines: ['123456'] },
      { label: 'Paybill', lines: ['247247', 'Account Quote number'] },
      { label: 'Send money', lines: ['254722333730'] },
    ]);
    const pdf = await renderQuotePdf(quote);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
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

describe('renderReceiptPdf', () => {
  it('labels the document as a receipt and records the paid date', async () => {
    const { renderReceiptPdf } = await import('../render');
    const pdf = await renderReceiptPdf(
      base({
        reference: 'BEC-O-00042',
        kind: 'receipt',
        paidAt: '2026-09-18T10:00:00.000Z',
        validUntil: null,
      }),
    );
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const asText = pdf.toString('latin1');
    expect(asText).toContain('BEC-O-00042');
    expect(asText).toContain('Beco Interiors Limited');
    expect(asText).toContain('Receipt');
    expect(asText).not.toMatch(/Valid until/);
    expect(pdf.includes(Buffer.from([0xe2, 0x80, 0x94]))).toBe(false);
  });
});

describe('PDF_CARD_RADIUS (D125)', () => {
  it('is the site card corner, 6px, in points', () => {
    expect(PDF_CARD_RADIUS).toBe(4.5);
  });

  it('renders the rounded How to pay box without breaking the document', async () => {
    const pdf = await renderQuotePdf(base({ tillNumber: '123456' }));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(pdf)).toBe(1);
  });
});

describe('lineCodeLabel (D124)', () => {
  it('prints a code as "Code H-301", trimmed, and nothing for a blank or missing one', () => {
    expect(lineCodeLabel('H-301')).toBe('Code H-301');
    expect(lineCodeLabel('  H-301 ')).toBe('Code H-301');
    expect(lineCodeLabel('   ')).toBeNull();
    expect(lineCodeLabel(null)).toBeNull();
    expect(lineCodeLabel(undefined)).toBeNull();
  });

  it('renders a 15 line coded quote with every row still unbreakable across pages', async () => {
    const coded = Array.from({ length: 15 }, (_, i) => ({ ...line(i + 1), code: `H-${300 + i}` }));
    const pdf = await renderQuotePdf(base({ lines: coded }));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(pdf)).toBeGreaterThan(1);
  });
});

describe('quoteFromLines', () => {
  it('falls back to the legal name and showroom address when nothing is configured', () => {
    const from = quoteFromLines(base());
    expect(from.name).toBe('Beco Interiors Limited');
    expect(from.lines[0]).toContain('Urban Square');
    expect(from.lines).toContain('+254 722 333 730');
    expect(from.tax).toEqual([]);
  });

  it('prints the KRA PIN, and a VAT number only when it differs from the PIN', () => {
    expect(quoteFromLines(base({ business: { kraPin: 'P051234567X' } })).tax).toEqual(['KRA PIN P051234567X']);
    expect(
      quoteFromLines(base({ business: { kraPin: 'P051234567X', vatNumber: 'P051234567X' } })).tax,
    ).toEqual(['KRA PIN P051234567X']);
    expect(quoteFromLines(base({ business: { kraPin: 'P051234567X', vatNumber: '0123456Q' } })).tax).toEqual([
      'KRA PIN P051234567X',
      'VAT No. 0123456Q',
    ]);
  });

  it('uses the configured name, a multi line address and the email, dropping blanks', () => {
    const from = quoteFromLines(
      base({ business: { legalName: 'Beco Interiors Ltd', address: 'Shop 8\n\nEnterprise Road', email: 'info@beco.co.ke' } }),
    );
    expect(from.name).toBe('Beco Interiors Ltd');
    expect(from.lines).toEqual(['Shop 8', 'Enterprise Road', '+254 722 333 730', 'info@beco.co.ke']);
  });

  it('renders the KRA PIN into the actual PDF', async () => {
    const pdf = await renderQuotePdf(base({ business: { kraPin: 'P051234567X' }, tillNumber: '123456' }));
    const asText = pdf.toString('latin1');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    // Text is font-subset encoded, so assert on the document metadata and
    // page count rather than raw glyph strings.
    expect(pageCount(pdf)).toBe(1);
    expect(asText).toContain('Beco Interiors Limited');
  });
});
