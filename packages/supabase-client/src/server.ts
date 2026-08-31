// Server side, still anon key plus the user's session. RLS remains the authority.
import { createServerClient as create } from '@supabase/ssr';
import type { Database } from '@beco/types';

type CookieStore = {
  getAll: () => Array<{ name: string; value: string }>;
  set: (name: string, value: string, options?: Record<string, unknown>) => void;
};

export const createServerClient = (cookies: CookieStore) =>
  create<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookies.getAll(),
        setAll: (items) => items.forEach((c) => cookies.set(c.name, c.value, c.options)),
      },
    },
  );
