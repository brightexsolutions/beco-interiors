'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode, type TransitionStartFunction } from 'react';

/**
 * One transition shared by every control on a screen that navigates its list.
 *
 * Without it each component held its own `useTransition`: the range pills on
 * the catalogue started theirs and threw `isPending` away, the filter row's
 * `Busy` only heard its own selects, and the table only dimmed for its own
 * paging. A pill tap showed nothing at all until the new rows arrived. Wrap
 * the page's filters and results in this provider and a navigation started
 * by any of them is pending in all of them. D117.
 */
const SharedTransition = createContext<{ isPending: boolean; startTransition: TransitionStartFunction } | null>(null);

export function QueryNavigationProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  const value = useMemo(() => ({ isPending, startTransition }), [isPending]);
  return <SharedTransition.Provider value={value}>{children}</SharedTransition.Provider>;
}

/**
 * The one way a filter writes the URL. Every list in the dashboard is server
 * rendered from its search params, so a filter change is a navigation, and a
 * navigation on a slow connection needs to be seen to be happening. This
 * hook owns the transition, so the filter can show `isPending` beside its
 * controls and the list can dim its rows. D117.
 *
 * Inside a `QueryNavigationProvider` the transition is the provider's, shared
 * with every sibling; outside one it is this component's own.
 *
 * `setParam` keeps the other params, drops an empty value, and resets the
 * page, because page 4 of the old filter is nowhere in the new one.
 */
export function useQueryNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shared = useContext(SharedTransition);
  const [ownPending, ownStart] = useTransition();
  const isPending = shared ? shared.isPending : ownPending;
  const startTransition = shared ? shared.startTransition : ownStart;

  const push = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
    },
    [pathname, router, startTransition],
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

  /**
   * Start any navigation inside this hook's transition, so it shows as
   * pending too. Return the navigation's result from `run`, so a test's
   * deferred router keeps the transition open the way a real fetch does.
   */
  const navigate = useCallback(
    (run: () => void | Promise<void>) => {
      startTransition(run);
    },
    [startTransition],
  );

  return { searchParams, setParam, push, navigate, isPending };
}
