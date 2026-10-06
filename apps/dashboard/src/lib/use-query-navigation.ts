'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';

/**
 * The one way a filter writes the URL. Every list in the dashboard is server
 * rendered from its search params, so a filter change is a navigation, and a
 * navigation on a slow connection needs to be seen to be happening. This
 * hook owns the transition, so the filter can show `isPending` beside its
 * controls and the list can dim its rows. D117.
 *
 * `setParam` keeps the other params, drops an empty value, and resets the
 * page, because page 4 of the old filter is nowhere in the new one.
 */
export function useQueryNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const push = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
    },
    [pathname, router],
  );

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete('page');
      push(params);
    },
    [searchParams, push],
  );

  /** Start any navigation inside this hook's transition, so it shows as pending too. */
  const navigate = useCallback(
    (run: () => void) => {
      startTransition(run);
    },
    [],
  );

  return { searchParams, setParam, push, navigate, isPending };
}
