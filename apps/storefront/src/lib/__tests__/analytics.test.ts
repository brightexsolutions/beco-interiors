import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_EVENTS,
  MAX_PARAM_LENGTH,
  contextFromPath,
  ga4MeasurementId,
  isAnalyticsEvent,
  sanitiseParams,
  track,
} from '../analytics';

/**
 * D128. Analytics must never break the page, must only send what the
 * analytics_events policy accepts, and must never carry personal data.
 * Every one of those is a failure that looks fine in a browser, so each is
 * asserted here rather than trusted.
 */

const MIGRATION = 'supabase/migrations/00000000000060_analytics_insert_bounds.sql';

describe('the allowed event names', () => {
  it('are exactly the names migration 60 lets anon insert, in its order', () => {
    const sql = readFileSync(MIGRATION, 'utf8');
    const list = /event_type in \(([\s\S]*?)\)/.exec(sql)?.[1] ?? '';
    const names = [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);
    expect([...ANALYTICS_EVENTS]).toEqual(names);
  });

  it('include the four key events DEPLOYMENT 9.2 marks in GA4', () => {
    for (const name of ['quote_submitted', 'whatsapp_click', 'call_click', 'add_to_cart']) {
      expect(isAnalyticsEvent(name)).toBe(true);
    }
  });

  it('reject anything else', () => {
    expect(isAnalyticsEvent('purchase')).toBe(false);
    expect(isAnalyticsEvent('')).toBe(false);
    expect(isAnalyticsEvent(null)).toBe(false);
  });
});

describe('ga4MeasurementId', () => {
  it('returns the ID on production with a well formed value', () => {
    expect(ga4MeasurementId({ VERCEL_ENV: 'production', NEXT_PUBLIC_GA4_ID: 'G-ABC123XYZ' })).toBe(
      'G-ABC123XYZ',
    );
  });

  it('is null on a preview, even with a valid ID, so previews never reach GA4', () => {
    expect(ga4MeasurementId({ VERCEL_ENV: 'preview', NEXT_PUBLIC_GA4_ID: 'G-ABC123' })).toBeNull();
  });

  it('is null in local development and when VERCEL_ENV is absent, even under NODE_ENV production', () => {
    expect(ga4MeasurementId({ VERCEL_ENV: 'development', NEXT_PUBLIC_GA4_ID: 'G-ABC123' })).toBeNull();
    expect(ga4MeasurementId({ NODE_ENV: 'production', NEXT_PUBLIC_GA4_ID: 'G-ABC123' })).toBeNull();
  });

  it('is null without an ID, or with one that is not a GA4 Measurement ID', () => {
    for (const id of [undefined, '', 'UA-1234-1', 'G-', 'g-abc123', 'G-ABC123\');steal(1);//', 'GTM-ABC']) {
      expect(ga4MeasurementId({ VERCEL_ENV: 'production', NEXT_PUBLIC_GA4_ID: id })).toBeNull();
    }
  });
});

describe('contextFromPath', () => {
  it('reads the product slug from a product page', () => {
    expect(contextFromPath('/product/amber-jade')).toEqual({
      page_path: '/product/amber-jade',
      product_slug: 'amber-jade',
    });
  });

  it('reads the category slug from a category page, but not from /shop/all', () => {
    expect(contextFromPath('/shop/marble')).toEqual({ page_path: '/shop/marble', category_slug: 'marble' });
    expect(contextFromPath('/shop/all')).toEqual({ page_path: '/shop/all' });
  });

  it('carries only the path elsewhere, and drops any query string', () => {
    expect(contextFromPath('/contact')).toEqual({ page_path: '/contact' });
    expect(contextFromPath('/shop/marble?finish=polished')).toEqual({
      page_path: '/shop/marble',
      category_slug: 'marble',
    });
  });
});

describe('sanitiseParams', () => {
  it('keeps only the known keys, so a stray field cannot leak', () => {
    const dirty = { product_slug: 'amber-jade', customer_phone: '0722333730', name: 'Achieng' } as never;
    expect(sanitiseParams(dirty)).toEqual({ product_slug: 'amber-jade' });
  });

  it('caps each value, keeping the payload inside the 2KB policy bound', () => {
    const long = 'x'.repeat(5000);
    const out = sanitiseParams({ product_slug: long, category_slug: long, page_path: long });
    expect(out.product_slug).toHaveLength(MAX_PARAM_LENGTH);
    expect(JSON.stringify(out).length).toBeLessThan(2048);
  });

  it('drops empty and non string values', () => {
    expect(sanitiseParams({ product_slug: '  ', category_slug: 7 as never })).toEqual({});
  });
});

describe('track', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/product/amber-jade');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    delete (window as { gtag?: unknown }).gtag;
    window.history.replaceState(null, '', '/');
  });

  it('writes one row to analytics_events with the anon key, keepalive, and no read back', () => {
    track('whatsapp_click');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://example.supabase.co/rest/v1/analytics_events');
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(init.headers).toMatchObject({
      apikey: 'anon-key',
      Authorization: 'Bearer anon-key',
      Prefer: 'return=minimal',
    });
    expect(JSON.parse(init.body)).toEqual({
      event_type: 'whatsapp_click',
      metadata: { page_path: '/product/amber-jade', product_slug: 'amber-jade' },
    });
  });

  it('sends the same event to GA4 when gtag is loaded', () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    track('add_to_cart', { product_slug: 'gold-bar-handle' });
    expect(gtag).toHaveBeenCalledWith('event', 'add_to_cart', {
      page_path: '/product/amber-jade',
      product_slug: 'gold-bar-handle',
    });
  });

  it('still writes the row when gtag is missing', () => {
    expect(() => track('call_click')).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still writes the row when gtag throws', () => {
    (window as { gtag?: unknown }).gtag = () => {
      throw new Error('blocked');
    };
    expect(() => track('call_click')).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('swallows a rejected insert without an unhandled rejection', async () => {
    fetchMock.mockReset().mockRejectedValue(new TypeError('Failed to fetch'));
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    expect(() => track('quote_submitted')).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('swallows fetch throwing synchronously', () => {
    fetchMock.mockReset().mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => track('call_click')).not.toThrow();
  });

  it('sends nothing to the database when Supabase is not configured', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    track('call_click');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores a name the policy would refuse', () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    track('purchase' as never);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(gtag).not.toHaveBeenCalled();
  });
});
