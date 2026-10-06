const DEFAULT_WHATSAPP = '254722333730';

/** Kenyan mobiles to the 2547... form WhatsApp expects. */
export const toWhatsAppNumber = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, '');
  if (/^254(7|1)\d{8}$/.test(digits)) return digits;
  if (/^0(7|1)\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^(7|1)\d{8}$/.test(digits)) return `254${digits}`;
  return null;
};

/**
 * Prefill a WhatsApp chat with the quote reference. Prefers the customer
 * phone so a salesperson at the counter can send it in one tap. Falls back
 * to Beco's own number as a draft if the stored phone is not a mobile.
 */
export const whatsAppChatLink = (customerPhone: string, text: string, becoWhatsApp = DEFAULT_WHATSAPP): string => {
  const target = toWhatsAppNumber(customerPhone) ?? toWhatsAppNumber(becoWhatsApp) ?? DEFAULT_WHATSAPP;
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
};

export const quoteWhatsAppLink = (
  reference: string,
  customerPhone: string,
  becoWhatsApp = DEFAULT_WHATSAPP,
): string => whatsAppChatLink(customerPhone, `Beco quote ${reference}`, becoWhatsApp);

/**
 * Sending a quote or receipt PDF over WhatsApp from the document panels.
 * Archived on 6 October 2026 at Brown's request: documents go by email or
 * download. Off, not deleted: `WhatsAppShare`, its actions and its tests stay,
 * so turning this back on restores the button in both panels. The WhatsApp
 * chat link on a customer's contact row is a separate feature and stays.
 */
export const SHARE_DOCUMENTS_ON_WHATSAPP = false;

