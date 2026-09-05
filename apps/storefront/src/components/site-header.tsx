'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buttonClasses, cn } from '@beco/ui';
import { MobileMenu } from './mobile-menu';
import { NavDropdown, type NavItem } from './nav-dropdown';
import { NavLink } from './nav-link';
import { QuoteCounter } from './quote-counter';
import { isNavItemActive } from '@/lib/nav';
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
  {
    href: '/shop/12mm-sintered-stones',
    label: 'Sintered stone',
    description: 'What the material is and where it works',
  },
  { href: '/contact', label: 'The showroom', description: 'Urban Square, Industrial Area' },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  // Transparent belongs only to a page whose own opening is a full bleed
  // dark section built to sit behind it, per D79: home's photograph, and
  // the gallery's own opening film, added on request. Every other page
  // starts with content directly beneath the bar, so a transparent header
  // let a product listing show through it and read as broken layout.
  const overHero = pathname === '/' || pathname === '/gallery';
  // The transparent state now sits over a full bleed dark photograph, per
  // D79, rather than the page's own light background, so it needs light
  // chrome to stay legible: the wordmark, the nav and the phone line all
  // read this rather than each recomputing overHero && !scrolled.
  const light = overHero && !scrolled;

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
          : // The hero's own gradient is tuned for the type block on the
            // LEFT of the photo, not the header, which spans the full
            // width above it. Wherever the header happens to sit over a
            // bright patch of whichever stone is currently showing, that
            // gradient can leave nav text with nowhere near enough
            // contrast. The header needs its own guaranteed scrim rather
            // than trusting content behind it it does not control.
            //
            // Never fades below 55% at its weakest point (the bottom
            // edge, right where the nav sits): verified against the
            // project's own contrast formula for a near white stone photo
            // behind it, the worst real case, which still holds text-
            // neutral-200 at 4.77:1, past the 4.5 AA floor. The earlier
            // fade to fully transparent measured 3.02:1 in that same
            // scenario, a real failure a lighter application photo would
            // have exposed the first time one rotated into view.
            'border-b border-transparent bg-gradient-to-b from-charcoal/75 to-charcoal/55',
      )}
    >
      <div className="mx-auto flex h-20 max-w-[1380px] items-center justify-between gap-6 px-6">
        {/* The real mark from the brand pack, not a typeset approximation.
            The supplied lockup stacks INTERIORS beneath the square, which at
            this header height would be about four pixels tall, so the mark
            carries the header and the word is set beside it. */}
        <Link href="/" className="flex items-center gap-3" aria-label="Beco Interiors, home">
          <Image
            src={light ? '/logo-mark-white.png' : '/logo-mark.png'}
            alt=""
            width={400}
            height={390}
            priority
            className="h-9 w-auto"
          />
          <span
            className={cn(
              'hidden font-ui text-sm font-semibold uppercase tracking-[0.26em] sm:block',
              light ? 'text-high-vis-white' : 'text-charcoal',
            )}
          >
            Interiors
          </span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            <li>
              <NavLink href="/shop" light={light}>Shop</NavLink>
            </li>
            <li>
              {/* Projects is top level rather than buried in the menu: real
                  installations are the strongest trust content on the site
                  and the thing a specifier looks for first. */}
              <NavLink href="/gallery" light={light}>Projects</NavLink>
            </li>
            <li>
              <NavLink href="/blog" light={light}>Blog</NavLink>
            </li>
            <li>
              {/* About's own active state is /about alone, not derived from
                  every item it links to: Sintered stone and The showroom are
                  each already Shop's and Contact's own page, and lighting
                  About too would put two "you are here" claims on the bar
                  for the same route. */}
              <NavDropdown
                label="About" items={ABOUT} light={light}
                active={isNavItemActive(pathname, '/about')}
              />
            </li>
            <li>
              <NavLink href="/contact" light={light}>Contact</NavLink>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          {/* The business line, per D39: visible rather than merely findable.
              Icon plus number where there is room, icon alone where there is
              not, so it never wraps and never competes with the quote button
              for width. */}
          <a
            href={SITE.phoneHref}
            data-analytics="call_click"
            aria-label={`Call Beco on ${SITE.phone}`}
            className={cn(
              'flex min-h-11 items-center gap-2 px-2 font-ui text-sm font-semibold transition-colors hover:text-warm-red-deep',
              light ? 'text-high-vis-white' : 'text-charcoal',
            )}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current">
              <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z" />
            </svg>
            <span className="hidden lg:inline">{SITE.phone}</span>
          </a>

          {/* One word and a basket. "Request a quote" is the page's language,
              not the chrome's: in a 80px bar beside a phone number it was the
              widest thing in the header. */}
          <Link
            href="/quote"
            aria-label="Your quote list"
            className={cn(
              buttonClasses({ variant: 'primary' }),
              'h-11 min-h-0 gap-2 px-4 py-0 text-sm tracking-[0.08em]',
            )}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current" strokeWidth="1.7">
              <path d="M3 5h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.2L20 8H6.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9.5" cy="20" r="1.3" />
              <circle cx="17" cy="20" r="1.3" />
            </svg>
            Quote
            <QuoteCounter />
          </Link>
          <MobileMenu light={light} />
        </div>
      </div>
    </header>
  );
}
