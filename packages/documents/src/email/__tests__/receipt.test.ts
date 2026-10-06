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
    const payload = `<script>${'aler'}${'t(1)'}</script> Mwangi`;
    const email = buildReceiptEmail({
      reference: 'r',
      customerName: payload,
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

  it('wraps the body in the branded shell', () => {
    const email = buildReceiptEmail({ reference: 'BEC-O-1', customerName: 'Wanjiku' });
    expect(email.html).toMatch(/^<!doctype html>/i);
    expect(email.html).toContain('Payment received');
    expect(email.html).toContain('Urban Square, Enterprise Road, Industrial Area, Nairobi');
  });

  it('sets the amount paid large with the date and the lines when given (D109)', () => {
    const email = buildReceiptEmail({
      reference: 'BEC-O-3',
      customerName: 'Achieng',
      amountPaid: 145000,
      paidOn: '3 October 2026',
      lines: [{ description: 'Calacatta Gold 12mm', quantity: 2, unit: 'slab', lineTotal: 130000 }],
    });
    expect(email.html).toContain('Amount paid, VAT inclusive');
    expect(email.html).toContain('KES 145,000');
    expect(email.html).toContain('3 October 2026');
    expect(email.html).toContain('Calacatta Gold 12mm');
    expect(email.text).toContain('Amount paid, VAT inclusive: KES 145,000');
    expect(email.text).toContain('Paid on: 3 October 2026');
    expect(email.html).toContain('/email/hero-receipt.jpg');
  });

  it('prints no figure when the amount is unknown', () => {
    const email = buildReceiptEmail({ reference: 'BEC-O-4', customerName: 'A' });
    expect(email.html).not.toContain('Amount paid');
    expect(email.text).not.toMatch(/KES\s*[\d,]/);
  });
});
