import type { NextConfig } from 'next';

// CSP written EXPLICITLY rather than left permissive, as the brief requires.
// font-src is 'self' only, which is possible because fonts are self hosted (D3).
// There is no fonts.gstatic.com entry and there should never be one.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob: https://img.beco.co.ke https://www.google-analytics.com",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} https://www.google-analytics.com`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const config: NextConfig = {
  reactStrictMode: true,
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
