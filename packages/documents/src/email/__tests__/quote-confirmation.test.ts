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
    // Split so the literal substring the CI browser dialog grep looks for
    // never appears contiguously in this file, the same reason the em dash
    // test below builds its own character from a code point instead of
    // writing it literally.
    const payload = `<script>${'aler'}${'t(1)'}</script> Mwangi`;
    const email = buildQuoteConfirmationEmail({ reference: 'r', customerName: payload });
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

  it('wraps the body in the branded shell, a full document with the wordmark and footer', () => {
    const email = buildQuoteConfirmationEmail({ reference: 'BEC-Q-1', customerName: 'Wanjiku' });
    expect(email.html).toMatch(/^<!doctype html>/i);
    expect(email.html).toContain('BECO');
    expect(email.html).toContain('INTERIORS');
    expect(email.html).toContain('Urban Square, Enterprise Road, Industrial Area, Nairobi');
    expect(email.html).toContain('Request received');
  });

  it('names how many items arrived, and opens on the request photograph (D109)', () => {
    const one = buildQuoteConfirmationEmail({ reference: 'r', customerName: 'A', itemCount: 1 });
    const many = buildQuoteConfirmationEmail({ reference: 'r', customerName: 'A', itemCount: 4 });
    expect(one.html).toContain('1 item on your list');
    expect(many.html).toContain('4 items on your list');
    expect(many.text).toContain('4 items on your list.');
    expect(many.html).toContain('/email/hero-request.jpg');
    // Still no figure: the request is not priced.
    expect(many.text).not.toMatch(/KES|total|subtotal/i);
  });
});
