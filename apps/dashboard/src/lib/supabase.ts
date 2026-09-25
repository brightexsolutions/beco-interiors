import { cookies } from 'next/headers';
import { createServerClient } from '@beco/supabase-client';

/**
 * A request-scoped Supabase client for the dashboard, carrying the caller's
 * session. Anon key, so RLS is still the authority: this is how the launch
 * control's writes are actually gated, not by anything in the page.
 *
 * `set` is wrapped because a Server Component render cannot write cookies:
 * Supabase only tries to when it is refreshing an expired token, and in
 * that path the proxy has usually done it already. A server action or route
 * handler CAN write, and there the set goes through.
 */
export const getSupabase = async () => {
  const store = await cookies();
  return createServerClient({
    getAll: () => store.getAll(),
    set: (name, value, options) => {
      try {
        // Object form, so an absent `options` is valid rather than an
        // explicit third argument of `undefined`, which Next's overloads
        // reject.
        store.set({ name, value, ...(options ?? {}) });
      } catch {
        // Called from a Server Component render. Safe to ignore.
      }
    },
  });
};
