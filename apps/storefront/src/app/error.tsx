'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { buttonClasses } from '@beco/ui';
import { SITE, whatsappLink } from '@/lib/site';

/**
 * The 500, for anything that throws inside a page.
 *
 * A visitor who hits this was part way through something, most likely pricing
 * a list, so the page's job is to keep the sale alive rather than to apologise
 * elegantly. Retry first, because a failed database read usually succeeds on
 * the second attempt, then the two channels that do not depend on this site
 * working at all.
 *
 * `reset()` genuinely re-renders the segment. It is not a decorative button,
 * which rule 3 would have refused: it is the one control here that can
 * actually fix the reader's problem.
 *
 * The quote list itself is in localStorage, so it survives this. That is worth
 * saying on the page: a specifier who has spent ten minutes adding slabs needs
 * to know they have not lost them.
 */
export default function Error({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client side so it reaches the browser console during development and
    // whatever error reporting is wired at M6. The digest is what ties this
    // to the server log entry, so it is the useful half.
    console.error('storefront error', error.digest ?? '(no digest)', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-[1380px] flex-col justify-center px-6 py-24">
      <div className="flex items-center gap-4">
        <span aria-hidden className="h-px w-8 bg-warm-red" />
        <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Something went wrong
        </p>
      </div>

      <h1 className="mt-6 max-w-[16ch] font-display text-5xl leading-[1.04] tracking-[-0.015em] text-charcoal sm:text-6xl">
        That did not load.
      </h1>

      <p className="mt-6 max-w-[54ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
        This one is ours, not yours. Try again first, because it usually works on the second
        attempt. Anything already on your quote list is still there.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className={buttonClasses({ variant: 'primary' })}
        >
          Try again
        </button>
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          data-analytics="whatsapp_click"
          className={buttonClasses({ variant: 'outline' })}
        >
          Message us on WhatsApp
        </a>
        <Link href="/shop" className={buttonClasses({ variant: 'ghost' })}>
          Back to the range
        </Link>
      </div>

      <p className="mt-10 font-ui text-sm text-neutral-500">
        Or call{' '}
        <a
          href={SITE.phoneHref}
          data-analytics="call_click"
          className="font-semibold text-charcoal underline-offset-4 hover:underline"
        >
          {SITE.phone}
        </a>
        {'. '}
        {error.digest ? (
          <>
            Quote reference <span className="tabular-nums text-charcoal">{error.digest}</span> if
            you tell us about it.
          </>
        ) : null}
      </p>
    </main>
  );
}
