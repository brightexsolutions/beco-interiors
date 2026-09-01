'use server';

import { createClient } from '@supabase/supabase-js';
import { webQuoteSubmissionSchema } from '@beco/validation';

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

export async function submitQuote(input: unknown): Promise<SubmitResult> {
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
  });

  if (error || !reference) {
    // 22023 is the function's own "you asked for something invalid", which is
    // safe to show. Anything else is ours, and the customer gets a way to
    // reach a human rather than a database message.
    const invalid = error?.code === '22023';
    return {
      ok: false,
      error: invalid
        ? 'None of those products are available. Please start again.'
        : 'We could not save your request. Please call us on 0722 333 730.',
    };
  }

  return { ok: true, reference: reference as string };
}
