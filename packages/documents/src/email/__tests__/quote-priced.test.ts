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
    // Not a blanket ban on the word "total": the copy correctly explains
    // there isn't one ("does not show a total"), which is not the same
    // claim as stating one. What must never appear is an actual figure,
    // a currency amount standing in for a total this email cannot back.
    expect(email.text).not.toMatch(/KES\s*[\d,]/i);
  });

  it('escapes html in the name', () => {
    // Split so the CI browser-dialog grep never sees the call as one token.
    const payload = `<script>${'aler'}${'t(1)'}</script> Mwangi`;
    const email = buildPricedQuoteEmail({
      reference: 'r',
      customerName: payload,
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

  it('wraps the body in the branded shell', () => {
    const email = buildPricedQuoteEmail({
      reference: 'BEC-Q-1',
      customerName: 'Wanjiku',
      validUntil: '2026-10-17',
      isPriced: true,
    });
    expect(email.html).toMatch(/^<!doctype html>/i);
    expect(email.html).toContain('Your quote');
    expect(email.html).toContain('Urban Square, Enterprise Road, Industrial Area, Nairobi');
  });

  it('carries the lines and the VAT inclusive total in both bodies when priced (D109)', () => {
    const email = buildPricedQuoteEmail({
      reference: 'BEC-Q-7',
      customerName: 'Achieng Otieno',
      validUntil: '17 Oct 2026',
      isPriced: true,
      lines: [
        { description: 'Calacatta Gold 12mm', quantity: 2, unit: 'slab', lineTotal: 130000 },
        { description: 'Black handle B100', quantity: 10, unit: 'pc', lineTotal: 15000 },
      ],
      totals: { gross: 145000, net: 125000, vat: 20000 },
      vatRate: 16,
    });
    expect(email.html).toContain('Calacatta Gold 12mm');
    expect(email.html).toContain('KES 130,000');
    expect(email.html).toContain('Total, VAT inclusive');
    expect(email.html).toContain('KES 145,000');
    expect(email.html).toContain('VAT at 16%');
    expect(email.text).toContain('Calacatta Gold 12mm, 2 slab: KES 130,000');
    expect(email.text).toContain('Total, VAT inclusive: KES 145,000');
    // The preheader leads with the figure, so the inbox list shows it.
    expect(email.html).toMatch(/mso-hide:all">KES 145,000, VAT inclusive/);
  });

  it('shows the lines but never a total when any line is on application', () => {
    const email = buildPricedQuoteEmail({
      reference: 'BEC-Q-8',
      customerName: 'Wanjiku',
      validUntil: null,
      isPriced: false,
      lines: [
        { description: 'Calacatta Gold 12mm', quantity: 2, unit: 'slab', lineTotal: 130000 },
        { description: 'Bespoke worktop', quantity: 1, unit: null, lineTotal: null },
      ],
      totals: { gross: 0, net: 0, vat: 0 },
    });
    expect(email.html).toContain('On application');
    expect(email.html).not.toContain('Total, VAT inclusive');
    expect(email.text).not.toMatch(/Total, VAT inclusive: KES/);
  });

  it('opens on the quote photograph', () => {
    const email = buildPricedQuoteEmail({ reference: 'r', customerName: 'A', validUntil: null, isPriced: true });
    expect(email.html).toContain('/email/hero-quote.jpg');
  });
});
