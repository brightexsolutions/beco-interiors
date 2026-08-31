// Anon key only. Scoped entirely by RLS. Safe in a browser by design.
import { createBrowserClient as create } from '@supabase/ssr';
import type { Database } from '@beco/types';

export const createBrowserClient = () =>
  create<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
