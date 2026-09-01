import Link from 'next/link';
import { buttonClasses } from '@beco/ui';
import { SITE } from '@/lib/site';

/**
 * A 404 that routes back into the catalogue rather than apologising.
 *
 * Most 404s here will be old WordPress URLs whose redirect was missed, so the
 * useful thing to offer is the range and a phone number, not a sad face. Any
 * hit on this page is worth watching in Search Console for thirty days after
 * cutover, because a missed redirect surfaces as a 404 rather than as a
 * silent ranking loss.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-[1380px] flex-col justify-center px-6 py-24">
      <div className="flex items-center gap-4">
        <span aria-hidden className="h-px w-8 bg-warm-red" />
        <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Page not found
        </p>
      </div>
      <h1 className="mt-6 max-w-[16ch] font-display text-5xl leading-[1.04] tracking-[-0.015em] text-charcoal sm:text-6xl">
        That page is not here.
      </h1>
      <p className="mt-6 max-w-[52ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
        It may have moved when the site was rebuilt. The whole range is still here, and if you
        are looking for something specific we can find it faster than you can.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Link href="/shop" className={buttonClasses({ variant: 'primary' })}>
          Browse the range
        </Link>
        <a
          href={SITE.phoneHref}
          data-analytics="call_click"
          className={buttonClasses({ variant: 'outline' })}
        >
          Call {SITE.phone}
        </a>
      </div>
    </main>
  );
}
