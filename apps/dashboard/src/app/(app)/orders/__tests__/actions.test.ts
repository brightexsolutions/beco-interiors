import { afterEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({
  userId: 'sales-1',
  email: 'sam@beco.co.ke',
  fullName: 'Sam',
  role: 'beco_sales' as const,
  isActive: true,
  mustChangePassword: false,
}));

vi.mock('@/lib/session', () => ({ requirePath: (...a: Parameters<typeof requirePath>) => requirePath(...a) }));

const rpc = vi.fn();
const maybeSingle = vi.fn();
const getSupabase = vi.fn(async () => ({
  rpc,
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle }) }),
    update: () => ({ eq: () => ({ eq: () => ({}) }) }),
  }),
}));
vi.mock('@/lib/supabase', () => ({ getSupabase: () => getSupabase() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@beco/documents', () => ({ sendReceipt: vi.fn(async () => ({ sent: false, reason: 'no-api-key' })) }));
vi.mock('@/lib/order-detail', () => ({ fetchOrder: vi.fn() }));
vi.mock('@/lib/order-pdf', () => ({ persistReceiptPdf: vi.fn(), receiptPdfFilename: () => 'x.pdf' }));
vi.mock('@/lib/quote-detail', () => ({ fetchQuoteSettings: vi.fn() }));

const { convertQuoteToOrder, setOrderStatus, markOrderPaid, sendOrderReceipt } = await import('../actions');

afterEach(() => {
  rpc.mockReset();
  maybeSingle.mockReset();
  requirePath.mockClear();
});

const form = (over: Record<string, string> = {}) => {
  const data = new FormData();
  data.set('orderId', '11111111-1111-4111-8111-111111111111');
  data.set('updatedAt', '2026-09-18T10:00:00.000Z');
  for (const [k, v] of Object.entries(over)) data.set(k, v);
  return data;
};

describe('order actions', () => {
  it('re-checks the session on convert', async () => {
    rpc.mockResolvedValue({ data: 'BEC-O-00001', error: null });
    maybeSingle.mockResolvedValue({ data: { reference_number: 'BEC-Q-1' } });
    const data = new FormData();
    data.set('quoteId', '11111111-1111-4111-8111-111111111111');
    data.set('updatedAt', '2026-09-18T10:00:00.000Z');
    const result = await convertQuoteToOrder({}, data);
    expect(requirePath).toHaveBeenCalledWith('/orders');
    expect(result.orderReference).toBe('BEC-O-00001');
  });

  it('refuses a stale lock with the salesperson-facing sentence', async () => {
    rpc.mockResolvedValue({ error: { code: '40001', message: 'This order changed while you were editing' } });
    const result = await setOrderStatus({}, form({ status: 'confirmed' }));
    expect(result.error).toMatch(/changed while you were editing/i);
  });

  it('marks paid through the RPC', async () => {
    rpc.mockResolvedValue({ error: null });
    maybeSingle.mockResolvedValue({
      data: { reference_number: 'BEC-O-00001', quote: { reference_number: 'BEC-Q-1' } },
    });
    const result = await markOrderPaid({}, form());
    expect(rpc).toHaveBeenCalledWith('mark_order_paid', expect.objectContaining({ p_order_id: expect.any(String) }));
    expect(result.ok).toMatch(/is marked paid/i);
  });

  it('refuses a receipt email until the order is paid', async () => {
    maybeSingle.mockResolvedValue({
      data: { reference_number: 'BEC-O-00001', payment_status: 'unpaid' },
    });
    const result = await sendOrderReceipt({}, form({ to: 'ada@example.com' }));
    expect(result.error).toMatch(/after the order is marked paid/i);
  });

  it('emails a receipt after the order is paid', async () => {
    maybeSingle.mockResolvedValue({
      data: { reference_number: 'BEC-O-00001', payment_status: 'paid' },
    });
    const { fetchOrder } = await import('@/lib/order-detail');
    const { persistReceiptPdf } = await import('@/lib/order-pdf');
    const { fetchQuoteSettings } = await import('@/lib/quote-detail');
    const { sendReceipt } = await import('@beco/documents');
    vi.mocked(fetchOrder).mockResolvedValue({
      reference: 'BEC-O-00001',
      customerName: 'Ada',
      quoteReference: 'BEC-Q-1',
    } as never);
    vi.mocked(fetchQuoteSettings).mockResolvedValue({} as never);
    vi.mocked(persistReceiptPdf).mockResolvedValue({
      ok: true,
      bytes: Buffer.from('%PDF-1.4'),
      path: 'receipts/BEC-O-00001/x.pdf',
    });
    vi.mocked(sendReceipt).mockResolvedValue({ sent: true, id: 'msg-1' });

    const result = await sendOrderReceipt({}, form({ to: 'ada@example.com' }));
    expect(sendReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ada@example.com', reference: 'BEC-O-00001' }),
    );
    expect(result.ok).toMatch(/sent to ada@example.com/i);
  });
});
