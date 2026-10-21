'use client';

import { useOptimistic } from 'react';

/**
 * The open state of a sheet that lives in the URL, shown closed the instant
 * it is asked to close. D157.
 *
 * Every detail sheet in the dashboard opens from a query parameter and the
 * page renders it from that on the server, so Close, the backdrop and
 * Escape all start a navigation that drops the parameter. Until the server
 * render without it arrives, the sheet stayed exactly where it was: from
 * the counter in Nairobi to the function in Dublin that read as a Close
 * button that does nothing, then a sheet that vanishes on its own a moment
 * later. This is `useOptimistic` on the open flag: `dismiss` must run inside
 * the same transition as the navigation, the sheet is gone on that render,
 * and the flag settles to the URL when the navigation lands. If it fails the
 * sheet comes back, which is the truth.
 */
export function useSheetOpen(open: boolean): [shown: boolean, dismiss: () => void] {
  const [shown, dismiss] = useOptimistic<boolean, void>(open, () => false);
  return [shown, dismiss];
}
