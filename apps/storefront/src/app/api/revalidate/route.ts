import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { bearerMatches } from '@beco/validation';

/**
 * Cross-app cache bust. The dashboard cannot call `revalidateTag` inside
 * this process: they are separate Vercel projects. After a catalogue write
 * it POSTs here with the shared `REVALIDATE_SECRET`.
 *
 * Tags are `product:slug` and `category:slug`. Paths cover the current ISR
 * pages (`revalidate = 3600`) so a price change is live on the next request
 * rather than in up to an hour.
 */
const MAX_ENTRIES = 100;

export async function POST(request: Request) {
  if (!(await bearerMatches(request.headers.get('authorization'), process.env.REVALIDATE_SECRET))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { tags?: unknown; paths?: unknown };
  try {
    body = (await request.json()) as { tags?: unknown; paths?: unknown };
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // Bounded, so a leaked secret can at most warm a page of cache entries,
  // not hold the server in a revalidation loop.
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((tag): tag is string => typeof tag === 'string' && tag.length <= 200).slice(0, MAX_ENTRIES)
    : [];
  const paths = Array.isArray(body.paths)
    ? body.paths
        .filter((path): path is string => typeof path === 'string' && path.startsWith('/') && path.length <= 500)
        .slice(0, MAX_ENTRIES)
    : [];

  for (const tag of tags) revalidateTag(tag, 'max');
  for (const path of paths) {
    if (path === '/') revalidatePath('/', 'layout');
    else revalidatePath(path);
  }

  return NextResponse.json({ ok: true, tags, paths });
}
