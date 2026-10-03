import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reportOpsFailure = vi.fn(async () => {});
vi.mock('@/lib/ops-alert', () => ({ reportOpsFailure: (...a: unknown[]) => reportOpsFailure(...(a as [])) }));

const { POST } = await import('../route');
const { bearerMatches } = await import('@/lib/bearer-secret');

const request = (body: unknown, auth: string | null = 'Bearer relay-secret') =>
  new Request('http://localhost:3001/api/ops-alert', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const valid = { area: 'quote.submit', summary: 'A website quote request did not save', context: { items: 2 } };

describe('bearerMatches', () => {
  it('matches only the exact bearer header', () => {
    expect(bearerMatches('Bearer s', 's')).toBe(true);
    expect(bearerMatches('Bearer t', 's')).toBe(false);
    expect(bearerMatches('s', 's')).toBe(false);
    expect(bearerMatches('Bearer s ', 's')).toBe(false);
  });

  it('never matches when the secret is unset or the header is missing', () => {
    expect(bearerMatches('Bearer ', undefined)).toBe(false);
    expect(bearerMatches('Bearer ', '')).toBe(false);
    expect(bearerMatches(null, 's')).toBe(false);
  });
});

describe('POST /api/ops-alert', () => {
  beforeEach(() => {
    vi.stubEnv('OPS_ALERT_SECRET', 'relay-secret');
    reportOpsFailure.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('relays a valid alert as the storefront and answers 202', async () => {
    const res = await POST(request(valid));
    expect(res.status).toBe(202);
    expect(reportOpsFailure).toHaveBeenCalledWith(expect.objectContaining({ ...valid, app: 'storefront' }));
  });

  it('refuses a wrong or missing secret without reporting anything', async () => {
    expect((await POST(request(valid, 'Bearer nope'))).status).toBe(401);
    expect((await POST(request(valid, null))).status).toBe(401);
    expect(reportOpsFailure).not.toHaveBeenCalled();
  });

  it('refuses everything when the secret is not configured', async () => {
    vi.stubEnv('OPS_ALERT_SECRET', '');
    expect((await POST(request(valid, 'Bearer '))).status).toBe(401);
  });

  it('refuses malformed JSON and a body outside the schema', async () => {
    expect((await POST(request('{not json'))).status).toBe(400);
    expect((await POST(request({ area: 'Bad Area', summary: 'x' }))).status).toBe(400);
    expect((await POST(request({ ...valid, app: 'dashboard', extra: { nested: true } }))).status).toBe(202);
    // The caller cannot choose to appear as the dashboard: app is always set here.
    expect(reportOpsFailure).toHaveBeenLastCalledWith(expect.objectContaining({ app: 'storefront' }));
  });
});
