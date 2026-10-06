import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Dashboard CSP. No analytics, no tag manager: neither is loaded here.

// React needs eval() in DEVELOPMENT ONLY, for reconstructing callstacks and
// other debugging features. It never uses eval in production. So the policy is
// built per environment rather than loosened everywhere: production stays
// tight and development actually runs.
const isDev = process.env.NODE_ENV !== 'production';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
mkdirSync(join(here, 'public'), { recursive: true });
copyFileSync(
  require.resolve('pdfjs-dist/build/pdf.worker.min.mjs'),
  join(here, 'public', 'pdf.worker.min.mjs'),
);

const imageOrigins = (() => {
  const hosts = new Set(['https://img.beco.co.ke']);
  const extra = process.env.NEXT_PUBLIC_IMAGE_HOST;
  if (extra) {
    try {
      hosts.add(new URL(extra).origin);
    } catch {
      // Ignore a malformed host rather than break the whole CSP.
    }
  }
  return [...hosts].join(' ');
})();

const scriptSrc = [
  "'self'",
  // Next.js inlines a small bootstrap script. Tighten to a nonce once the app
  // is stable, and record that as a follow up rather than forgetting it.
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
].join(' ');

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  // 'self' only, which is possible because fonts are self hosted. See D3.
  // There is no fonts.gstatic.com entry and there should never be one.
  "font-src 'self'",
  `img-src 'self' data: blob: ${imageOrigins}`,
  `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}`,
  // pdf.js paints quote, receipt, and sales-review pages onto canvas. The
  // worker is copied into public/ from pdfjs-dist at config load.
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@react-pdf/renderer', 'fontkit', 'yoga-layout', 'sharp', 'pdfjs-dist'],
  // The quote, receipt and report PDFs read their TTF fonts and the logo from
  // packages/documents at request time, by a path built from import.meta.url.
  // The file tracer cannot follow a path built at run time, so no deployment
  // carried them and every PDF failed in production with ENOENT on
  // titillium-400.ttf, while local runs, which read the files from disk,
  // passed. Named here so every server route, the PDF routes and the actions
  // that email or share a PDF alike, ships them. About 236KB.
  outputFileTracingIncludes: {
    '/**': ['../../packages/documents/src/pdf/fonts/*.ttf', '../../packages/documents/src/pdf/assets/*'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
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
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default config;
