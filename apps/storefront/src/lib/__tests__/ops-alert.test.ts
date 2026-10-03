import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { reportOpsFailure } = await import('../ops-alert');

const failure = {
  area: 'quote.submit',
  summary: 'A website quote request did not save, call the customer back',
  detail: 'connection refused',
  context: { customer: 'Achieng', phone: '0722000000', items: 3 },
};

describe('storefront reportOpsFailure', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('always writes the structured log line, even with no relay configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('DASHBOARD_URL', '');
    await reportOpsFailure(failure);
    const line = String(vi.mocked(console.error).mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toMatchObject({ event: 'ops_alert', app: 'storefront', area: 'quote.submit' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('relays to the dashboard with the shared secret', async () => {
    vi.stubEnv('DASHBOARD_URL', 'http://localhost:3001/');
    vi.stubEnv('OPS_ALERT_SECRET', 'relay');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal('fetch', fetchMock);
    await reportOpsFailure(failure);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3001/api/ops-alert');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer relay');
    expect(JSON.parse(String(init.body))).toMatchObject({ area: 'quote.submit', context: { items: 3 } });
  });

  it('never throws when the dashboard is down, and logs that the alert was not delivered', async () => {
    vi.stubEnv('DASHBOARD_URL', 'http://localhost:3001');
    vi.stubEnv('OPS_ALERT_SECRET', 'relay');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(reportOpsFailure(failure)).resolves.toBeUndefined();
    expect(
      vi.mocked(console.error).mock.calls.some((c) => String(c[0]).includes('ops_alert_undelivered')),
    ).toBe(true);
  });

  it('logs a refused relay by status', async () => {
    vi.stubEnv('DASHBOARD_URL', 'http://localhost:3001');
    vi.stubEnv('OPS_ALERT_SECRET', 'wrong');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await reportOpsFailure(failure);
    expect(vi.mocked(console.error).mock.calls.some((c) => String(c[0]).includes('"status":401'))).toBe(true);
  });
});
