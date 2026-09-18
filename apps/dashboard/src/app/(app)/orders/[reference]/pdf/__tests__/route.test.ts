import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({ userId: 'sales-1', role: 'beco_sales' }));
vi.mock('@/lib/session', () => ({ requirePath: (...a: unknown[]) => requirePath(...a) }));

const fetchOrder = vi.fn();
vi.mock('@/lib/order-detail', () => ({ fetchOrder: (...a: unknown[]) => fetchOrder(...a) }));
vi.mock('@/lib/quote-detail', () => ({ fetchQuoteSettings: vi.fn(async () => ({})) }));

const persistReceiptPdf = vi.fn();
const renderReceiptPdfBytes = vi.fn();
vi.mock('@/lib/order-pdf', () => ({
  persistReceiptPdf: (...a: unknown[]) => persistReceiptPdf(...a),
  renderReceiptPdfBytes: (...a: unknown[]) => renderReceiptPdfBytes(...a),
  receiptPdfFilename: (ref: string, name: string) => `${ref} ${name}.pdf`,
}));

vi.mock('@/lib/supabase', () => ({ getSupabase: async () => ({}) }));

const { GET } = await import('../route');

beforeEach(() => {
  fetchOrder.mockReset();
  persistReceiptPdf.mockReset();
  renderReceiptPdfBytes.mockReset();
  requirePath.mockClear();
});

const get = (url: string) =>
  GET(new Request(url) as never, { params: Promise.resolve({ reference: 'BEC-O-00042' }) });

describe('GET /orders/[reference]/pdf', () => {
  it('refuses a receipt before the order is paid', async () => {
    fetchOrder.mockResolvedValue({ reference: 'BEC-O-00042', paymentStatus: 'unpaid', customerName: 'Achieng' });
    const res = await get('http://localhost:3001/orders/BEC-O-00042/pdf');
    expect(res.status).toBe(409);
    expect(persistReceiptPdf).not.toHaveBeenCalled();
  });

  it('preview renders bytes without writing a documents row', async () => {
    fetchOrder.mockResolvedValue({
      reference: 'BEC-O-00042',
      paymentStatus: 'paid',
      customerName: 'Achieng Otieno',
    });
    renderReceiptPdfBytes.mockResolvedValue({ ok: true, bytes: Buffer.from('%PDF-1.4 test'), isPriced: true });

    const res = await get('http://localhost:3001/orders/BEC-O-00042/pdf');
    expect(requirePath).toHaveBeenCalledWith('/orders');
    expect(renderReceiptPdfBytes).toHaveBeenCalled();
    expect(persistReceiptPdf).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toMatch(/^inline;/);
  });

  it('Download stores the file as an attachment', async () => {
    fetchOrder.mockResolvedValue({
      reference: 'BEC-O-00042',
      paymentStatus: 'paid',
      customerName: 'Achieng Otieno',
    });
    persistReceiptPdf.mockResolvedValue({
      ok: true,
      bytes: Buffer.from('%PDF-1.4 test'),
      path: 'receipts/BEC-O-00042/x.pdf',
    });

    const res = await get('http://localhost:3001/orders/BEC-O-00042/pdf?download=1');
    expect(persistReceiptPdf).toHaveBeenCalled();
    expect(res.headers.get('content-disposition')).toMatch(/^attachment;/);
    expect(res.headers.get('content-disposition')).toContain('BEC-O-00042 Achieng Otieno.pdf');
  });
});
