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

/**
 * Pages whose opening section is a full bleed dark hero, built to sit behind
 * the header. Over these the bar is transparent with light chrome until the
 * reader scrolls, then it settles to solid white with a hairline, the same as
 * on the home page. Everywhere else the bar is solid from first paint, because
 * a transparent bar over a light page shows the content through it and reads
 * as broken layout. `usePathname()` is available during SSR, so this decision
 * is made on the server and the bar never flashes from solid to transparent
 * on hydration.
 *
 * `/shop` (a deliberately slim banner, not a full hero), `/shop/<category>`,
 * `/product`, `/blog`, `/team` and `/quote` all open on a light background or
 * a short band, and are deliberately absent.
 */
const DARK_HERO_ROUTES = new Set(['/', '/gallery', '/about', '/contact']);

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const overHero = DARK_HERO_ROUTES.has(pathname);
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
          : 'border-b border-transparent bg-transparent',
      )}
    >
      {/* The scrim, per D92: a separate, taller layer behind the header's own
          80px content box rather than a flat gradient confined to it. The
          original version painted the full box a fairly uniform 75% to 55%
          charcoal and stopped dead at the header's own bottom edge, which
          against a bright stone photo read as a distinct grey bar sitting
          on the image rather than the image's own natural falloff, reported
          directly as looking like "a colored transparent background".
          A first fix extended the same darkening 200px past the header on a
          4 stop linear fade, which was still wrong: it ended at 5% opacity,
          not 0, and the last 60px dropped from 30% to 5%, a change large
          and fast enough for the eye to still read as an edge. Perceived
          brightness is closer to logarithmic than linear, so an evenly
          spaced fade looks uneven: the steps near full darkness read as
          smooth, the steps near transparent read as a visible band. This
          version tapers over 240px on an eased 7 stop curve, each step
          smaller than the last, and actually reaches 0, not a faint
          residual, so there is nothing left to seam against.

          Contrast is unchanged from D79's own tested floor: at the header's
          own bottom edge (80px of this layer's 240px), this gradient still
          holds 58% charcoal, still above the 55% minimum verified against
          the project's own contrast formula for a near white stone photo,
          the worst real case (text-neutral-200 at 4.77:1, past the 4.5 AA
          floor). Every stop from there down is decorative only: no nav text
          ever sits below the header's own box, so nothing below 80px needs
          to hold a contrast floor at all. */}
      {!scrolled && overHero ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[240px] transition-opacity duration-300 ease-brand"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(16,24,32,0.86) 0%, rgba(16,24,32,0.74) 20%, ' +
              'rgba(16,24,32,0.58) 33%, rgba(16,24,32,0.42) 50%, rgba(16,24,32,0.26) 66%, ' +
              'rgba(16,24,32,0.12) 83%, rgba(16,24,32,0) 100%)',
          }}
        />
      ) : null}

      <div className="mx-auto flex h-20 max-w-[1380px] items-center justify-between gap-6 px-8 sm:px-24 lg:px-40">
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
                  each already Shop's and Contact's own page, and lighting up
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

        {/* `gap-2`, not `gap-1`, below `sm`: reported directly as the phone
            icon, the Quote button and the hamburger trigger reading as
            touching at narrow widths. `gap-1` (4px) between three 44px
            targets, one of them a solid red button, read as crowded rather
            than deliberately tight. One 8px grid step, the base unit
            CLAUDE.md's own spacing rules already use everywhere else. */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* The business line, per D39: visible rather than merely findable.
              Icon plus number where there is room, icon alone where there is
              not, so it never wraps and never competes with the quote button
              for width. Reported directly against a screenshot at 1200px:
              `lg` (1024px) was not actually enough room, five nav items, the
              phone number and the quote button all fighting for the same
              row, and the number, the only multi-word text in that row with
              no `nowrap`, was what gave and broke onto two lines. Raised to
              `xl` (1280px), where there is genuinely space, and `nowrap`
              added as a real floor under that judgement call rather than
              trusting the breakpoint alone a second time. */}
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
            <span className="hidden whitespace-nowrap xl:inline">{SITE.phone}</span>
          </a>

          {/* One word and a basket. "Request a quote" is the page's language,
              not the chrome's: in a 80px bar beside a phone number it was the
              widest thing in the header. */}
          <Link
            href="/quote"
            aria-label="Your quote list"
            className={cn(
              buttonClasses({ variant: 'primary' }),
              // h-11 (44px) stays: CLAUDE.md's touch target floor. text-sm
              // stays too: the 14px type floor. Tighter gap and padding is
              // the lever that's actually free to move, D92.
              'h-11 min-h-0 gap-1.5 px-3 py-0 text-sm tracking-[0.08em]',
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
