'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buttonClasses, cn } from '@beco/ui';
import { NavDropdown, type NavItem } from './nav-dropdown';
import { QuoteCounter } from './quote-counter';
import { SITE } from '@/lib/site';

/**
 * A thin, quiet bar. Wordmark hard left, navigation as small letterspaced
 * caps, one hairline rule beneath once there is something to divide.
 *
 * It starts transparent over the top of the page and settles into an opaque
 * bar on scroll, so the first screen belongs to the hero rather than to the
 * chrome. Solid with a hairline rather than frosted glass: against a near
 * monochrome palette a sharp edge reads more deliberate than a blur.
 *
 * The business line is visible rather than merely findable, per D39. That is
 * placement, not hierarchy: the quote form is still the conversion being
 * optimised, but a buyer who wants to phone should never have to hunt.
 */
/**
 * About carries a menu rather than a single page, because the story a
 * specifier wants is spread across three: who Beco are, what they have
 * actually installed, and where to come and see it.
 *
 * Every destination here exists. A menu item pointing at a page that is not
 * built is a control that advertises an operation and does not perform it.
 */
const ABOUT: NavItem[] = [
  { href: '/about', label: 'About Beco', description: 'Who we are and what we stock' },
  { href: '/gallery', label: 'Projects', description: 'Real interiors, photographed on site' },
  { href: '/contact', label: 'The showroom', description: 'Urban Square, Industrial Area' },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  // Transparent belongs to the HOME hero and nowhere else. Every other page
  // starts with content directly beneath the bar, so a transparent header let
  // a product gallery show through it and read as broken layout.
  const overHero = usePathname() === '/';

  useEffect(() => {
    // Passive, and it only ever flips a boolean, so it cannot become a
    // scroll handler that costs INP.
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled ? '' : undefined}
      className={cn(
        'sticky top-0 z-50 transition-colors duration-300 ease-brand',
        scrolled || !overHero
          ? 'border-b border-neutral-200 bg-high-vis-white'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-20 max-w-[1380px] items-center justify-between gap-6 px-6">
        {/* The real mark from the brand pack, not a typeset approximation.
            The supplied lockup stacks INTERIORS beneath the square, which at
            this header height would be about four pixels tall, so the mark
            carries the header and the word is set beside it. */}
        <Link href="/" className="flex items-center gap-3" aria-label="Beco Interiors, home">
          <Image
            src="/logo-mark.png"
            alt=""
            width={400}
            height={390}
            priority
            className="h-9 w-auto"
          />
          <span className="hidden font-ui text-sm font-semibold uppercase tracking-[0.26em] text-charcoal sm:block">
            Interiors
          </span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            <li>
              <Link
                href="/shop"
                className="block px-4 py-2 font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-700 transition-colors hover:text-warm-red-deep"
              >
                Shop
              </Link>
            </li>
            <li>
              <NavDropdown label="About" items={ABOUT} />
            </li>
            <li>
              <Link
                href="/contact"
                className="block px-4 py-2 font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-700 transition-colors hover:text-warm-red-deep"
              >
                Contact
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-5">
          <a
            href={SITE.phoneHref}
            data-analytics="call_click"
            className="hidden font-ui text-sm font-semibold text-charcoal transition-colors hover:text-warm-red-deep sm:block"
          >
            {SITE.phone}
          </a>
          <Link
            href="/quote"
            className={cn(
              buttonClasses({ variant: 'primary' }),
              // Smaller than the page's primary buttons: in a 56px bar the
              // full size control dominates the chrome. Still 44px tall, so
              // the touch target rule holds.
              'h-11 min-h-0 px-5 py-0 text-sm tracking-[0.08em]',
            )}
          >
            Request a quote
            <QuoteCounter />
          </Link>
        </div>
      </div>
    </header>
  );
}
