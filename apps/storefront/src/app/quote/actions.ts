'use server';

import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createRateLimiter, webQuoteSubmissionSchema } from '@beco/validation';
import { reportOpsFailure } from '../../lib/ops-alert';
import { relayQuoteConfirmation } from '../../lib/quote-confirmation';

/**
 * The public quote submission.
 *
 * Everything the browser sends is validated here with zod, and the product
 * details are read from the database rather than accepted from the request.
 * Client validation is for UX only; this is the authority.
 */
export type SubmitResult =
  | { ok: true; reference: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const anon = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

// App-level stopgap until the Cloudflare edge rule exists, per D81. Module
// scoped so the window survives across calls within one server instance;
// per instance and lost on deploy, which is the limitation the edge rule
// closes. Ten submissions a minute from one address is far above a real
// customer and well below a script.
const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

/** The caller's address, or null when there is no request scope, which in
    practice is only a direct call from a test. A null skips the limit. */
async function callerKey(): Promise<string | null> {
  try {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip');
    return ip ? `quote:${ip}` : 'quote:unknown';
  } catch {
    return null;
  }
}

export async function submitQuote(input: unknown): Promise<SubmitResult> {
  const key = await callerKey();
  if (key && !limiter.check(key).ok) {
    return {
      ok: false,
      error: 'Too many requests from here. Please wait a minute, or call us on 0722 333 730.',
    };
  }

  const parsed = webQuoteSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please check the highlighted fields.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data = parsed.data;

  // One database function, one transaction. Anonymous can call it but cannot
  // read the quotes table, and the function resolves products from the
  // catalogue itself, so the request never supplies a description or a price.
  // See migration 12 for why this is not two inserts from here.
  const { data: reference, error } = await anon().rpc('submit_quote', {
    p_customer_name: data.customerName,
    p_customer_phone: data.customerPhone,
    p_items: data.items.map((i) => ({ slug: i.slug, quantity: i.quantity })),
    p_customer_email: data.customerEmail || null,
    p_company: data.company ?? null,
    p_project_type: data.projectType ?? null,
    p_fulfilment: data.fulfilment ?? null,
    p_delivery_address: data.deliveryAddress ?? null,
    p_timeline: data.timeline ?? null,
    p_budget_note: data.budgetNote ?? null,
    p_project_details: data.projectDetails ?? null,
    p_wants_installation: data.wantsInstallation ?? false,
    p_wants_samples: data.wantsSamples ?? false,
  });

  if (error || !reference) {
    // 22023 is the function's own "you asked for something invalid", which is
    // safe to show. Anything else is ours, and the customer gets a way to
    // reach a human rather than a database message.
    const invalid = error?.code === '22023';
    if (!invalid) {
      // A real customer asked for a quote and it was not saved. The alert
      // carries enough to call them back, since the lead is otherwise lost.
      await reportOpsFailure({
        area: 'quote.submit',
        summary: 'A website quote request did not save, call the customer back',
        detail: error?.message ?? 'submit_quote returned no reference',
        context: {
          customer: data.customerName,
          phone: data.customerPhone,
          items: data.items.length,
          code: error?.code ?? null,
        },
      });
    }
    return {
      ok: false,
      error: invalid
        ? 'None of those products are available. Please start again.'
        : 'We could not save your request. Please call us on 0722 333 730.',
    };
  }

  // The confirmation email is not sent from here: this app never holds the
  // Resend key, so a fully compromised storefront leaks nothing but the anon
  // key. The dashboard sends it on request, behind the relay secret (D109).
  // The quote is saved whatever happens next, so a relay failure is logged
  // and alerted, never shown to the customer as a failed request.
  if (data.customerEmail) {
    await relayQuoteConfirmation({
      reference: reference as string,
      customerName: data.customerName,
      to: data.customerEmail,
      itemCount: data.items.length,
    });
  }
  return { ok: true, reference: reference as string };
}
