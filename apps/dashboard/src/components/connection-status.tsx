'use client';

import { useEffect, useState } from 'react';
import { Icon, toast } from '@beco/ui';

/**
 * Says so when the connection is gone, D141. A save that silently never
 * arrives, on a phone at the counter, is the worst way to learn the signal
 * dropped. The bar sits at the top of the screen, announces itself, and
 * goes when the connection is back, with a toast that says it is.
 *
 * `navigator.onLine` is the browser's own answer and is only sure about
 * being offline: a connection it believes is up may still fail, which is
 * what the retry on the upload path and the Failed toasts are for.
 */
export function ConnectionStatus() {
  // Null until mounted, so the server and the first paint agree.
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const wentOffline = () => setOnline(false);
    const cameBack = () => {
      setOnline((was) => {
        if (was === false) toast.success('Back online. You can carry on.');
        return true;
      });
    };
    window.addEventListener('offline', wentOffline);
    window.addEventListener('online', cameBack);
    return () => {
      window.removeEventListener('offline', wentOffline);
      window.removeEventListener('online', cameBack);
    };
  }, []);

  if (online !== false) return null;
  return (
    <div
      role="status"
      aria-live="assertive"
      data-offline
      className="sticky top-0 z-[60] flex min-h-11 items-center justify-center gap-2 bg-charcoal px-4 py-2 text-center font-ui text-sm font-semibold text-high-vis-white"
    >
      <Icon name="offline" className="h-[1.15rem] w-[1.15rem] shrink-0" />
      <span>You are offline. Nothing will save until the connection is back.</span>
    </div>
  );
}
