'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ErrorState, buttonClasses } from '@beco/ui';

/**
 * Anything that throws inside a signed-in screen lands here, inside the
 * shell, so the nav stays and the person can move on. Unsaved line edits on
 * a quote are lost, but every saved change is already in the database, and
 * the copy says so rather than leaving someone to guess.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('dashboard error', error.digest ?? '(no digest)', error);
  }, [error]);

  return (
    <ErrorState
      title="This screen did not load"
      description={
        <>
          Anything you already saved is safe. Try again, it usually works the second time.
          {error.digest ? (
            <>
              {' '}
              Reference <span className="tabular-nums text-charcoal">{error.digest}</span>.
            </>
          ) : null}
        </>
      }
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className={buttonClasses({ variant: 'primary' })}>
            Try again
          </button>
          <Link href="/" className={buttonClasses({ variant: 'outline' })}>
            Go to home
          </Link>
        </div>
      }
    />
  );
}
