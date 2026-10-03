'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendPricedQuote } from '@beco/documents';
import {
  addCatalogueLineSchema,
  addCatalogueLinesSchema,
  addCustomLineSchema,
  approveQuoteSchema,
  assignQuoteSchema,
  claimQuoteSchema,
  createCounterQuoteSchema,
  reopenQuoteSchema,
  sendQuoteEmailSchema,
  setQuoteStatusSchema,
  updateQuoteLineSchema,
  updateQuoteLinesSchema,
} from '@beco/validation';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { mutationMessage } from '@/lib/quote-errors';
import { fetchQuote, fetchQuoteSettings, type QuoteDetail } from '@/lib/quote-detail';
import { persistQuotePdf, quotePdfFilename } from '@/lib/quote-pdf';
import { reportSendFailure } from '@/lib/ops-alert';
import { isDocumentPathFor } from '@/lib/document-path';

export interface QuoteActionState {
  error?: string;
  ok?: string;
  updatedAt?: string;
}

const lockFrom = (form: FormData) => ({
  quoteId: String(form.get('quoteId') ?? ''),
  updatedAt: String(form.get('updatedAt') ?? ''),
});

const revalidateQuote = (reference: string) => {
  revalidatePath('/quotes');
  revalidatePath(`/quotes/${reference}`);
};

async function referenceOf(quoteId: string): Promise<string> {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('quotes')
    .select('reference_number')
    .eq('id', quoteId)
    .maybeSingle();
  return data?.reference_number ?? quoteId;
}

