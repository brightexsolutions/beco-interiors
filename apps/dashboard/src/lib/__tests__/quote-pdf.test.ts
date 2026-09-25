import { describe, expect, it, vi } from 'vitest';
import { persistQuotePdf, quotePdfFilename } from '../quote-pdf';
import type { QuoteDetail, QuoteSettings } from '../quote-detail';

vi.mock('@beco/documents', () => ({
  renderQuotePdf: vi.fn(async () => Buffer.from('%PDF-1.4 mock')),
}));

const quote = {
  id: 'q1',
  reference: 'BEC-Q-00042',
  totals: { isPriced: true },
  lines: [],
} as unknown as QuoteDetail;

const settings = {} as QuoteSettings;

describe('quotePdfFilename', () => {
  it('puts the client name on the file so a download is identifiable', () => {
    expect(quotePdfFilename('BEC-Q-00042', 'Njeri Kamau')).toBe('BEC-Q-00042 Njeri Kamau.pdf');
  });

  it('strips path characters so the browser does not treat the name as a folder', () => {
    expect(quotePdfFilename('BEC-Q-00001', 'Acme / "West"')).toBe('BEC-Q-00001 Acme West.pdf');
  });

  it('falls back to the reference when the name is empty', () => {
    expect(quotePdfFilename('BEC-Q-00001', '   ')).toBe('BEC-Q-00001.pdf');
  });
});

describe('persistQuotePdf', () => {
  it('uploads bytes and writes a documents row, so a send has a file to attach', async () => {
    const upload = vi.fn(async () => ({ error: null }));
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = {
      storage: { from: () => ({ upload }) },
      from: () => ({ insert }),
    };

    const result = await persistQuotePdf(supabase, quote, settings, 'sales-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(upload).toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'quote',
        quote_id: 'q1',
        reference_number: 'BEC-Q-00042',
        generated_by: 'sales-1',
      }),
    );
  });

  it('surfaces a storage failure instead of pretending the PDF exists', async () => {
    const supabase = {
      storage: { from: () => ({ upload: async () => ({ error: { message: 'bucket missing' } }) }) },
      from: () => ({ insert: async () => ({ error: null }) }),
    };
    const result = await persistQuotePdf(supabase, quote, settings, 'sales-1');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/could not store/i);
  });
});
