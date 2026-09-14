import Image from 'next/image';
import Link from 'next/link';
import { buttonClasses, cn } from '@beco/ui';
import { SITE, SOCIAL, whatsappLink } from '@/lib/site';
import { SocialLinks } from './social-links';
import { getCategoryTree } from '@/lib/products';

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
export async function SiteFooter() {
  // The six top level ranges, which is the whole business rather than a
  // truncated list of it.
  //
  // This used to take five of the fifteen flat categories, stocked ones first,
  // which meant the footer's picture of Beco changed depending on what had
  // been photographed that week and always cut off mid taxonomy. Six groups
  // fit, they are complete, and they are stable.
  const categories = await getCategoryTree();
  // Counted as RANGES, not as groups: a childless top level range still counts
  // as one, so this says fifteen rather than six.
  const rangeCount = categories.reduce((n, g) => n + Math.max(1, g.children.length), 0);

  return (
    <footer className="bg-charcoal text-high-vis-white">
      <div className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14 py-16 sm:py-22 lg:py-30">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_auto] lg:items-end lg:gap-20">
          <div>
            <Image
              src="/logo-lockup-white.png"
              alt="Beco Interiors"
              width={420}
              height={506}
              className="h-24 w-auto"
            />
            <p className="mt-8 max-w-[16ch] font-display text-4xl leading-[1.1] sm:text-5xl">
              Specify it once. We hold the stock.
            </p>
            <p className="mt-5 max-w-[50ch] text-base leading-[1.65] text-neutral-300">
              Tell us what the project needs and we will price the whole list at once.
              Everything you see is stocked in Nairobi.
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

        <div className="mt-16 grid gap-10 border-t border-neutral-700 pt-12 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
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
              Products
            </p>
            {/* Read from the database, so this column can never list a range
                that is not actually stocked. Per D27 a category with nothing
                in it does not appear here any more than it appears in the
                sitemap. */}
            <ul className="mt-4 space-y-2.5 text-base text-neutral-300">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/shop/${category.slug}`}
                    className="flex items-baseline gap-2 hover:text-high-vis-white"
                  >
                    {category.name}
                    {/* Said plainly rather than hidden. A range that is
                        genuinely coming is worth showing; implying it is
                        stocked when it is not is what loses a specifier. */}
                    {category.total_count === 0 ? (
                      <span className="font-ui text-sm text-neutral-500">soon</span>
                    ) : null}
                  </Link>
                </li>
              ))}
              <li className="pt-1">
                <Link
                  href="/shop"
                  className="font-ui text-sm font-semibold uppercase tracking-[0.12em] text-high-vis-white underline-offset-4 hover:underline"
                >
                  All {rangeCount} ranges
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Company
            </p>
            <ul className="mt-4 space-y-2.5 text-base text-neutral-300">
              <li><Link href="/about" className="hover:text-high-vis-white">About Beco</Link></li>
              <li><Link href="/contact" className="hover:text-high-vis-white">Contact and showroom</Link></li>
              <li><Link href="/quote" className="hover:text-high-vis-white">Request a quote</Link></li>
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

            {/* Rendered only where a real profile URL exists. The prototype
                shipped these as href="#", which is a control that advertises
                an operation and does not perform it. See SOCIAL in lib/site. */}
            <SocialLinks className="mt-6 flex gap-3" />
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 font-ui text-sm text-neutral-500">
          <p>&copy; {new Date().getFullYear()} Beco Interiors Limited</p>
          <p>
            Designed and built by{' '}
            <a
              href="https://www.brightexsolutions.co.ke"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-neutral-300 underline-offset-4 transition-colors hover:text-high-vis-white hover:underline"
            >
              Brightex Solutions
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
