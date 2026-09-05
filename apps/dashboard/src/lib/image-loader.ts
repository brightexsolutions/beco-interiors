/**
 * Custom next/image loader, so Vercel image optimization is never invoked and
 * its quota is never spent, per D16. Mirrors the storefront's loader.
 *
 * The dashboard renders no catalogue imagery yet: that arrives with M5. Until
 * then this only needs to leave real URLs and local assets alone, which is
 * every image it currently serves. The catalogue-key branch is kept so the
 * behaviour does not diverge from the storefront when M5 does add product
 * photography here.
 */
const WIDTHS = [400, 800, 1600] as const;

export const isCatalogueKey = (src: string): boolean =>
  !src.startsWith('/') && !src.startsWith('http') && !src.startsWith('data:') && !/\.\w{2,4}$/.test(src);

export default function imageLoader({ src, width }: { src: string; width: number }): string {
  if (!isCatalogueKey(src)) return src;
  const host = process.env.NEXT_PUBLIC_IMAGE_HOST ?? '';
  const nearest = WIDTHS.find((w) => w >= width) ?? WIDTHS[WIDTHS.length - 1];
  return `${host}/${src}-${nearest}.webp`;
}
