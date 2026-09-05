import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next 16 renamed `middleware` to `proxy`. This is the fast path only: it
 * redirects an obviously signed-out visitor away from the launch control
 * before the page renders. The real gate is `requireAdmin` in the page
 * itself, and behind that, RLS on `settings`. See rule 7 and D80.
 */
export function proxy(request: NextRequest) {
  const signedIn = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));

  if (!signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/launch/:path*'],
};
