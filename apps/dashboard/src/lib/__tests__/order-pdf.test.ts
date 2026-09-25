import { describe, expect, it, vi } from 'vitest';
import { persistReceiptPdf, receiptPdfFilename } from '../order-pdf';
import type { OrderDetail } from '../order-detail';
import type { QuoteSettings } from '../quote-detail';

vi.mock('@beco/documents', () => ({
  renderReceiptPdf: vi.fn(async () => Buffer.from('%PDF-1.4 mock')),
}));

const order = {
  id: 'o1',
  reference: 'BEC-O-00042',
  quoteId: 'q1',
  totals: { isPriced: true },
  lines: [],
  customerName: 'Njeri Kamau',
  paidAt: '2026-09-18T10:00:00.000Z',
} as unknown as OrderDetail;

const settings = {} as QuoteSettings;

describe('receiptPdfFilename', () => {
  it('puts the client name on the file so a download is identifiable', () => {
    expect(receiptPdfFilename('BEC-O-00042', 'Njeri Kamau')).toBe('BEC-O-00042 Njeri Kamau.pdf');
  });

  it('strips path characters so the browser does not treat the name as a folder', () => {
    expect(receiptPdfFilename('BEC-O-00001', 'Acme / "West"')).toBe('BEC-O-00001 Acme West.pdf');
  });
});

describe('persistReceiptPdf', () => {
  it('uploads bytes and writes a documents row typed as receipt', async () => {
    const upload = vi.fn(async () => ({ error: null }));
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = {
      storage: { from: () => ({ upload }) },
      from: () => ({ insert }),
    };

    const result = await persistReceiptPdf(supabase, order, settings, 'sales-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'receipt',
        order_id: 'o1',
        quote_id: 'q1',
        reference_number: 'BEC-O-00042',
        generated_by: 'sales-1',
      }),
    );
  });

  it('surfaces a storage failure instead of pretending the PDF exists', async () => {
    const supabase = {
      storage: { from: () => ({ upload: async () => ({ error: { message: 'bucket missing' } }) }) },
      from: () => ({ insert: async () => ({ error: null }) }),
    };
    const result = await persistReceiptPdf(supabase, order, settings, 'sales-1');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/could not store/i);
  });
});
