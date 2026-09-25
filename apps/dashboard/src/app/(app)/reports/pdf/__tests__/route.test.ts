import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({ userId: 'admin-1', role: 'beco_admin' }));
vi.mock('@/lib/session', () => ({ requirePath: (...a: Parameters<typeof requirePath>) => requirePath(...a) }));

const fetchLeaderboard = vi.fn();
const fetchConversionReport = vi.fn();
vi.mock('@/lib/reports', async () => {
  const actual = await vi.importActual<typeof import('@/lib/reports')>('@/lib/reports');
  return {
    ...actual,
    fetchLeaderboard: (...a: Parameters<typeof fetchLeaderboard>) => fetchLeaderboard(...a),
    fetchConversionReport: (...a: Parameters<typeof fetchConversionReport>) => fetchConversionReport(...a),
  };
});

const renderReportPdfBytes = vi.fn();
vi.mock('@/lib/report-pdf', async () => {
  const actual = await vi.importActual<typeof import('@/lib/report-pdf')>('@/lib/report-pdf');
  return {
    ...actual,
    renderReportPdfBytes: (...a: Parameters<typeof renderReportPdfBytes>) => renderReportPdfBytes(...a),
  };
});

vi.mock('@/lib/supabase', () => ({ getSupabase: async () => ({}) }));

const { GET } = await import('../route');

beforeEach(() => {
  fetchLeaderboard.mockReset();
  fetchConversionReport.mockReset();
  renderReportPdfBytes.mockReset();
  requirePath.mockClear();
});

const get = (url: string) => GET(new Request(url) as never);

describe('GET /reports/pdf', () => {
  it('preview is inline so the dialog can show the document first', async () => {
    fetchLeaderboard.mockResolvedValue({ period: 'Last month', invoiced: 0, collected: 0, people: [] });
    fetchConversionReport.mockResolvedValue({ period: 'Last month', products: [], categories: [] });
    renderReportPdfBytes.mockResolvedValue({ ok: true, bytes: Buffer.from('%PDF-1.4 test') });

    const res = await get('http://localhost:3001/reports/pdf?period=last_month');
    expect(requirePath).toHaveBeenCalledWith('/reports');
    expect(fetchLeaderboard).toHaveBeenCalledWith({}, { period: 'last_month', from: null, to: null });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toMatch(/^inline;/);
    expect(res.headers.get('content-disposition')).toContain('Beco overall sales review Last month.pdf');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('Download is the same bytes as an attachment', async () => {
    fetchLeaderboard.mockResolvedValue({ period: 'This month', invoiced: 0, collected: 0, people: [] });
    fetchConversionReport.mockResolvedValue({ period: 'This month', products: [], categories: [] });
    renderReportPdfBytes.mockResolvedValue({ ok: true, bytes: Buffer.from('%PDF-1.4 test') });

    const res = await get('http://localhost:3001/reports/pdf?download=1');
    expect(res.headers.get('content-disposition')).toMatch(/^attachment;/);
    expect(res.headers.get('content-disposition')).toContain('Beco overall sales review This month.pdf');
  });

  it('does not write a documents row', async () => {
    fetchLeaderboard.mockResolvedValue({ period: 'This month', invoiced: 0, collected: 0, people: [] });
    fetchConversionReport.mockResolvedValue({ period: 'This month', products: [], categories: [] });
    renderReportPdfBytes.mockResolvedValue({ ok: true, bytes: Buffer.from('%PDF-1.4 test') });

    await get('http://localhost:3001/reports/pdf');
    expect(renderReportPdfBytes).toHaveBeenCalled();
    expect(fetchLeaderboard.mock.calls[0]?.[1]).toEqual({ period: 'this_month', from: null, to: null });
  });

  it('an individual review is named after that salesperson', async () => {
    const sam = 'd5c0ffee-0000-4000-8000-000000000002';
    fetchLeaderboard.mockResolvedValue({
      period: 'This month',
      invoiced: 0,
      collected: 0,
      people: [{ id: sam, full_name: 'Sam Odhiambo', raised: 1, won: 1, lost: 0, won_value: 1, conversion: 100, orders: 1, order_value: 1, invoiced: 1, collected: 1 }],
    });
    fetchConversionReport.mockResolvedValue({ period: 'This month', products: [], categories: [] });
    renderReportPdfBytes.mockResolvedValue({ ok: true, bytes: Buffer.from('%PDF-1.4 test') });

    const res = await get(`http://localhost:3001/reports/pdf?person=${sam}&download=1`);
    expect(renderReportPdfBytes).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      undefined,
      sam,
    );
    expect(res.headers.get('content-disposition')).toContain(
      'Beco salesperson review Sam Odhiambo This month.pdf',
    );
  });

  it('unknown salesperson is 404', async () => {
    fetchLeaderboard.mockResolvedValue({ period: 'This month', invoiced: 0, collected: 0, people: [] });
    fetchConversionReport.mockResolvedValue({ period: 'This month', products: [], categories: [] });

    const res = await get('http://localhost:3001/reports/pdf?person=d5c0ffee-0000-4000-8000-000000000099');
    expect(res.status).toBe(404);
    expect(renderReportPdfBytes).not.toHaveBeenCalled();
  });

  it('a person value that is not an id is 400', async () => {
    const res = await get('http://localhost:3001/reports/pdf?person=sam');
    expect(res.status).toBe(400);
    expect(fetchLeaderboard).not.toHaveBeenCalled();
  });

  it('a custom range is passed through to the report query', async () => {
    fetchLeaderboard.mockResolvedValue({
      period: '1 Sep 2026 to 18 Sep 2026',
      invoiced: 0,
      collected: 0,
      people: [],
    });
    fetchConversionReport.mockResolvedValue({
      period: '1 Sep 2026 to 18 Sep 2026',
      products: [],
      categories: [],
    });
    renderReportPdfBytes.mockResolvedValue({ ok: true, bytes: Buffer.from('%PDF-1.4 test') });

    const res = await get(
      'http://localhost:3001/reports/pdf?period=custom&from=2026-09-01&to=2026-09-18',
    );
    expect(fetchLeaderboard).toHaveBeenCalledWith(
      {},
      { period: 'custom', from: '2026-09-01', to: '2026-09-18' },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain(
      'Beco overall sales review 1 Sep 2026 to 18 Sep 2026.pdf',
    );
  });

  it('an inverted custom range is 400', async () => {
    const res = await get(
      'http://localhost:3001/reports/pdf?period=custom&from=2026-09-18&to=2026-09-01',
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Choose a start and end date.');
    expect(fetchLeaderboard).not.toHaveBeenCalled();
  });

  it('returns 500 when render fails', async () => {
    fetchLeaderboard.mockResolvedValue({ period: 'This month', invoiced: 0, collected: 0, people: [] });
    fetchConversionReport.mockResolvedValue({ period: 'This month', products: [], categories: [] });
    renderReportPdfBytes.mockResolvedValue({ ok: false, error: 'Could not render the PDF: boom' });

    const res = await get('http://localhost:3001/reports/pdf');
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Could not render the PDF: boom');
  });
});
