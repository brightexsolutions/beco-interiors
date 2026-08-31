/**
 * Custom next/image loader pointing at Cloudflare R2.
 *
 * Derivatives are generated ONCE at import time by tools/drive-import, at
 * 400/800/1200/1600 wide. Nothing is resized per request, and Vercel's
 * image optimization is never invoked, so its quota is never spent. See D16.
 */
// Must match IMAGE_WIDTHS in the import pipeline. Three widths, WebP only,
// per docs/REVIEW.md 3.3: AVIF encoding dominates import time on 44MB sources
// for roughly 20 percent file size.
const WIDTHS = [400, 800, 1600] as const;

export default function imageLoader({ src, width }: { src: string; width: number }): string {
  // In development this is a relative path to the R2 proxy route, because the
  // bucket is private until the custom domain exists. At launch it becomes
  // https://img.beco.co.ke and nothing else changes.
  const host = process.env.NEXT_PUBLIC_IMAGE_HOST ?? '';
  const nearest = WIDTHS.find((w) => w >= width) ?? WIDTHS[WIDTHS.length - 1];
  return `${host}/${src}-${nearest}.webp`;
}
