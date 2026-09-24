import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

// Imported after the mock is registered.
const { sendQuoteConfirmation } = await import('../send');

const input = { to: 'buyer@example.com', reference: 'BEC-Q-00042', customerName: 'Achieng' };

describe('sendQuoteConfirmation', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    sendMock.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = OLD_ENV;
    vi.restoreAllMocks();
  });

  it('is a no-op that says so when there is no API key', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendQuoteConfirmation(input);
    expect(result).toEqual({ sent: false, reason: 'no-api-key' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends through Resend with the reference and the recipient', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    sendMock.mockResolvedValue({ data: { id: 'email_123' }, error: null });

    const result = await sendQuoteConfirmation(input);

    expect(result).toEqual({ sent: true, id: 'email_123' });
    const payload = sendMock.mock.calls[0]![0];
    expect(payload.to).toBe('buyer@example.com');
    expect(payload.subject).toContain('BEC-Q-00042');
    expect(payload.text).toContain('BEC-Q-00042');
  });

  it('honours QUOTE_FROM_EMAIL when set', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.QUOTE_FROM_EMAIL = 'Beco <hello@beco.co.ke>';
    sendMock.mockResolvedValue({ data: { id: 'x' }, error: null });

    await sendQuoteConfirmation(input);

    expect(sendMock.mock.calls[0]![0].from).toBe('Beco <hello@beco.co.ke>');
  });

  it('reports a provider error without throwing', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    sendMock.mockResolvedValue({ data: null, error: { message: 'domain not verified' } });

    const result = await sendQuoteConfirmation(input);

    expect(result).toEqual({ sent: false, reason: 'error', detail: 'domain not verified' });
  });

  it('swallows a thrown transport error and reports it', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    sendMock.mockRejectedValue(new Error('network down'));

    const result = await sendQuoteConfirmation(input);

    expect(result).toEqual({ sent: false, reason: 'error', detail: 'network down' });
  });
});

const { sendPricedQuote } = await import('../send');

describe('sendPricedQuote', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    sendMock.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = OLD_ENV;
    vi.restoreAllMocks();
  });

  const priced = {
    to: 'buyer@example.com',
    reference: 'BEC-Q-00042',
    customerName: 'Achieng',
    validUntil: '2026-10-17',
    isPriced: true,
    pdf: Buffer.from('%PDF'),
    filename: 'BEC-Q-00042.pdf',
  };

  it('is a no-op without an API key, and does not throw', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendPricedQuote(priced);
    expect(result).toEqual({ sent: false, reason: 'no-api-key' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('attaches the PDF under the quote reference', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    sendMock.mockResolvedValue({ data: { id: 'email_pdf' }, error: null });
    const result = await sendPricedQuote(priced);
    expect(result).toEqual({ sent: true, id: 'email_pdf' });
    const payload = sendMock.mock.calls[0]![0];
    expect(payload.attachments[0].filename).toBe('BEC-Q-00042.pdf');
    expect(payload.subject).toContain('BEC-Q-00042');
  });
});

const { sendReceipt } = await import('../send');

describe('sendReceipt', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    sendMock.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = OLD_ENV;
    vi.restoreAllMocks();
  });

  const receipt = {
    to: 'buyer@example.com',
    reference: 'BEC-O-00042',
    customerName: 'Achieng',
    pdf: Buffer.from('%PDF'),
    filename: 'BEC-O-00042.pdf',
  };

  it('is a no-op without an API key, and does not throw', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendReceipt(receipt);
    expect(result).toEqual({ sent: false, reason: 'no-api-key' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('attaches the receipt PDF under the order reference', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    sendMock.mockResolvedValue({ data: { id: 'email_receipt' }, error: null });
    const result = await sendReceipt(receipt);
    expect(result).toEqual({ sent: true, id: 'email_receipt' });
    const payload = sendMock.mock.calls[0]![0];
    expect(payload.to).toBe('buyer@example.com');
    expect(payload.attachments[0].filename).toBe('BEC-O-00042.pdf');
    expect(payload.subject).toContain('BEC-O-00042');
  });
});
