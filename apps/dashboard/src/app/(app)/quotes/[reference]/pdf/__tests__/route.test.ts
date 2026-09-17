import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({ userId: 'sales-1', role: 'beco_sales' }));
vi.mock('@/lib/session', () => ({ requirePath: (...a: unknown[]) => requirePath(...a) }));

const fetchQuote = vi.fn();
const fetchQuoteSettings = vi.fn();
vi.mock('@/lib/quote-detail', () => ({
  fetchQuote: (...a: unknown[]) => fetchQuote(...a),
  fetchQuoteSettings: (...a: unknown[]) => fetchQuoteSettings(...a),
}));

const persistQuotePdf = vi.fn();
const renderQuotePdfBytes = vi.fn();
vi.mock('@/lib/quote-pdf', () => ({
  persistQuotePdf: (...a: unknown[]) => persistQuotePdf(...a),
  renderQuotePdfBytes: (...a: unknown[]) => renderQuotePdfBytes(...a),
}));

vi.mock('@/lib/supabase', () => ({ getSupabase: async () => ({}) }));

const { GET } = await import('../route');

beforeEach(() => {
  fetchQuote.mockReset();
  fetchQuoteSettings.mockReset();
  persistQuotePdf.mockReset();
  renderQuotePdfBytes.mockReset();
  requirePath.mockClear();
});

const get = (url: string) =>
  GET(new Request(url) as never, { params: Promise.resolve({ reference: 'BEC-Q-00042' }) });

describe('GET /quotes/[reference]/pdf', () => {
  it('preview renders bytes without writing a documents row', async () => {
    fetchQuote.mockResolvedValue({ reference: 'BEC-Q-00042', id: 'q' });
    fetchQuoteSettings.mockResolvedValue({});
    renderQuotePdfBytes.mockResolvedValue({
      ok: true,
      bytes: Buffer.from('%PDF-1.4 test'),
      isPriced: true,
    });

    const res = await get('http://localhost:3001/quotes/BEC-Q-00042/pdf');
    expect(requirePath).toHaveBeenCalledWith('/quotes');
    expect(renderQuotePdfBytes).toHaveBeenCalled();
    expect(persistQuotePdf).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toMatch(/^inline;/);
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('Download stores the file and returns it as an attachment', async () => {
    fetchQuote.mockResolvedValue({ reference: 'BEC-Q-00042', id: 'q' });
    fetchQuoteSettings.mockResolvedValue({});
    persistQuotePdf.mockResolvedValue({
      ok: true,
      bytes: Buffer.from('%PDF-1.4 test'),
      path: 'quotes/BEC-Q-00042/x.pdf',
      isPriced: true,
    });

    const res = await get('http://localhost:3001/quotes/BEC-Q-00042/pdf?download=1');
    expect(persistQuotePdf).toHaveBeenCalled();
    expect(res.headers.get('content-disposition')).toMatch(/^attachment;/);
    expect(res.headers.get('content-disposition')).toContain('BEC-Q-00042 Achieng Otieno.pdf');
  });
});
