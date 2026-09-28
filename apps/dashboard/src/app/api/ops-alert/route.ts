import { NextResponse } from 'next/server';
import { createRateLimiter, opsAlertRelaySchema } from '@beco/validation';
import { bearerMatches } from '@/lib/bearer-secret';
import { reportOpsFailure } from '@/lib/ops-alert';

/**
 * The storefront's way to raise an operational alert without holding the
 * Resend key. Server to server only, behind `OPS_ALERT_SECRET`, which both
 * projects hold server side and neither ever exposes as `NEXT_PUBLIC_`.
 *
 * Excluded from the session proxy (there is no user on this call), so the
 * secret is the whole gate. The body is bounded by zod, and the caller is
 * rate limited, so a leaked secret can at worst send Brightex a capped
 * number of short, escaped alerts.
 */
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export async function POST(request: Request) {
  if (!bearerMatches(request.headers.get('authorization'), process.env.OPS_ALERT_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!limiter.check('storefront').ok) {
    return NextResponse.json({ error: 'Too many alerts' }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const parsed = opsAlertRelaySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // Keyed on the context too: two customers whose requests both failed are
  // two leads to call back, not one repeat to hold back.
  await reportOpsFailure({
    ...parsed.data,
    app: 'storefront',
    dedupeKey: `storefront:${parsed.data.area}:${parsed.data.summary}:${JSON.stringify(parsed.data.context ?? {})}`,
  });
  return NextResponse.json({ ok: true }, { status: 202 });
}
