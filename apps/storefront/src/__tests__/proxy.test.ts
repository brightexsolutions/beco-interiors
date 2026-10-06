import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { config, proxy } from '../proxy';

const request = (url: string) => new NextRequest(new URL(url, 'https://www.beco.co.ke'));

describe('storefront proxy: the old WordPress site (D107)', () => {
  it('answers 410 Gone for paths only WordPress ever had', () => {
    const res = proxy(request('/wp-login.php'));
    expect(res.status).toBe(410);
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(res.headers.get('cache-control')).toContain('max-age');
  });

  it('answers 410 for the WordPress sitemap and feed shapes', () => {
    expect(proxy(request('/wp-sitemap.xml')).status).toBe(410);
    expect(proxy(request('/product-sitemap.xml')).status).toBe(410);
    expect(proxy(request('/feed/')).status).toBe(410);
    expect(proxy(request('/blog/feed')).status).toBe(410);
  });

  it('sends ?p= and ?page_id= permalinks to the home page with a 301', () => {
    const res = proxy(request('/?p=42'));
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://www.beco.co.ke/');
  });

  it('keeps the search term when it sends ?s= to the shop', () => {
    const res = proxy(request('/?s=handles'));
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://www.beco.co.ke/shop/all?q=handles');
  });

  it('passes the home page through untouched, campaign parameters included', () => {
    expect(proxy(request('/')).status).toBe(200);
    expect(proxy(request('/?utm_source=instagram')).status).toBe(200);
    expect(proxy(request('/?utm_source=instagram')).headers.get('location')).toBeNull();
  });

  it('is matched only on the old shapes, never on a product or shop page', () => {
    expect(config.matcher).toContain('/');
    expect(config.matcher).toContain('/wp-login.php');
    expect(config.matcher.some((m) => m.startsWith('/shop') || m.startsWith('/product'))).toBe(false);
  });
});
