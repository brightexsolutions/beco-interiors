import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendOpsAlert = vi.fn();
vi.mock('@beco/documents', () => ({ sendOpsAlert: (...a: unknown[]) => sendOpsAlert(...a) }));

const { createAlertThrottle, reportOpsFailure, reportSendFailure } = await import('../ops-alert');

describe('createAlertThrottle', () => {
  it('sends the first, holds back repeats inside the window, then reports how many were held', () => {
    let t = 0;
    const throttle = createAlertThrottle({ windowMs: 1000, now: () => t });
    expect(throttle.admit('a')).toEqual({ send: true, suppressed: 0 });
    t = 100;
    expect(throttle.admit('a')).toEqual({ send: false, suppressed: 1 });
    t = 200;
    expect(throttle.admit('a')).toEqual({ send: false, suppressed: 2 });
    t = 1200;
    expect(throttle.admit('a')).toEqual({ send: true, suppressed: 2 });
  });

  it('keeps separate keys separate', () => {
    const throttle = createAlertThrottle({ windowMs: 1000, now: () => 0 });
    expect(throttle.admit('a').send).toBe(true);
    expect(throttle.admit('b').send).toBe(true);
  });

  it('caps the total per hour, then resets on the next hour', () => {
    let t = 0;
    const throttle = createAlertThrottle({ hourlyCap: 2, now: () => t });
    expect(throttle.admit('a').send).toBe(true);
    expect(throttle.admit('b').send).toBe(true);
    expect(throttle.admit('c')).toEqual({ send: false, suppressed: 1 });
    t = 60 * 60_000;
    expect(throttle.admit('c')).toEqual({ send: true, suppressed: 1 });
  });

  it('never grows past maxKeys', () => {
    let t = 0;
    const throttle = createAlertThrottle({ windowMs: 10, maxKeys: 3, hourlyCap: 1000, now: () => t });
    for (let i = 0; i < 20; i += 1) {
      t = i;
      throttle.admit(`k${i}`);
    }
    // A key admitted long ago was pruned, so it sends again rather than
    // being held back forever by a stale entry.
    t = 1000;
    expect(throttle.admit('k0').send).toBe(true);
  });
});

describe('reportOpsFailure', () => {
  beforeEach(() => {
    sendOpsAlert.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('writes a structured ops_alert log line and sends the email', async () => {
    sendOpsAlert.mockResolvedValue({ sent: true, id: 'x' });
    await reportOpsFailure({
      area: 'test.log',
      summary: 'Unique summary for the log test',
      error: new Error('kaboom'),
      context: { quote: 'BEC-Q-1' },
    });
    const line = vi.mocked(console.error).mock.calls.map((c) => String(c[0])).find((s) => s.includes('ops_alert'));
    const parsed = JSON.parse(line!);
    expect(parsed).toMatchObject({
      event: 'ops_alert',
      app: 'dashboard',
      area: 'test.log',
      detail: 'kaboom',
      context: { quote: 'BEC-Q-1' },
    });
    expect(sendOpsAlert).toHaveBeenCalledWith(expect.objectContaining({ area: 'test.log', suppressed: 0 }));
  });

  it('logs every occurrence but emails a repeat only once per window', async () => {
    sendOpsAlert.mockResolvedValue({ sent: true, id: 'x' });
    await reportOpsFailure({ area: 'test.repeat', summary: 'Repeat summary' });
    await reportOpsFailure({ area: 'test.repeat', summary: 'Repeat summary' });
    expect(sendOpsAlert).toHaveBeenCalledTimes(1);
    const logged = vi.mocked(console.error).mock.calls.filter((c) => String(c[0]).includes('test.repeat'));
    expect(logged).toHaveLength(2);
  });

  it('never throws, even when the mail provider throws', async () => {
    sendOpsAlert.mockRejectedValue(new Error('provider down'));
    await expect(reportOpsFailure({ area: 'test.throw', summary: 'Throw summary' })).resolves.toBeUndefined();
  });

  it('logs an undelivered alert so a dead mail provider is still visible', async () => {
    sendOpsAlert.mockResolvedValue({ sent: false, reason: 'error', detail: 'bad key' });
    await reportOpsFailure({ area: 'test.undelivered', summary: 'Undelivered summary' });
    expect(
      vi.mocked(console.error).mock.calls.some((c) => String(c[0]).includes('ops_alert_undelivered')),
    ).toBe(true);
  });
});

describe('reportSendFailure', () => {
  beforeEach(() => {
    sendOpsAlert.mockReset();
    sendOpsAlert.mockResolvedValue({ sent: true, id: 'x' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('does nothing when the email went', async () => {
    await reportSendFailure({ sent: true }, { area: 'send.ok', summary: 'Sent fine' });
    expect(sendOpsAlert).not.toHaveBeenCalled();
  });

  it('alerts on a provider error with its detail', async () => {
    await reportSendFailure(
      { sent: false, reason: 'error', detail: 'domain not verified' },
      { area: 'send.err', summary: 'Provider error summary' },
    );
    expect(sendOpsAlert).toHaveBeenCalledWith(expect.objectContaining({ detail: 'domain not verified' }));
  });

  it('ignores a missing key locally but alerts on it in production', async () => {
    await reportSendFailure({ sent: false, reason: 'no-api-key' }, { area: 'send.key', summary: 'Local key summary' });
    expect(sendOpsAlert).not.toHaveBeenCalled();

    vi.stubEnv('VERCEL_ENV', 'production');
    await reportSendFailure({ sent: false, reason: 'no-api-key' }, { area: 'send.key', summary: 'Prod key summary' });
    expect(sendOpsAlert).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'RESEND_API_KEY is not set in production' }),
    );
  });
});
