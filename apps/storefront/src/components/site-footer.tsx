import Image from 'next/image';
import Link from 'next/link';
import { buttonClasses, cn } from '@beco/ui';
import { SITE, whatsappLink } from '@/lib/site';

/**
 * A genuine closing section, not grey link columns and a copyright line,
 * which is what the prototype had and what Section 11 forbids.
 *
 * The top band is the last chance to convert, so it carries a statement and
 * the three actions ranked exactly as they are everywhere else per D26. The
 * NAP block below doubles as the local search signal and must match the
 * Google Business Profile character for character.
 *
 * Warm Red appears once here, on the primary action.
 */
export function SiteFooter() {
  return (
    <footer className="bg-charcoal text-high-vis-white">
      <div className="mx-auto max-w-[1380px] px-6 py-16 sm:py-22 lg:py-30">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_auto] lg:items-end lg:gap-20">
          <div>
            <Image
              src="/logo-lockup-white.png"
              alt="Beco Interiors"
              width={420}
              height={506}
              className="h-14 w-auto"
            />
            <p className="mt-8 max-w-[16ch] font-display text-4xl leading-[1.1] sm:text-5xl">
              Specify it once. We hold the stock.
            </p>
            <p className="mt-5 max-w-[50ch] text-base leading-[1.65] text-neutral-300">
              Tell us what the project needs and we will price it. Most quotes come back the
              same day, and everything you see is stocked in Nairobi.
            </p>
          </div>

          {/* Quote dominant, the other two equal and secondary beneath it, so
              the hierarchy is visible rather than three identical boxes. */}
          <div className="lg:w-[22rem]">
            <Link
              href="/quote"
              className={cn(buttonClasses({ variant: 'primary' }), 'w-full')}
            >
              Request a quote
            </Link>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <a
                href={whatsappLink()}
                data-analytics="whatsapp_click"
                className="inline-flex min-h-11 items-center justify-center rounded-[2px] border border-neutral-700 px-4 font-ui text-sm font-semibold uppercase tracking-[0.09em] transition-colors hover:border-high-vis-white"
              >
                WhatsApp
              </a>
              <a
                href={SITE.phoneHref}
                data-analytics="call_click"
                className="inline-flex min-h-11 items-center justify-center rounded-[2px] border border-neutral-700 px-4 font-ui text-sm font-semibold uppercase tracking-[0.09em] transition-colors hover:border-high-vis-white"
              >
                Call us
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-10 border-t border-neutral-700 pt-10 sm:grid-cols-3 lg:mt-20">
          <div>
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Showroom
            </p>
            {/* NAP. Must match the Google Business Profile exactly. */}
            <address className="mt-4 not-italic text-base leading-[1.7] text-neutral-300">
              {SITE.address.line1}
              <br />
              {SITE.address.line2}
              <br />
              {SITE.address.city}
              <br />
              <span className="text-neutral-500">{SITE.hours}</span>
            </address>
          </div>

          <div>
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Browse
            </p>
            <ul className="mt-4 space-y-2.5 text-base text-neutral-300">
              <li><Link href="/shop" className="hover:text-high-vis-white">All products</Link></li>
              <li><Link href="/about" className="hover:text-high-vis-white">About Beco</Link></li>
              <li><Link href="/contact" className="hover:text-high-vis-white">Contact</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Get in touch
            </p>
            <ul className="mt-4 space-y-2.5 text-base text-neutral-300">
              <li>
                <a href={SITE.phoneHref} data-analytics="call_click" className="hover:text-high-vis-white">
                  {SITE.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`} className="hover:text-high-vis-white">
                  {SITE.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-14 font-ui text-sm text-neutral-500">
          &copy; {new Date().getFullYear()} Beco Interiors Limited
        </p>
      </div>
    </footer>
  );
}
