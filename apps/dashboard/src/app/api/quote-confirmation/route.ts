import { NextResponse } from 'next/server';
import { sendQuoteConfirmation } from '@beco/documents';
import { bearerMatches, createRateLimiter, quoteConfirmationRelaySchema } from '@beco/validation';
import { reportOpsFailure } from '@/lib/ops-alert';

/**
 * The storefront's way to send a customer their quote confirmation without
 * holding the Resend key (D109). Server to server only, behind the relay
 * secret `OPS_ALERT_SECRET`, the same one `/api/ops-alert` uses, so the two
 * projects share one value rather than two that can drift.
 *
 * Excluded from the session proxy, since there is no user on this call. The
 * body is bounded by zod and the caller is rate limited. A send failure is
 * reported as an operational alert here, where the Resend error is visible,
 * and answered with 502 so the storefront can log it on its side too.
 */
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export async function POST(request: Request) {
  if (!(await bearerMatches(request.headers.get('authorization'), process.env.OPS_ALERT_SECRET))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!limiter.check('storefront').ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const parsed = quoteConfirmationRelaySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const sent = await sendQuoteConfirmation(parsed.data);
  if (!sent.sent) {
    if (sent.reason === 'error') {
      await reportOpsFailure({
        area: 'quote.confirmation',
        summary: `Confirmation email for ${parsed.data.reference} did not send`,
        detail: sent.detail,
        context: { quote: parsed.data.reference, to: parsed.data.to },
        dedupeKey: `quote.confirmation:${parsed.data.reference}`,
      });
    }
    return NextResponse.json({ sent: false, reason: sent.reason }, { status: sent.reason === 'no-api-key' ? 202 : 502 });
  }
  return NextResponse.json({ sent: true }, { status: 202 });
}
