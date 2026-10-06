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
  reference: string;
  kind: 'quote' | 'order';
}) {
  const noun = kind === 'quote' ? 'quote' : 'order';
  const button = cn(buttonClasses({ variant: 'outline' }), 'h-11 px-2 py-0');
  return (
    <div className={cn('grid gap-2', email ? 'grid-cols-3' : 'grid-cols-2')}>
      <a href={`tel:${phone.replace(/\s+/g, '')}`} className={button}>
        Call
      </a>
      <a
        href={whatsAppChatLink(phone, `Beco ${noun} ${reference}`)}
        target="_blank"
        rel="noopener noreferrer"
        className={button}
      >
        WhatsApp
      </a>
      {email ? (
        <a href={`mailto:${email}?subject=${encodeURIComponent(`Your Beco ${noun}, ${reference}`)}`} className={button}>
          Email
        </a>
      ) : null}
    </div>
  );
}
