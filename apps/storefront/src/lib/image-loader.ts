/**
 * Custom next/image loader pointing at Cloudflare R2.
 *
 * Derivatives are generated ONCE at import time by tools/drive-import, at
 * 400/800/1600 wide. Nothing is resized per request, and Vercel's image
 * optimization is never invoked, so its quota is never spent. See D16.
 *
 * A custom loader is GLOBAL: Next routes every next/image through it, not
 * just catalogue photography. So it has to recognise the two kinds of source
 * it will be handed, or a local asset gets mangled into an R2 derivative key.
 * That is what happened to the logo, which became `/logo-mark.png-400.webp`
 * and rendered as a broken image in the header and the footer.
 */

// Must match IMAGE_WIDTHS in the import pipeline. Three widths, WebP only,
// per docs/REVIEW.md 3.3: AVIF encoding dominates import time on 44MB sources
// for roughly 20 percent file size.
const WIDTHS = [400, 800, 1600] as const;

/**
 * A catalogue key is a bare R2 path with no leading slash and no extension,
 * like `12mm-sintered-stones/amber-jade/slab-0`. Anything else is already a
 * real URL and is served as it is.
 */
export const isCatalogueKey = (src: string): boolean =>
  !src.startsWith('/') && !src.startsWith('http') && !src.startsWith('data:') && !/\.\w{2,4}$/.test(src);

export default function imageLoader({ src, width }: { src: string; width: number }): string {
  if (!isCatalogueKey(src)) return src;

  // In development this is a relative path to the R2 proxy route, because the
  // bucket is private until the custom domain exists. At launch it becomes
  // https://img.beco.co.ke and nothing else changes.
  const host = process.env.NEXT_PUBLIC_IMAGE_HOST ?? '';
  const nearest = WIDTHS.find((w) => w >= width) ?? WIDTHS[WIDTHS.length - 1];
  return `${host}/${src}-${nearest}.webp`;
}
