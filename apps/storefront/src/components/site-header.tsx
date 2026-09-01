import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { buttonClasses, cn } from '@beco/ui';
import { QuoteCounter } from './quote-counter';

/**
 * A thin, quiet bar. Wordmark hard left, navigation as small letterspaced
 * caps, one hairline rule beneath.
 *
 * The business line is visible rather than merely findable, per D39. That is
 * placement, not hierarchy: the quote form is still the conversion being
 * optimised, but a buyer who wants to phone should never have to hunt.
 */
const NAV = [
  { href: '/shop', label: 'Shop' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-high-vis-white/95 backdrop-blur">
      <div className="mx-auto flex h-15 max-w-[1380px] items-center justify-between gap-6 px-6">
        {/* The real mark from the brand pack, not a typeset approximation.
            The supplied lockup stacks INTERIORS beneath the square, which at a
            44px header height would be about four pixels tall, so the mark
            carries the header and the word is set beside it. */}
        <Link href="/" className="flex items-center gap-3" aria-label="Beco Interiors, home">
          <Image
            src="/logo-mark.png"
            alt=""
            width={400}
            height={390}
            priority
            className="h-8 w-auto"
          />
          <span className="hidden font-ui text-sm font-semibold uppercase tracking-[0.26em] text-charcoal sm:block">
            Interiors
          </span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-4 py-2.5 font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-700 transition-colors hover:text-warm-red-deep"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <a
            href={SITE.phoneHref}
            data-analytics="call_click"
            className="hidden font-ui text-sm font-semibold text-charcoal transition-colors hover:text-warm-red-deep sm:block"
          >
            {SITE.phone}
          </a>
          <Link
            href="/quote"
            className={cn(buttonClasses({ variant: 'primary' }), 'min-h-0 h-11 py-0')}
          >
            Request a quote
            <QuoteCounter />
          </Link>
        </div>
      </div>
    </header>
  );
}
