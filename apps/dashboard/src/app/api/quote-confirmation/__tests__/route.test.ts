import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendQuoteConfirmation = vi.fn();
vi.mock('@beco/documents', () => ({
  sendQuoteConfirmation: (...a: unknown[]) => sendQuoteConfirmation(...(a as [])),
}));
const reportOpsFailure = vi.fn(async () => {});
vi.mock('@/lib/ops-alert', () => ({ reportOpsFailure: (...a: unknown[]) => reportOpsFailure(...(a as [])) }));

const { POST } = await import('../route');

const request = (body: unknown, auth: string | null = 'Bearer relay-secret') =>
  new Request('http://localhost:3001/api/quote-confirmation', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const valid = { reference: 'BEC-Q-00042', customerName: 'Achieng Otieno', to: 'achieng@example.com', itemCount: 3 };

beforeEach(() => {
  vi.stubEnv('OPS_ALERT_SECRET', 'relay-secret');
  sendQuoteConfirmation.mockReset().mockResolvedValue({ sent: true, id: 'email_1' });
  reportOpsFailure.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/quote-confirmation', () => {
  it('sends the confirmation to the customer and answers 202', async () => {
    const res = await POST(request(valid));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ sent: true });
    expect(sendQuoteConfirmation).toHaveBeenCalledWith(valid);
  });

  it('refuses a wrong, missing or unconfigured secret without sending', async () => {
    expect((await POST(request(valid, 'Bearer nope'))).status).toBe(401);
    expect((await POST(request(valid, null))).status).toBe(401);
    vi.stubEnv('OPS_ALERT_SECRET', '');
    expect((await POST(request(valid, 'Bearer '))).status).toBe(401);
    expect(sendQuoteConfirmation).not.toHaveBeenCalled();
  });

  it('refuses malformed JSON, a bad address and a reference that is not one', async () => {
    expect((await POST(request('{not json'))).status).toBe(400);
    expect((await POST(request({ ...valid, to: 'not-an-email' }))).status).toBe(400);
    expect((await POST(request({ ...valid, reference: '<script>' }))).status).toBe(400);
    expect(sendQuoteConfirmation).not.toHaveBeenCalled();
  });

  it('is a quiet 202 when email is not configured, so a local stack does not alarm anyone', async () => {
    sendQuoteConfirmation.mockResolvedValue({ sent: false, reason: 'no-api-key' });
    const res = await POST(request(valid));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ sent: false, reason: 'no-api-key' });
    expect(reportOpsFailure).not.toHaveBeenCalled();
  });

  it('raises an operational alert and answers 502 when the provider fails', async () => {
    sendQuoteConfirmation.mockResolvedValue({ sent: false, reason: 'error', detail: 'domain not verified' });
    const res = await POST(request(valid));
    expect(res.status).toBe(502);
    expect(reportOpsFailure).toHaveBeenCalledWith(
      expect.objectContaining({ area: 'quote.confirmation', detail: 'domain not verified' }),
    );
  });
});
