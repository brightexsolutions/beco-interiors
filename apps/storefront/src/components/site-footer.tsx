import Image from 'next/image';
import Link from 'next/link';
import { SITE, whatsappLink } from '@/lib/site';
import { buttonClasses } from '@beco/ui';

/**
 * A genuine closing section, not grey link columns and a copyright line,
 * which is what the prototype had and what Section 11 forbids.
 *
 * Top band carries a brand statement and the three conversion actions, so the
 * footer is the last chance to convert rather than a sitemap. The NAP block
 * below doubles as the local search signal, and must match the Google Business
 * Profile character for character.
 */
export function SiteFooter() {
  return (
    <footer className="mt-24 bg-charcoal text-high-vis-white">
      <div className="mx-auto max-w-[1380px] px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            {/* The full stacked lockup, in white, where there is room for it. */}
            <Image
              src="/logo-lockup-white.png"
              alt="Beco Interiors"
              width={420}
              height={506}
              className="mb-10 h-20 w-auto"
            />
            <p className="max-w-[20ch] font-display text-4xl leading-[1.1]">
              Specify it once. We hold the stock.
            </p>
            <p className="mt-6 max-w-[52ch] text-base text-neutral-300">
              Tell us what the project needs and we will price it. Most quotes come back the
              same day, and everything you see is stocked in Nairobi.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/quote"
              className={buttonClasses({ variant: 'primary' })}
            >
              Request a quote
            </Link>
            <a
              href={whatsappLink()}
              data-analytics="whatsapp_click"
              className="inline-flex min-h-11 items-center justify-center rounded-[2px] border border-neutral-700 px-6 font-ui text-sm font-semibold uppercase tracking-[0.09em] transition-colors hover:border-high-vis-white"
            >
              WhatsApp us
            </a>
            <a
              href={SITE.phoneHref}
              data-analytics="call_click"
              className="inline-flex min-h-11 items-center justify-center rounded-[2px] border border-neutral-700 px-6 font-ui text-sm font-semibold uppercase tracking-[0.09em] transition-colors hover:border-high-vis-white"
            >
              {SITE.phone}
            </a>
          </div>
        </div>

        <div className="mt-16 grid gap-10 border-t border-neutral-700 pt-10 sm:grid-cols-3">
          <div>
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Showroom
            </p>
            {/* NAP. Must match the Google Business Profile exactly. */}
            <address className="mt-3 not-italic text-base text-neutral-300">
              {SITE.address.line1}
              <br />
              {SITE.address.line2}
              <br />
              {SITE.address.city}
            </address>
            <p className="mt-3 text-base text-neutral-300">{SITE.hours}</p>
          </div>

          <div>
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Browse
            </p>
            <ul className="mt-3 space-y-2 text-base text-neutral-300">
              <li><Link href="/shop" className="hover:text-high-vis-white">All products</Link></li>
              <li><Link href="/about" className="hover:text-high-vis-white">About Beco</Link></li>
              <li><Link href="/contact" className="hover:text-high-vis-white">Contact</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Get in touch
            </p>
            <ul className="mt-3 space-y-2 text-base text-neutral-300">
              <li><a href={SITE.phoneHref} className="hover:text-high-vis-white">{SITE.phone}</a></li>
              <li><a href={`mailto:${SITE.email}`} className="hover:text-high-vis-white">{SITE.email}</a></li>
            </ul>
          </div>
        </div>

        <p className="mt-12 font-ui text-sm text-neutral-500">
          &copy; {new Date().getFullYear()} Beco Interiors Limited
        </p>
      </div>
    </footer>
  );
}
