import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@beco/supabase-client';
import { resolveAdminRole } from '@/lib/session';

/**
 * Next 16 renamed `middleware` to `proxy`. This is the route half of "role
 * checks in two places", per rule 7 and D80: it verifies the SESSION and
 * the ADMIN ROLE before the launch control renders, not just that some
 * `sb-*-auth-token` cookie exists. A signed-in non-admin is turned away
 * here, not only later by `requireAdmin` in the page.
 *
 * RLS on `settings` is still the half that actually holds. This one keeps a
 * non-admin from ever seeing the control, and `requireAdmin` in the page
 * and every server action stays as defence in depth.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient({
    getAll: () => request.cookies.getAll(),
    set: (name, value, options) => {
      response.cookies.set({ name, value, ...(options ?? {}) });
    },
  });

  const toLogin = (denied: boolean) => {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (denied) url.searchParams.set('denied', '1');
    else url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return toLogin(false);

  const role = await resolveAdminRole(supabase, auth.user.id);
  if (!role) return toLogin(true);

  return response;
}

export const config = {
  matcher: ['/launch/:path*'],
};
