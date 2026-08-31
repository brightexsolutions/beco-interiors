import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { type NextRequest } from 'next/server';

/**
 * Streams a derivative from R2.
 *
 * Exists because an R2 bucket is private by default, and the public custom
 * domain `img.beco.co.ke` needs the beco.co.ke zone in the same Cloudflare
 * account, which waits on the nameserver change.
 *
 * So this is the development path: `NEXT_PUBLIC_IMAGE_HOST` points here, the
 * custom `next/image` loader is unchanged, and at launch the host swaps to
 * img.beco.co.ke and this route stops being used. Nothing else changes.
 *
 * Read only, and it can only reach the one bucket the credentials are scoped
 * to, so it is not a general purpose proxy.
 */
const s3 = () =>
  new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const key = path.join('/');

  // Path traversal guard. The key is user controllable via the URL, so it is
  // constrained rather than trusted, even though R2 would reject most of it.
  if (key.includes('..') || key.startsWith('/')) {
    return new Response('Bad request', { status: 400 });
  }

  try {
    const obj = await s3().send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
    );
    const body = await obj.Body!.transformToByteArray();
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': obj.ContentType ?? 'image/webp',
        // Keys change when content does, so a long immutable cache is safe.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
