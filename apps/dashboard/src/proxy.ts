import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@beco/supabase-client';
import { CHANGE_PASSWORD_PATH, ROLE_LANDING, canAccess } from '@/lib/access';
import { resolveSessionUser } from '@/lib/session';

/**
 * Next 16 renamed `middleware` to `proxy`. This is LAYER 1 of "role checks in
 * two places" (rule 7, ARCHITECTURE section 12), now covering the whole
 * dashboard rather than just `/launch`:
 *
 *   - no session               -> /login, carrying a return path
 *   - inactive or unknown user  -> session ended here, -> /login?denied=1
 *   - flagged for a password change -> /change-password, and nothing else
 *   - signed in, wrong role for the path -> that role's own landing
 *
 * RLS in Postgres is LAYER 2 and the authority: it holds even if this is
 * bypassed entirely. This keeps a role from ever seeing a screen it has no
 * business on, and every server action re-checks besides.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const supabase = createServerClient({
    getAll: () => request.cookies.getAll(),
    set: (name, value, options) => {
      response.cookies.set({ name, value, ...(options ?? {}) });
    },
  });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return toLogin(request, { next: pathname });

  const user = await resolveSessionUser(supabase, auth.user.id);

  // No row, or `is_active = false`: `current_user_role()` already returns
  // null for this account so RLS has fallen closed. End the session here too,
  // so a user deactivated mid-visit is out on the next request rather than
  // lingering with a live cookie.
  if (!user || !user.role) return endSession(request);

  if (user.mustChangePassword && pathname !== CHANGE_PASSWORD_PATH) {
    return redirectTo(request, CHANGE_PASSWORD_PATH);
  }

  if (!canAccess(user.role, pathname)) {
    return redirectTo(request, ROLE_LANDING[user.role]);
  }

  return response;
}

function toLogin(request: NextRequest, opts: { next?: string; denied?: boolean }) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  if (opts.denied) url.searchParams.set('denied', '1');
  else if (opts.next && opts.next !== '/') url.searchParams.set('next', opts.next);
  return NextResponse.redirect(url);
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  return NextResponse.redirect(url);
}

/**
 * Clears the Supabase auth cookies and bounces to the login screen. GoTrue
 * does not know about `users.is_active`, so a deactivated account keeps a
 * valid token until it expires unless the cookie is removed here.
 */
function endSession(request: NextRequest) {
  const res = toLogin(request, { denied: true });
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith('sb-') && name.includes('auth-token')) {
      res.cookies.set({ name, value: '', expires: new Date(0), path: '/' });
    }
  }
  return res;
}

export const config = {
  // Everything except the login screen, Next's internals, and any path with a
  // file extension (the `public/` assets: the logo, the icon). Dashboard
  // routes never contain a dot. `/change-password` deliberately goes THROUGH
  // the proxy.
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico|robots.txt|.*\\.).*)'],
};
