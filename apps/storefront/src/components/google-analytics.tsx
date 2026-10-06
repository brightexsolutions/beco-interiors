import Script from 'next/script';
import { ga4MeasurementId } from '@/lib/analytics';

/**
 * Loads GA4's gtag.js on the production storefront, and nowhere else. D128.
 *
 * A server component on purpose: the gate is VERCEL_ENV, which is not a
 * NEXT_PUBLIC_ variable and so does not exist in the browser bundle. The
 * decision is made on the server and a preview build ships no GA4 markup at
 * all, rather than shipping it and hoping a client check holds. `next/script`
 * is itself the client island.
 *
 * `afterInteractive`, so gtag never competes with the hero for the LCP. The
 * inline snippet defines `window.gtag`, which `track()` in lib/analytics.ts
 * looks for. The ID is pattern checked before it is interpolated, so nothing
 * but `G-` and capitals and digits can reach the inline script.
 *
 * App Router navigations are client side. GA4's enhanced measurement counts
 * them as page views from history changes, which is why D128 asks for
 * "page changes based on browser history events" to stay on.
 */
export function GoogleAnalytics({
  env = process.env,
}: {
  env?: Record<string, string | undefined>;
}) {
  const id = ga4MeasurementId(env);
  if (!id) return null;
  return (
    <>
      <Script
        id="ga4-gtag"
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}
