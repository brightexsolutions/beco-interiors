import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const reportOpsFailure = vi.fn(async () => {});
vi.mock('../ops-alert', () => ({ reportOpsFailure: (...a: unknown[]) => reportOpsFailure(...(a as [])) }));

const { relayQuoteConfirmation } = await import('../quote-confirmation');

const input = { reference: 'BEC-Q-00042', customerName: 'Achieng Otieno', to: 'achieng@example.com', itemCount: 3 };

describe('relayQuoteConfirmation (D109)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    reportOpsFailure.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('asks the dashboard to send, with the shared secret and the whole request', async () => {
    vi.stubEnv('DASHBOARD_URL', 'http://localhost:3001/');
    vi.stubEnv('OPS_ALERT_SECRET', 'relay');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal('fetch', fetchMock);
    expect(await relayQuoteConfirmation(input)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3001/api/quote-confirmation');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer relay');
    expect(JSON.parse(String(init.body))).toEqual(input);
    expect(reportOpsFailure).not.toHaveBeenCalled();
  });

  it('skips quietly when the relay is not configured, and never calls out', async () => {
    vi.stubEnv('DASHBOARD_URL', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await relayQuoteConfirmation(input)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(reportOpsFailure).not.toHaveBeenCalled();
  });

  it('raises an alert when the dashboard refuses, naming the quote and the address', async () => {
    vi.stubEnv('DASHBOARD_URL', 'http://localhost:3001');
    vi.stubEnv('OPS_ALERT_SECRET', 'relay');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    expect(await relayQuoteConfirmation(input)).toBe(false);
    expect(reportOpsFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'quote.confirmation.relay',
        detail: 'HTTP 502',
        context: { quote: 'BEC-Q-00042', to: 'achieng@example.com' },
      }),
    );
  });

  it('never throws when the dashboard cannot be reached', async () => {
    vi.stubEnv('DASHBOARD_URL', 'http://localhost:3001');
    vi.stubEnv('OPS_ALERT_SECRET', 'relay');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));
    await expect(relayQuoteConfirmation(input)).resolves.toBe(false);
    expect(reportOpsFailure).toHaveBeenCalledWith(expect.objectContaining({ detail: 'connection refused' }));
  });
});
