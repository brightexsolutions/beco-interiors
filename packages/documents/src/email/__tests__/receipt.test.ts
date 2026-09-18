import { describe, expect, it } from 'vitest';
import { buildReceiptEmail } from '../receipt';

describe('buildReceiptEmail', () => {
  it('carries the order reference in the subject and both bodies', () => {
    const email = buildReceiptEmail({
      reference: 'BEC-O-00042',
      customerName: 'Achieng Otieno',
    });
    expect(email.subject).toContain('BEC-O-00042');
    expect(email.text).toContain('BEC-O-00042');
    expect(email.html).toContain('BEC-O-00042');
  });

  it('says the receipt is attached and that payment is recorded', () => {
    const email = buildReceiptEmail({ reference: 'BEC-O-1', customerName: 'Wanjiku' });
    expect(email.text).toMatch(/receipt is attached/i);
    expect(email.text).toMatch(/payment/i);
  });

  it('escapes html in the name', () => {
    const email = buildReceiptEmail({
      reference: 'r',
      customerName: '<script>alert(1)</script> Mwangi',
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('uses no em dashes anywhere, per rule 1', () => {
    const emDash = String.fromCharCode(0x2014);
    const email = buildReceiptEmail({ reference: 'BEC-O-1', customerName: 'Wanjiku' });
    for (const part of [email.subject, email.text, email.html]) {
      expect(part).not.toContain(emDash);
    }
  });
});
