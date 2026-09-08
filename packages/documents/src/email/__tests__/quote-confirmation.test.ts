import { describe, expect, it } from 'vitest';
import { buildQuoteConfirmationEmail } from '../quote-confirmation';

describe('buildQuoteConfirmationEmail', () => {
  it('carries the reference in the subject and both bodies', () => {
    const email = buildQuoteConfirmationEmail({ reference: 'BEC-Q-00042', customerName: 'Achieng Otieno' });
    expect(email.subject).toContain('BEC-Q-00042');
    expect(email.text).toContain('BEC-Q-00042');
    expect(email.html).toContain('BEC-Q-00042');
  });

  it('greets by first name, and falls back when the name is blank', () => {
    expect(buildQuoteConfirmationEmail({ reference: 'r', customerName: 'Achieng Otieno' }).text)
      .toContain('Hi Achieng,');
    expect(buildQuoteConfirmationEmail({ reference: 'r', customerName: '   ' }).text)
      .toContain('Hi there,');
  });

  it('does not list items or a total, since the quote is not priced yet', () => {
    const email = buildQuoteConfirmationEmail({ reference: 'r', customerName: 'A' });
    expect(email.text).not.toMatch(/KES|total|subtotal/i);
  });

  it('escapes html in the name so it cannot inject markup', () => {
    const email = buildQuoteConfirmationEmail({
      reference: 'r', customerName: '<script>alert(1)</script> Mwangi',
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('uses no em dashes anywhere, per rule 1', () => {
    // Built from the code point so this file itself carries no literal em
    // dash for the repo-wide grep in ci.yml to trip on.
    const emDash = String.fromCharCode(0x2014);
    const email = buildQuoteConfirmationEmail({ reference: 'BEC-Q-1', customerName: 'Wanjiku' });
    for (const part of [email.subject, email.text, email.html]) {
      expect(part).not.toContain(emDash);
    }
  });
});
