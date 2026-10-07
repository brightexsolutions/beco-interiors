import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const { buildOpsAlertEmail, sendOpsAlert, opsAlertDelivery, DEFAULT_OPS_ALERT_EMAIL } = await import(
  '../ops-alert'
);

const alert = {
  app: 'dashboard' as const,
  area: 'quote.email',
  summary: 'Quote BEC-Q-00042 email did not send',
  detail: 'domain not verified',
  context: { reference: 'BEC-Q-00042', attempt: 1, empty: '', missing: undefined, none: null },
  occurredAt: '2026-09-28T10:00:00.000Z',
  environment: 'production',
};

describe('buildOpsAlertEmail', () => {
  it('leads with the summary and lists app, area, error and context', () => {
    const { subject, text } = buildOpsAlertEmail(alert);
    expect(subject).toBe('Beco alert: Quote BEC-Q-00042 email did not send');
    expect(text.split('\n')[0]).toBe(alert.summary);
    expect(text).toContain('Area: quote.email');
    expect(text).toContain('Error: domain not verified');
    expect(text).toContain('reference: BEC-Q-00042');
    expect(text).toContain('attempt: 1');
  });

  it('drops empty context values rather than printing blanks', () => {
    const { text } = buildOpsAlertEmail(alert);
    expect(text).not.toContain('empty:');
    expect(text).not.toContain('missing:');
    expect(text).not.toContain('none:');
  });

  it('tags a non-production environment in the subject', () => {
    expect(buildOpsAlertEmail({ ...alert, environment: 'preview' }).subject).toContain('[preview]');
  });

  it('clips a long subject', () => {
    const { subject } = buildOpsAlertEmail({ ...alert, summary: 'x'.repeat(400) });
    expect(subject.length).toBeLessThanOrEqual(140);
    expect(subject.endsWith('...')).toBe(true);
  });

  it('escapes anything that came from an error message', () => {
    const { html } = buildOpsAlertEmail({ ...alert, detail: '<script>steal()</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('says how many identical alerts were held back', () => {
    expect(buildOpsAlertEmail({ ...alert, suppressed: 4 }).text).toContain('4 more of the same');
    expect(buildOpsAlertEmail(alert).text).not.toContain('more of the same');
  });

  it('contains no em dash', () => {
    const { subject, text, html } = buildOpsAlertEmail({ ...alert, suppressed: 2 });
    expect(`${subject}${text}${html}`).not.toContain(String.fromCharCode(0x2014));
  });
});

describe('opsAlertDelivery', () => {
  it('sends only from a deployed Vercel runtime', () => {
    expect(opsAlertDelivery({ VERCEL_ENV: 'production' })).toBe('send');
    expect(opsAlertDelivery({ VERCEL_ENV: 'preview' })).toBe('send');
    expect(opsAlertDelivery({ VERCEL_ENV: 'development' })).toBe('local-only');
    expect(opsAlertDelivery({})).toBe('local-only');
  });

  it('is opted back in locally by OPS_ALERT_SEND_IN_DEV, and only by a yes', () => {
    expect(opsAlertDelivery({ OPS_ALERT_SEND_IN_DEV: '1' })).toBe('send');
    expect(opsAlertDelivery({ OPS_ALERT_SEND_IN_DEV: ' TRUE ' })).toBe('send');
    expect(opsAlertDelivery({ OPS_ALERT_SEND_IN_DEV: '0' })).toBe('local-only');
    expect(opsAlertDelivery({ OPS_ALERT_SEND_IN_DEV: '' })).toBe('local-only');
    expect(opsAlertDelivery({ VERCEL_ENV: 'development', OPS_ALERT_SEND_IN_DEV: '1' })).toBe('send');
  });
});

describe('sendOpsAlert', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.OPS_ALERT_EMAIL;
    delete process.env.OPS_ALERT_FROM_EMAIL;
    delete process.env.OPS_ALERT_SEND_IN_DEV;
    // The send path below is a deployed runtime's. The local path has its own block.
    process.env.VERCEL_ENV = 'production';
    sendMock.mockReset();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    vi.restoreAllMocks();
  });

  it('sends from preview as well as production', async () => {
    process.env.RESEND_API_KEY = 'k';
    process.env.VERCEL_ENV = 'preview';
    sendMock.mockResolvedValue({ data: { id: 'p1' }, error: null });
    expect(await sendOpsAlert(alert)).toEqual({ sent: true, id: 'p1' });
  });

  describe('outside a deployed runtime', () => {
    it('logs and sends nothing under next dev, even with a key', async () => {
      process.env.RESEND_API_KEY = 'k';
      delete process.env.VERCEL_ENV;
      vi.stubEnv('NODE_ENV', 'development');
      const info = vi.spyOn(console, 'info').mockImplementation(() => {});
      expect(await sendOpsAlert({ ...alert, environment: 'development' })).toEqual({
        sent: false,
        reason: 'local-only',
      });
      expect(sendMock).not.toHaveBeenCalled();
      const line = JSON.parse(String(info.mock.calls[0]![0]));
      expect(line.event).toBe('ops_alert_local_only');
      expect(line.subject).toContain('Quote BEC-Q-00042 email did not send');
      expect(line.note).toContain('OPS_ALERT_SEND_IN_DEV=1');
      vi.unstubAllEnvs();
    });

    it('sends nothing from a local next start, where NODE_ENV is production', async () => {
      process.env.RESEND_API_KEY = 'k';
      delete process.env.VERCEL_ENV;
      vi.stubEnv('NODE_ENV', 'production');
      vi.spyOn(console, 'info').mockImplementation(() => {});
      expect(await sendOpsAlert(alert)).toEqual({ sent: false, reason: 'local-only' });
      expect(sendMock).not.toHaveBeenCalled();
      vi.unstubAllEnvs();
    });

    it('sends nothing from vercel dev', async () => {
      process.env.RESEND_API_KEY = 'k';
      process.env.VERCEL_ENV = 'development';
      vi.spyOn(console, 'info').mockImplementation(() => {});
      expect(await sendOpsAlert(alert)).toEqual({ sent: false, reason: 'local-only' });
      expect(sendMock).not.toHaveBeenCalled();
    });

    it('sends for real with OPS_ALERT_SEND_IN_DEV=1', async () => {
      process.env.RESEND_API_KEY = 'k';
      delete process.env.VERCEL_ENV;
      process.env.OPS_ALERT_SEND_IN_DEV = '1';
      sendMock.mockResolvedValue({ data: { id: 'd1' }, error: null });
      expect(await sendOpsAlert({ ...alert, environment: 'development' })).toEqual({ sent: true, id: 'd1' });
      expect(sendMock.mock.calls[0]![0].subject).toContain('[development]');
    });
  });

  it('is a no-op without an API key', async () => {
    delete process.env.RESEND_API_KEY;
    expect(await sendOpsAlert(alert)).toEqual({ sent: false, reason: 'no-api-key' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('goes to the Brightex address by default', async () => {
    process.env.RESEND_API_KEY = 'k';
    sendMock.mockResolvedValue({ data: { id: 'a1' }, error: null });
    expect(await sendOpsAlert(alert)).toEqual({ sent: true, id: 'a1' });
    expect(DEFAULT_OPS_ALERT_EMAIL).toBe('info.brightexsolutions@gmail.com');
    expect(sendMock.mock.calls[0]![0].to).toEqual(['info.brightexsolutions@gmail.com']);
  });

  it('honours a comma separated OPS_ALERT_EMAIL list', async () => {
    process.env.RESEND_API_KEY = 'k';
    process.env.OPS_ALERT_EMAIL = 'a@example.com, b@example.com';
    sendMock.mockResolvedValue({ data: { id: 'a2' }, error: null });
    await sendOpsAlert(alert);
    expect(sendMock.mock.calls[0]![0].to).toEqual(['a@example.com', 'b@example.com']);
  });

  it('reports a provider error and a thrown transport error without throwing', async () => {
    process.env.RESEND_API_KEY = 'k';
    sendMock.mockResolvedValueOnce({ data: null, error: { message: 'rate limited' } });
    expect(await sendOpsAlert(alert)).toEqual({ sent: false, reason: 'error', detail: 'rate limited' });
    sendMock.mockRejectedValueOnce(new Error('network down'));
    expect(await sendOpsAlert(alert)).toEqual({ sent: false, reason: 'error', detail: 'network down' });
  });
});
