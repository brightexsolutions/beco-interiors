import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Cross-app cache bust. The dashboard cannot call `revalidateTag` inside
 * this process: they are separate Vercel projects. After a catalogue write
 * it POSTs here with the shared `REVALIDATE_SECRET`.
 *
 * Tags are `product:slug` and `category:slug`. Paths cover the current ISR
 * pages (`revalidate = 3600`) so a price change is live on the next request
 * rather than in up to an hour.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const header = request.headers.get('authorization');
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { tags?: unknown; paths?: unknown };
  try {
    body = (await request.json()) as { tags?: unknown; paths?: unknown };
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const tags = Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === 'string') : [];
  const paths = Array.isArray(body.paths)
    ? body.paths.filter((path): path is string => typeof path === 'string' && path.startsWith('/'))
    : [];

  for (const tag of tags) revalidateTag(tag, 'max');
  for (const path of paths) revalidatePath(path);

  return NextResponse.json({ ok: true, tags, paths });
}
