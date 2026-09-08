import { Resend } from 'resend';
import { buildQuoteConfirmationEmail, type QuoteConfirmationInput } from './quote-confirmation';

/**
 * Sending the quote confirmation.
 *
 * The quote is already saved by the time this runs, so a failure here is
 * never allowed to change the submission result. Every path returns a
 * value rather than throwing, and the caller logs it and moves on.
 *
 * With no RESEND_API_KEY, for example a local machine or a preview with no
 * secret, this is a no-op that says so. That is deliberate: the form still
 * works end to end without an email provider wired up.
 *
 * `from` must be an address on a domain verified in Resend. Set
 * QUOTE_FROM_EMAIL once beco.co.ke is verified; the default is there so the
 * shape is obvious, not because it will deliver unverified.
 */
export type SendResult =
  | { sent: true; id: string }
  | { sent: false; reason: 'no-api-key' | 'error'; detail?: string | undefined };

const DEFAULT_FROM = 'Beco Interiors <quotes@beco.co.ke>';

export async function sendQuoteConfirmation(
  input: QuoteConfirmationInput & { to: string },
): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('sendQuoteConfirmation: RESEND_API_KEY not set, skipping the email');
    return { sent: false, reason: 'no-api-key' };
  }

  const { subject, text, html } = buildQuoteConfirmationEmail(input);

  try {
    const { data, error } = await new Resend(key).emails.send({
      from: process.env.QUOTE_FROM_EMAIL ?? DEFAULT_FROM,
      to: input.to,
      subject,
      text,
      html,
    });
    if (error || !data) {
      console.error('sendQuoteConfirmation: Resend returned an error', error);
      return { sent: false, reason: 'error', detail: error?.message };
    }
    return { sent: true, id: data.id };
  } catch (cause) {
    console.error('sendQuoteConfirmation: threw', cause);
    return { sent: false, reason: 'error', detail: cause instanceof Error ? cause.message : undefined };
  }
}
