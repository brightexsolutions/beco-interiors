/**
 * Custom next/image loader pointing at Cloudflare R2.
 *
 * Derivatives are generated ONCE at import time by tools/drive-import, at
 * 400/800/1200/1600 wide. Nothing is resized per request, and Vercel's
 * image optimization is never invoked, so its quota is never spent. See D16.
 */
const WIDTHS = [400, 800, 1200, 1600] as const;

export default function imageLoader({ src, width }: { src: string; width: number }): string {
  const host = process.env.NEXT_PUBLIC_IMAGE_HOST ?? '';
  const nearest = WIDTHS.find((w) => w >= width) ?? WIDTHS[WIDTHS.length - 1];
  return `${host}/${src}-${nearest}.webp`;
}
