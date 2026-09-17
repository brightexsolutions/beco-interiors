import { describe, expect, it } from 'vitest';
import { quoteWhatsAppLink, toWhatsAppNumber } from '../whatsapp';

describe('toWhatsAppNumber', () => {
  it('accepts the ways a Kenyan mobile is actually typed', () => {
    expect(toWhatsAppNumber('0722333730')).toBe('254722333730');
    expect(toWhatsAppNumber('+254 722 333 730')).toBe('254722333730');
    expect(toWhatsAppNumber('722333730')).toBe('254722333730');
  });

  it('rejects a landline-shaped number rather than sending WhatsApp there', () => {
    expect(toWhatsAppNumber('0201234567')).toBeNull();
  });
});

describe('quoteWhatsAppLink', () => {
  it('prefills the customer number with the reference', () => {
    const href = quoteWhatsAppLink('BEC-Q-00042', '0722333730');
    expect(href).toContain('https://wa.me/254722333730');
    expect(href).toContain(encodeURIComponent('BEC-Q-00042'));
  });

  it('falls back to Beco when the stored phone is not a mobile', () => {
    const href = quoteWhatsAppLink('BEC-Q-00042', 'not-a-phone', '254700000000');
    expect(href).toContain('https://wa.me/254700000000');
  });
});
