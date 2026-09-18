import { type NextRequest } from 'next/server';
import { getProductObject, isSafeR2Key } from '@/lib/product-storage';

/**
 * Streams a derivative from R2 for dashboard previews.
 *
 * The storefront already has this route. Local `NEXT_PUBLIC_IMAGE_HOST` is
 * `/api/img` on both apps, so a dashboard `<img>` that used the storefront
 * host 404ed on this origin and showed the alt text instead of the shot.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const key = path.join('/');
  if (!isSafeR2Key(key)) {
    return new Response('Bad request', { status: 400 });
  }

  const obj = await getProductObject(key);
  if (!obj) return new Response('Not found', { status: 404 });

  return new Response(new Uint8Array(obj.body), {
    headers: {
      'Content-Type': obj.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
