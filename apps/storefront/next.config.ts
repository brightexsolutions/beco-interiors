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
  `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} https://www.google-analytics.com`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
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
