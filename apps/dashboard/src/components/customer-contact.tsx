import { buttonClasses, cn } from '@beco/ui';
import { whatsAppChatLink } from '@/lib/whatsapp';

/**
 * One tap to the customer: call, WhatsApp prefilled with the reference, and
 * email when there is an address. The counter's most common next move after
 * opening a quote or an order, so it sits with the customer's details.
 */
export function CustomerContact({
  phone,
  email,
  reference,
  kind,
}: {
  phone: string;
  email: string | null;
  /** The quote or order reference; on a customer's own page, their name. */
  reference: string;
  kind: 'quote' | 'order' | 'customer';
}) {
  const noun = kind === 'quote' ? 'quote' : 'order';
  const firstName = reference.trim().split(/\s+/)[0] ?? '';
  const whatsAppText = kind === 'customer' ? `Hi ${firstName}, this is Beco Interiors.` : `Beco ${noun} ${reference}`;
  const emailSubject = kind === 'customer' ? 'Beco Interiors' : `Your Beco ${noun}, ${reference}`;
  // Equal thirds squeezed WHATSAPP past its own border in the narrow side
  // column: uppercase at the button's 0.09em tracking is wider than a third
  // of ~300px. Each button now grows to share the row but never shrinks
  // below its label (min-w-fit, whitespace-nowrap from buttonClasses), and
  // the row wraps rather than squeezing, so Email drops to a line of its
  // own when three will not fit. Tighter tracking and padding keep three
  // on one line wherever they can.
  const button = cn(
    buttonClasses({ variant: 'outline' }),
    'h-11 min-w-fit flex-1 whitespace-nowrap px-3 py-0 tracking-[0.04em]',
  );
  return (
    <div role="group" aria-label="Contact the customer" className="flex flex-wrap gap-2">
      <a href={`tel:${phone.replace(/\s+/g, '')}`} className={button}>
        Call
      </a>
      <a
        href={whatsAppChatLink(phone, whatsAppText)}
        target="_blank"
        rel="noopener noreferrer"
        className={button}
      >
        WhatsApp
      </a>
      {email ? (
        <a href={`mailto:${email}?subject=${encodeURIComponent(emailSubject)}`} className={button}>
          Email
        </a>
      ) : null}
    </div>
  );
}
