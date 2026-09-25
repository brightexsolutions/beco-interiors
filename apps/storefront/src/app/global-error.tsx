'use client';

import '@beco/ui/src/tokens/tokens.css';
import { useEffect } from 'react';

/**
 * The last resort, for when the ROOT LAYOUT itself throws.
 *
 * `error.tsx` renders inside the layout, so it keeps the header, the footer
 * and the fonts. This one replaces the layout entirely, which is why it has to
 * bring its own `<html>` and `<body>` and why it re-imports the tokens: none
 * of the chrome exists at this point.
 *
 * It is deliberately plain. Anything this file depends on is another thing
 * that can be broken when it is needed, so there is no header, no image, no
 * data fetch, and the one control is a full page reload rather than a router
 * action. A branded page that cannot render is worse than a plain one that can.
 */
export default function GlobalError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('storefront root error', error.digest ?? '(no digest)', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-high-vis-white font-ui text-base text-charcoal antialiased">
        <main className="mx-auto flex min-h-screen max-w-[68ch] flex-col justify-center px-6 py-24">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-8 bg-warm-red" />
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Beco Interiors
            </p>
          </div>

          <h1 className="mt-6 font-display text-5xl leading-[1.04] tracking-[-0.015em] text-charcoal">
            The site is having a moment.
          </h1>

          <p className="mt-6 text-base leading-[1.65] text-neutral-700">
            Please try again. If it keeps happening, call us on{' '}
            <a href="tel:+254722333730" className="font-semibold text-charcoal underline">
              +254 722 333 730
            </a>{' '}
            and we will sort it out over the phone.
          </p>

          <div className="mt-9">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-[2.75rem] cursor-pointer items-center justify-center rounded-[2px] bg-warm-red-deep px-6 py-3.5 font-ui text-sm font-semibold uppercase tracking-[0.09em] text-high-vis-white"
            >
              Reload the site
            </button>
          </div>

          {error.digest ? (
            <p className="mt-10 font-ui text-sm text-neutral-500">
              Reference <span className="tabular-nums text-charcoal">{error.digest}</span>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
