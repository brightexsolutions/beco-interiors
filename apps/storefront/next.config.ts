import type { NextConfig } from 'next';


// React needs eval() in DEVELOPMENT ONLY, for reconstructing callstacks and
// other debugging features. It never uses eval in production. So the policy is
// built per environment rather than loosened everywhere: production stays
// tight and development actually runs.
const isDev = process.env.NODE_ENV !== 'production';

const scriptSrc = [
  "'self'",
  // Next.js inlines a small bootstrap script. Tighten to a nonce once the app
  // is stable, and record that as a follow up rather than forgetting it.
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  'https://www.googletagmanager.com',
].join(' ');

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  // 'self' only, which is possible because fonts are self hosted. See D3.
  // There is no fonts.gstatic.com entry and there should never be one.
  "font-src 'self'",
  "img-src 'self' data: blob: https://img.beco.co.ke https://www.google-analytics.com",
  // Showroom and site footage, served from our own origin or the R2 image
  // domain. Stated explicitly rather than left to fall back to default-src,
  // because rule 7 asks for a CSP written out rather than inherited.
  "media-src 'self' https://img.beco.co.ke",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} https://www.google-analytics.com`,
  // The showroom's map embed, and nothing else: stated explicitly rather
  // than left to fall back to default-src, per rule 7. No API key embed,
  // so no additional connect-src or script-src entry is needed for it.
  "frame-src https://www.google.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const config: NextConfig = {
  reactStrictMode: true,
  // Next blocks cross-origin requests to dev-only assets by default, trusting
  // only localhost. That is what silently broke the shared cloudflared link:
  // the page's own HTML loaded fine, but the browser's real Origin header on
  // every JS chunk and HMR request did not match localhost, so React never
  // hydrated. Nothing ran: no scroll listener, no hover state, no observer,
  // which is why the nav stayed transparent and the About menu never opened,
  // not a bug in either of those. Dev only, and scoped to the one origin this
  // is actually shared through rather than a broad allowance.
  ...(isDev ? { allowedDevOrigins: ['*.trycloudflare.com'] } : {}),
  images: {
    // Custom loader points at R2, so Vercel image optimization is never invoked
    // and its quota is never spent. See D16.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default config;
