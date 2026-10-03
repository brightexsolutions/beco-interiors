import 'server-only';
import { reportOpsFailure } from './ops-alert';

/**
 * Asks the dashboard to send the customer their confirmation (D109). The
 * storefront never holds the Resend key, so the send happens there, behind
 * the same relay secret the failure alerts use.
 *
 * Never throws and gives up after a few seconds: the quote is already saved
 * by the time this runs, and a customer is never kept waiting on their own
 * confirmation email. A failure is logged here and raised as an alert, since
 * a customer who gave an address and heard nothing is a lead going cold.
 */
export interface QuoteConfirmationRequest {
  reference: string;
  customerName: string;
  to: string;
  itemCount: number;
}

export async function relayQuoteConfirmation(input: QuoteConfirmationRequest): Promise<boolean> {
  const origin = process.env.DASHBOARD_URL;
  const secret = process.env.OPS_ALERT_SECRET;
  if (!origin || !secret) {
    console.warn(JSON.stringify({ event: 'quote_confirmation_skipped', reason: 'relay not configured', reference: input.reference }));
    return false;
  }

  try {
    const response = await fetch(`${origin.replace(/\/$/, '')}/api/quote-confirmation`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(4_000),
    });
    if (response.ok) return true;
    await reportOpsFailure({
      area: 'quote.confirmation.relay',
      summary: `Confirmation email for ${input.reference} was not accepted by the dashboard`,
      detail: `HTTP ${response.status}`,
      context: { quote: input.reference, to: input.to },
    });
    return false;
  } catch (cause) {
    await reportOpsFailure({
      area: 'quote.confirmation.relay',
      summary: `Confirmation email for ${input.reference} could not reach the dashboard`,
      detail: cause instanceof Error ? cause.message : String(cause),
      context: { quote: input.reference, to: input.to },
    });
    return false;
  }
}