export async function claimQuote(_prev: QuoteActionState, form: FormData): Promise<QuoteActionState> {
  await requirePath('/quotes');
  const parsed = claimQuoteSchema.safeParse(lockFrom(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('claim_quote', {
    p_quote_id: parsed.data.quoteId,
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: mutationMessage(error) };

  const reference = await referenceOf(parsed.data.quoteId);
  revalidateQuote(reference);
  return { ok: 'This quote is now yours.' };
}

export async function assignQuote(_prev: QuoteActionState, form: FormData): Promise<QuoteActionState> {
  const user = await requirePath('/quotes');
  if (user.role !== 'beco_admin' && user.role !== 'brightex_admin') {
    return { error: 'You do not have permission to change this quote.' };
  }
  const parsed = assignQuoteSchema.safeParse({
    ...lockFrom(form),
    assigneeId: String(form.get('assigneeId') ?? ''),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Choose a salesperson first.' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('assign_quote', {
    p_quote_id: parsed.data.quoteId,
    p_assignee_id: parsed.data.assigneeId,
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: mutationMessage(error) };

  const reference = await referenceOf(parsed.data.quoteId);
  revalidateQuote(reference);
  return { ok: 'Assigned. They can price and issue it.' };
}

export async function updateQuoteLine(_prev: QuoteActionState, form: FormData): Promise<QuoteActionState> {
  await requirePath('/quotes');
  const parsed = updateQuoteLineSchema.safeParse({
    ...lockFrom(form),
    lineId: String(form.get('lineId') ?? ''),
    quantity: form.get('quantity'),
    unitPrice: form.get('unitPrice'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check quantity and price, then try again.' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('update_quote_line', {
    p_quote_id: parsed.data.quoteId,
    p_line_id: parsed.data.lineId,
    p_quantity: parsed.data.quantity,
    p_unit_price: parsed.data.unitPrice,
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: mutationMessage(error) };

  const reference = await referenceOf(parsed.data.quoteId);
  revalidateQuote(reference);
  return { ok: 'Item updated.' };
}

export async function updateQuoteLines(_prev: QuoteActionState, form: FormData): Promise<QuoteActionState> {
  await requirePath('/quotes');
  let items: unknown = [];
  try {
    items = JSON.parse(String(form.get('items') ?? '[]'));
  } catch {
    return { error: 'Nothing to save' };
  }
  const parsed = updateQuoteLinesSchema.safeParse({
    ...lockFrom(form),
    items,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check quantity and price, then try again.' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('update_quote_lines', {
    p_quote_id: parsed.data.quoteId,
    p_items: parsed.data.items.map((item) => ({
      line_id: item.lineId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: mutationMessage(error) };

  const { data } = await supabase
    .from('quotes')
    .select('reference_number, updated_at')
    .eq('id', parsed.data.quoteId)
    .maybeSingle();
  const reference = data?.reference_number ?? (await referenceOf(parsed.data.quoteId));
  revalidateQuote(reference);
  return {
    ok: parsed.data.items.length === 1 ? 'Item updated.' : 'Items saved.',
    // exactOptionalPropertyTypes: only include the key when there is a value, since
    // `updatedAt: undefined` is not the same as omitting updatedAt entirely.
    ...(data?.updated_at ? { updatedAt: data.updated_at } : {}),
  };
}

export async function addCustomLine(_prev: QuoteActionState, form: FormData): Promise<QuoteActionState> {
  await requirePath('/quotes');
  const parsed = addCustomLineSchema.safeParse({
    ...lockFrom(form),
    description: String(form.get('description') ?? ''),
    quantity: form.get('quantity'),
    unitPrice: form.get('unitPrice'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Name the item, then add it.' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('add_custom_quote_line', {
    p_quote_id: parsed.data.quoteId,
    p_description: parsed.data.description,
    p_quantity: parsed.data.quantity,
    p_unit_price: parsed.data.unitPrice,
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: mutationMessage(error) };

  const reference = await referenceOf(parsed.data.quoteId);
  revalidateQuote(reference);
  return { ok: 'Item added to the quote.' };
}

export async function addCatalogueLine(_prev: QuoteActionState, form: FormData): Promise<QuoteActionState> {
  await requirePath('/quotes');
  const parsed = addCatalogueLineSchema.safeParse({
    ...lockFrom(form),
    productId: String(form.get('productId') ?? ''),
    quantity: form.get('quantity'),
    unitPrice: form.get('unitPrice'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Pick a product from the catalogue.' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('add_catalogue_quote_line', {
    p_quote_id: parsed.data.quoteId,
    p_product_id: parsed.data.productId,
    p_quantity: parsed.data.quantity,
    p_unit_price: parsed.data.unitPrice,
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: mutationMessage(error) };

  const reference = await referenceOf(parsed.data.quoteId);
  revalidateQuote(reference);
  return { ok: 'Item added to the quote.' };
}

export async function addCatalogueLines(_prev: QuoteActionState, form: FormData): Promise<QuoteActionState> {
  await requirePath('/quotes');
  let items: unknown = [];
  try {
    items = JSON.parse(String(form.get('items') ?? '[]'));
  } catch {
    return { error: 'Pick at least one product' };
  }
  const parsed = addCatalogueLinesSchema.safeParse({
    ...lockFrom(form),
    items,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Pick products from the catalogue.' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('add_catalogue_quote_lines', {
    p_quote_id: parsed.data.quoteId,
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: mutationMessage(error) };

  const reference = await referenceOf(parsed.data.quoteId);
  revalidateQuote(reference);
  const n = parsed.data.items.length;
  return { ok: n === 1 ? 'Item added to the quote.' : `${n} items added to the quote.` };
}

export async function setQuoteStatus(_prev: QuoteActionState, form: FormData): Promise<QuoteActionState> {
  await requirePath('/quotes');
  const parsed = setQuoteStatusSchema.safeParse({
    ...lockFrom(form),
    status: String(form.get('status') ?? ''),
    lostReason: String(form.get('lostReason') ?? '') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the status' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('set_quote_status', {
    p_quote_id: parsed.data.quoteId,
    p_status: parsed.data.status,
    // set_quote_status only reads p_lost_reason when p_status is 'lost' (it nulls the
    // column otherwise regardless of this value), so an empty string is equivalent to
    // null here and matches the generated arg type, which is `string`, not nullable.
    p_lost_reason: parsed.data.lostReason ?? '',
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: mutationMessage(error) };

  const reference = await referenceOf(parsed.data.quoteId);
  revalidateQuote(reference);
  return { ok: `Marked ${parsed.data.status}.` };
}

export async function approveQuote(_prev: QuoteActionState, form: FormData): Promise<QuoteActionState> {
  const user = await requirePath('/quotes');
  if (user.role !== 'beco_admin' && user.role !== 'brightex_admin') {
    return { error: 'You do not have permission to change this quote.' };
  }
  const parsed = approveQuoteSchema.safeParse(lockFrom(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('approve_quote', {
    p_quote_id: parsed.data.quoteId,
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: mutationMessage(error) };

  const reference = await referenceOf(parsed.data.quoteId);
  revalidateQuote(reference);
  return { ok: 'Quote approved.' };
}

export async function reissueQuote(_prev: QuoteActionState, form: FormData): Promise<QuoteActionState> {
  await requirePath('/quotes');
  const parsed = approveQuoteSchema.safeParse(lockFrom(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('reissue_quote', {
    p_quote_id: parsed.data.quoteId,
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: mutationMessage(error) };

  const reference = await referenceOf(parsed.data.quoteId);
  revalidateQuote(reference);
  return { ok: 'Validity extended. Generate the PDF again to print the new date.' };
}

export async function reopenQuote(_prev: QuoteActionState, form: FormData): Promise<QuoteActionState> {
  await requirePath('/quotes');
  const parsed = reopenQuoteSchema.safeParse(lockFrom(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('reopen_quote', {
    p_quote_id: parsed.data.quoteId,
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: mutationMessage(error) };

  const reference = await referenceOf(parsed.data.quoteId);
  revalidateQuote(reference);
  return { ok: 'Quote reopened. It is reviewing again.' };
}

export async function createCounterQuote(
  _prev: QuoteActionState,
  form: FormData,
): Promise<QuoteActionState> {
  await requirePath('/quotes');

  let items: unknown = [];
  try {
    items = JSON.parse(String(form.get('items') ?? '[]'));
  } catch {
    return { error: 'Add at least one item' };
  }

  const parsed = createCounterQuoteSchema.safeParse({
    customerName: form.get('customerName'),
    customerPhone: form.get('customerPhone'),
    customerEmail: form.get('customerEmail') ?? '',
    source: form.get('source'),
    items,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('create_counter_quote', {
    p_customer_name: parsed.data.customerName,
    p_customer_phone: parsed.data.customerPhone,
    p_source: parsed.data.source,
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId ?? null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
    // exactOptionalPropertyTypes: p_customer_email is an optional key, so it must be
    // left out entirely rather than set to undefined when there is no email.
    ...(parsed.data.customerEmail ? { p_customer_email: parsed.data.customerEmail } : {}),
  });
  if (error || !data) return { error: mutationMessage(error) };

  revalidatePath('/quotes');
  redirect(`/quotes/${data}`);
}

async function storeQuotePdf(reference: string): Promise<
  | { ok: true; bytes: Buffer; path: string; isPriced: boolean; quote: QuoteDetail }
  | { ok: false; error: string }
> {
  const user = await requirePath('/quotes');
  const supabase = await getSupabase();
  const [quote, settings] = await Promise.all([
    fetchQuote(supabase, reference),
    fetchQuoteSettings(supabase),
  ]);
  if (!quote) return { ok: false, error: 'That quote is no longer here.' };
  const stored = await persistQuotePdf(supabase, quote, settings, user.userId);
  return stored.ok ? { ...stored, quote } : stored;
}

export async function sendQuoteEmail(
  _prev: QuoteActionState,
  form: FormData,
): Promise<QuoteActionState> {
  const user = await requirePath('/quotes');
  const parsed = sendQuoteEmailSchema.safeParse({
    ...lockFrom(form),
    to: String(form.get('to') ?? ''),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Enter an email' };

  const supabase = await getSupabase();
  const { data: row } = await supabase
    .from('quotes')
    .select('reference_number, customer_name, valid_until')
    .eq('id', parsed.data.quoteId)
    .maybeSingle();
  if (!row) return { error: 'That quote is no longer here.' };

  const stored = await storeQuotePdf(row.reference_number);
  if (!stored.ok) return { error: stored.error };

  const sent = await sendPricedQuote({
    to: parsed.data.to,
    reference: row.reference_number,
    customerName: row.customer_name,
    validUntil: row.valid_until,
    isPriced: stored.isPriced,
    // The lines and the total in the body, so the figure reads in the inbox
    // before the attachment is opened (D109).
    lines: stored.quote.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      lineTotal: line.unitPrice > 0 ? line.lineTotal : null,
    })),
    totals: stored.quote.totals,
    vatRate: stored.quote.vatRate,
    pdf: stored.bytes,
    filename: quotePdfFilename(row.reference_number, row.customer_name),
  });
  if (!sent.sent) {
    await reportSendFailure(sent, {
      area: 'quote.email',
      summary: `Quote email for ${row.reference_number} did not send`,
      context: { quote: row.reference_number },
    });
    return {
      error:
        sent.reason === 'no-api-key'
          ? 'Email is not configured on this machine. Download the PDF instead.'
          : `Could not send the email${sent.detail ? `: ${sent.detail}` : '.'}`,
    };
  }

  await supabase
    .from('documents')
    .update({
      sent_to: parsed.data.to,
      sent_at: new Date().toISOString(),
      sent_channel: 'email',
    })
    .eq('storage_path', stored.path)
    .eq('generated_by', user.userId);

  revalidateQuote(row.reference_number);
  return { ok: `Sent to ${parsed.data.to}.` };
}

export async function markQuoteSharedWhatsApp(reference: string, path: string): Promise<QuoteActionState> {
  const user = await requirePath('/quotes');
  // Only a path this quote's own download produced, so a crafted call
  // cannot stamp another quote's document as sent.
  if (!isDocumentPathFor('quotes', reference, path)) return { error: 'That document does not belong to this quote.' };
  const supabase = await getSupabase();
  const { error } = await supabase
    .from('documents')
    .update({
      sent_channel: 'whatsapp',
      sent_at: new Date().toISOString(),
    })
    .eq('storage_path', path)
    .eq('generated_by', user.userId);
  if (error) return { error: 'Shared, but the send was not recorded.' };
  revalidateQuote(reference);
  return { ok: 'Recorded as sent on WhatsApp.' };
}
