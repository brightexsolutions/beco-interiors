import { buttonClasses, Reveal, cn } from '@beco/ui';
import { whatsappLink } from '@/lib/site';

export interface ServiceItem {
  title: string;
  body: string;
}

/**
 * The services grid, shared by Home and About rather than built twice.
 *
 * Same soft raised card the home page's own "Why Beco" row and About's
 * team cards already use, a short red rule standing in for an icon, on
 * direct request after the numbered `RangePillarList` treatment tried first
 * was reported back as the wrong style: this reuses a pattern already
 * proven on the page rather than a new one.
 *
 * Every card carries its own WhatsApp action, on direct request, rather
 * than one general "get in touch" for the whole section: the button names
 * the service, and the message that opens does too, so the person on the
 * other end already knows which of the four they are being asked about.
 */
export function ServiceCardGrid({
  items, className,
}: {
  items: readonly ServiceItem[];
  className?: string | undefined;
}) {
  return (
    <ul className={cn('grid gap-6 sm:grid-cols-2', className)}>
      {items.map((item, i) => (
        <Reveal key={item.title} delay={(i % 4) * 60} as="li" className="h-full">
          <div className="flex h-full flex-col bg-high-vis-white p-8 shadow-[0_1px_2px_rgba(16,24,32,0.05),0_16px_32px_-16px_rgba(16,24,32,0.12)]">
            <span aria-hidden className="block h-px w-8 bg-warm-red" />
            <h3 className="mt-5 font-display text-xl leading-tight text-charcoal">{item.title}</h3>
            <p className="mt-3 max-w-[42ch] flex-1 text-sm leading-[1.6] text-neutral-700">
              {item.body}
            </p>
            <a
              href={whatsappLink(`I would like to book a consultation on ${item.title.toLowerCase()}`)}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics="whatsapp_click"
              className={cn(buttonClasses({ variant: 'outline' }), 'mt-6 self-start')}
            >
              Book a consultation
            </a>
          </div>
        </Reveal>
      ))}
    </ul>
  );
}
