import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({ userId: 'admin-1', role: 'beco_admin' }));
vi.mock('@/lib/session', () => ({ requirePath: (...a: unknown[]) => requirePath(...a) }));

const fetchLeaderboard = vi.fn();
const fetchConversionReport = vi.fn();
vi.mock('@/lib/reports', async () => {
  const actual = await vi.importActual<typeof import('@/lib/reports')>('@/lib/reports');
  return {
    ...actual,
    fetchLeaderboard: (...a: unknown[]) => fetchLeaderboard(...a),
    fetchConversionReport: (...a: unknown[]) => fetchConversionReport(...a),
  };
});

const renderReportPdfBytes = vi.fn();
vi.mock('@/lib/report-pdf', () => ({
  renderReportPdfBytes: (...a: unknown[]) => renderReportPdfBytes(...a),
  reportPdfFilename: (period: string) => `Beco sales review ${period}.pdf`,
}));

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
  it('returns the period PDF as an attachment for sales review', async () => {
    fetchLeaderboard.mockResolvedValue({ period: 'Last month', invoiced: 0, collected: 0, people: [] });
    fetchConversionReport.mockResolvedValue({ period: 'Last month', products: [], categories: [] });
    renderReportPdfBytes.mockResolvedValue({ ok: true, bytes: Buffer.from('%PDF-1.4 test') });

    const res = await get('http://localhost:3001/reports/pdf?period=last_month');
    expect(requirePath).toHaveBeenCalledWith('/reports');
    expect(fetchLeaderboard).toHaveBeenCalledWith({}, 'last_month');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toMatch(/^attachment;/);
    expect(res.headers.get('content-disposition')).toContain('Beco sales review Last month.pdf');
    expect(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('does not write a documents row', async () => {
    fetchLeaderboard.mockResolvedValue({ period: 'This month', invoiced: 0, collected: 0, people: [] });
    fetchConversionReport.mockResolvedValue({ period: 'This month', products: [], categories: [] });
    renderReportPdfBytes.mockResolvedValue({ ok: true, bytes: Buffer.from('%PDF-1.4 test') });

    await get('http://localhost:3001/reports/pdf');
    expect(renderReportPdfBytes).toHaveBeenCalled();
    expect(fetchLeaderboard.mock.calls[0]?.[1]).toBe('this_month');
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
