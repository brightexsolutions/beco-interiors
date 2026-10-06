/**
 * Storefront analytics, D128.
 *
 * Every event goes two places: GA4, when it is loaded, and Beco's own
 * `analytics_events` table, so the reporting survives losing GA4 access and
 * the dashboard's lead counters have something to count.
 *
 * Both writes are fire and forget. Nothing here may throw, block a click, or
 * hold up a navigation: a tel: or wa.me link must open whatever analytics
 * does. A lost event is acceptable; a lost lead is not.
 *
 * Privacy: params carry where the event happened (a product or category
 * slug, the page path), never who did it. No names, phones, emails, quote
 * references or quote contents.
 */

/**
 * The event types migration 60's `analytics_insert_anon` policy accepts,
 * in its order. An anon insert with any other `event_type` is refused by
 * RLS, so this list is the policy, restated. A test reads the migration and
 * holds the two together.
 */
export const ANALYTICS_EVENTS = [
  'page_view',
  'product_view',
  'add_to_cart',
  'quote_started',
  'quote_submitted',
  'whatsapp_click',
  'call_click',
  'post_read',
  'document_downloaded',
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export const isAnalyticsEvent = (value: unknown): value is AnalyticsEvent =>
  typeof value === 'string' && (ANALYTICS_EVENTS as readonly string[]).includes(value);

/** Only the keys the reports read, plus the path. Nothing that names a person. */
export interface AnalyticsParams {
  product_slug?: string;
  category_slug?: string;
  page_path?: string;
}

const PARAM_KEYS = ['product_slug', 'category_slug', 'page_path'] as const;

/** Per value cap. Three of these stay far inside the policy's 2KB bound. */
export const MAX_PARAM_LENGTH = 200;

/** Migration 60 refuses a metadata payload over 2048 bytes. */
export const MAX_METADATA_BYTES = 2048;

/**
 * Keeps only the known keys, as trimmed strings within the per value cap.
 * Anything else a caller passes is dropped rather than forwarded, so a
 * careless call site cannot leak a field it was never meant to send.
 */
export function sanitiseParams(params: AnalyticsParams = {}): AnalyticsParams {
  const out: AnalyticsParams = {};
  for (const key of PARAM_KEYS) {
    const value = params[key];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim().slice(0, MAX_PARAM_LENGTH);
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

/**
 * Product or category context from the page the event happened on. The
 * conversion report joins `metadata.product_slug` and
 * `metadata.category_slug` back to their records, migration 41.
 */
export function contextFromPath(pathname: string): AnalyticsParams {
  const path = pathname.split(/[?#]/)[0] || '/';
  const product = /^\/product\/([^/]+)\/?$/.exec(path)?.[1];
  const category = /^\/shop\/([^/]+)\/?$/.exec(path)?.[1];
  const decode = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  return {
    page_path: path,
    ...(product ? { product_slug: decode(product) } : {}),
    // /shop/all is the whole catalogue, not a category.
    ...(category && category !== 'all' ? { category_slug: decode(category) } : {}),
  };
}

/**
 * The GA4 Measurement ID, or null when GA4 must not load.
 *
 * Production only, keyed on VERCEL_ENV rather than NODE_ENV: every Vercel
 * build, preview included, runs with NODE_ENV=production, so NODE_ENV alone
 * would send preview and staging traffic into Beco's real property.
 * VERCEL_ENV is `production` only for `vercel build --prod`, which is what
 * deploy-production.yml runs, and on the production runtime.
 */
export function ga4MeasurementId(env: Record<string, string | undefined>): string | null {
  if (env.VERCEL_ENV !== 'production') return null;
  const id = env.NEXT_PUBLIC_GA4_ID?.trim();
  return id && /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

type Gtag = (command: 'event', name: string, params: Record<string, unknown>) => void;

function sendToGa4(name: AnalyticsEvent, params: AnalyticsParams): void {
  try {
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    if (typeof gtag === 'function') gtag('event', name, { ...params });
  } catch {
    // GA4 blocked, half loaded, or replaced by an extension. Ignored.
  }
}

/**
 * Inserts the row through PostgREST with the anon key, the same request the
 * Supabase client makes for `.insert()`, under the same RLS policy. Done with
 * fetch rather than supabase-js so every page does not carry the client for
 * one insert, and so the request can be `keepalive`: it outlives the page
 * when the click that caused it navigates away.
 *
 * `return=minimal` matters: anon cannot read analytics_events back, so asking
 * for the row would turn an accepted insert into a refusal.
 */
function sendToBeco(name: AnalyticsEvent, params: AnalyticsParams): void {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || typeof fetch !== 'function') return;
    const body = JSON.stringify({ event_type: name, metadata: params });
    // The policy measures the stored jsonb, which is close to the JSON text.
    // sanitiseParams keeps far under this already; this is the backstop.
    if (body.length > MAX_METADATA_BYTES) return;
    void fetch(`${url.replace(/\/$/, '')}/rest/v1/analytics_events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body,
    }).catch(() => {
      // Offline, blocked, or refused by the policy. Ignored by design.
    });
  } catch {
    // fetch itself threw synchronously. Ignored by design.
  }
}

/**
 * Record one event. Safe to call from any client code path: it returns
 * immediately, never throws, and ignores names the policy would refuse.
 */
export function track(name: AnalyticsEvent, params: AnalyticsParams = {}): void {
  try {
    if (typeof window === 'undefined' || !isAnalyticsEvent(name)) return;
    const clean = sanitiseParams({
      ...contextFromPath(window.location.pathname),
      ...params,
    });
    sendToGa4(name, clean);
    sendToBeco(name, clean);
  } catch {
    // Analytics never breaks the page.
  }
}
