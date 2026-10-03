import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isGone, legacyQueryRedirect } from './lib/legacy-redirects';

/**
 * The storefront's only request-time rule, and it is about the site that
 * was here before (D107). WordPress-only paths answer 410 Gone, which
 * Google acts on at once; WordPress query shapes (`?p=`, `?s=`) go where
 * they now belong. Everything else passes straight through: the real
 * redirects are static, in `next.config.ts`, and cost nothing here.
 *
 * Matched narrowly so this never runs for a product page or an image.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (isGone(pathname)) {
    return new NextResponse('Gone. This address belonged to the old site and has no page here.', {
      status: 410,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    });
  }

  if (pathname === '/') {
    const destination = legacyQueryRedirect(searchParams);
    if (destination && destination !== '/') {
      return NextResponse.redirect(new URL(destination, request.url), 301);
    }
    if (destination === '/' && searchParams.toString()) {
      return NextResponse.redirect(new URL('/', request.url), 301);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/wp-admin/:path*',
    '/wp-login.php',
    '/wp-register.php',
    '/wp-cron.php',
    '/wp-json/:path*',
    '/wp-content/:path*',
    '/wp-includes/:path*',
    '/xmlrpc.php',
    '/feed/:path*',
    '/feed',
    '/comments/feed/:path*',
    '/:path*/feed',
    '/wp-sitemap.xml',
    '/wp-sitemap-:rest.xml',
    '/sitemap_index.xml',
    '/:name-sitemap.xml',
    '/readme.html',
    '/license.txt',
  ],
};
