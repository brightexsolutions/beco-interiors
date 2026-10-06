import { jpegResponse } from '@/lib/og/card';
import { renderSectionCard } from '@/lib/og/catalogue';
import { isOgSection, OG_SECTION_KEYS } from '@/lib/seo';

/**
 * The share card for a page with no photograph of its own: home, shop,
 * gallery, about, contact, blog, team, quote, and the legal pages.
 *
 * Every one is drawn at build time and served as a static file, so a
 * scraper's first request is as fast as its hundredth. Outside /api/ on
 * purpose: robots.txt disallows /api/, and X's crawler honours that for
 * images too.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return OG_SECTION_KEYS.map((section) => ({ section }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isOgSection(section)) return new Response('Not found', { status: 404 });
  return jpegResponse(await renderSectionCard(section), 604_800);
}
