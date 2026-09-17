import { describe, expect, it } from 'vitest';
import { buildPricedQuoteEmail } from '../quote-priced';

describe('buildPricedQuoteEmail', () => {
  it('carries the reference in the subject and both bodies', () => {
    const email = buildPricedQuoteEmail({
      reference: 'BEC-Q-00042',
      customerName: 'Achieng Otieno',
      validUntil: '2026-10-17',
      isPriced: true,
    });
    expect(email.subject).toContain('BEC-Q-00042');
    expect(email.text).toContain('BEC-Q-00042');
    expect(email.html).toContain('BEC-Q-00042');
  });

  it('mentions the PDF is attached, and the validity date when priced', () => {
    const email = buildPricedQuoteEmail({
      reference: 'BEC-Q-1',
      customerName: 'Wanjiku',
      validUntil: '2026-10-17',
      isPriced: true,
    });
    expect(email.text).toMatch(/attached/i);
    expect(email.text).toContain('2026-10-17');
  });

  it('an unpriced quote never claims a total', () => {
    const email = buildPricedQuoteEmail({
      reference: 'BEC-Q-1',
      customerName: 'Wanjiku',
      validUntil: null,
      isPriced: false,
    });
    expect(email.text).toMatch(/priced on application/i);
    expect(email.text).not.toMatch(/KES|total/i);
  });

  it('escapes html in the name', () => {
    const email = buildPricedQuoteEmail({
      reference: 'r',
      customerName: '<script>alert(1)</script> Mwangi',
      validUntil: null,
      isPriced: true,
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('uses no em dashes anywhere, per rule 1', () => {
    const emDash = String.fromCharCode(0x2014);
    const email = buildPricedQuoteEmail({
      reference: 'BEC-Q-1',
      customerName: 'Wanjiku',
      validUntil: '2026-10-17',
      isPriced: true,
    });
    for (const part of [email.subject, email.text, email.html]) {
      expect(part).not.toContain(emDash);
    }
  });
});
