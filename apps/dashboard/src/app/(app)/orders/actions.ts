'use server';

import { revalidatePath } from 'next/cache';
import { sendReceipt } from '@beco/documents';
import {
  convertQuoteToOrderSchema,
  markOrderPaidSchema,
  sendReceiptEmailSchema,
  setOrderStatusSchema,
} from '@beco/validation';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { orderMutationMessage } from '@/lib/order-errors';
import { fetchOrder } from '@/lib/order-detail';
import { persistReceiptPdf, receiptPdfFilename } from '@/lib/order-pdf';
import { fetchQuoteSettings } from '@/lib/quote-detail';
import { reportSendFailure } from '@/lib/ops-alert';
import { isDocumentPathFor } from '@/lib/document-path';

export interface OrderActionState {
  error?: string;
  ok?: string;
  orderReference?: string;
}

const lockFrom = (form: FormData) => ({
  orderId: String(form.get('orderId') ?? ''),
  updatedAt: String(form.get('updatedAt') ?? ''),
});

const revalidateOrder = (reference: string, quoteReference?: string | null) => {
  revalidatePath('/orders');
  revalidatePath(`/orders/${reference}`);
  revalidatePath('/quotes');
  if (quoteReference) revalidatePath(`/quotes/${quoteReference}`);
};

async function orderRow(orderId: string): Promise<{
  reference: string;
  quoteReference: string | null;
} | null> {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('orders')
    .select('reference_number, quote:quotes!orders_quote_id_fkey(reference_number)')
    .eq('id', orderId)
    .maybeSingle();
  if (!data) return null;
  const quote = data.quote as { reference_number: string } | { reference_number: string }[] | null;
  const quoteReference = Array.isArray(quote) ? (quote[0]?.reference_number ?? null) : (quote?.reference_number ?? null);
  return { reference: data.reference_number, quoteReference };
}

export async function convertQuoteToOrder(
  _prev: OrderActionState,
  form: FormData,
): Promise<OrderActionState> {
  await requirePath('/orders');
  const parsed = convertQuoteToOrderSchema.safeParse({
    quoteId: String(form.get('quoteId') ?? ''),
    updatedAt: String(form.get('updatedAt') ?? ''),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('convert_quote_to_order', {
    p_quote_id: parsed.data.quoteId,
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error || !data) return { error: orderMutationMessage(error) };

  const { data: quote } = await supabase
    .from('quotes')
    .select('reference_number')
    .eq('id', parsed.data.quoteId)
    .maybeSingle();

  revalidateOrder(data, quote?.reference_number);
  return { ok: `Order ${data} is ready.`, orderReference: data };
}

export async function setOrderStatus(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  await requirePath('/orders');
  const parsed = setOrderStatusSchema.safeParse({
    ...lockFrom(form),
    status: String(form.get('status') ?? ''),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the status' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('set_order_status', {
    p_order_id: parsed.data.orderId,
    p_status: parsed.data.status,
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: orderMutationMessage(error) };

  const row = await orderRow(parsed.data.orderId);
  if (row) revalidateOrder(row.reference, row.quoteReference);
  const labels: Record<string, string> = {
    confirmed: `${row?.reference ?? 'The order'} is confirmed.`,
    fulfilled: `${row?.reference ?? 'The order'} is fulfilled.`,
    cancelled: `${row?.reference ?? 'The order'} is cancelled.`,
  };
  return { ok: labels[parsed.data.status] ?? 'Status updated.' };
}

export async function markOrderPaid(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  const user = await requirePath('/orders');
  const parsed = markOrderPaidSchema.safeParse(lockFrom(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('mark_order_paid', {
    p_order_id: parsed.data.orderId,
    p_expected_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: orderMutationMessage(error) };

  const row = await orderRow(parsed.data.orderId);
  if (row) revalidateOrder(row.reference, row.quoteReference);

  const order = row ? await fetchOrder(supabase, row.reference) : null;
  if (order?.customerEmail) {
    const settings = await fetchQuoteSettings(supabase);
    const stored = await persistReceiptPdf(supabase, order, settings, user.userId);
    if (!stored.ok) {
      return { ok: `${order.reference} is marked paid. The receipt did not generate, open View receipt to try again.` };
    }
    const sent = await sendReceipt({
      to: order.customerEmail,
      reference: order.reference,
      customerName: order.customerName,
      pdf: stored.bytes,
      filename: receiptPdfFilename(order.reference, order.customerName),
    });
    if (sent.sent) {
      await supabase
        .from('documents')
        .update({
          sent_to: order.customerEmail,
          sent_at: new Date().toISOString(),
          sent_channel: 'email',
        })
        .eq('storage_path', stored.path)
        .eq('generated_by', user.userId);
      return { ok: `${order.reference} is marked paid. Receipt sent to ${order.customerEmail}.` };
    }
    await reportSendFailure(sent, {
      area: 'receipt.email',
      summary: `Receipt email for ${order.reference} did not send after it was marked paid`,
      context: { order: order.reference },
    });
    if (sent.reason === 'error') {
      return { ok: `${order.reference} is marked paid. The receipt email did not send, send it from View receipt.` };
    }
  }

  return { ok: `${row?.reference ?? 'The order'} is marked paid.` };
}

export async function sendOrderReceipt(
  _prev: OrderActionState,
  form: FormData,
): Promise<OrderActionState> {
  const user = await requirePath('/orders');
  const parsed = sendReceiptEmailSchema.safeParse({
    ...lockFrom(form),
    to: String(form.get('to') ?? ''),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Enter an email' };

  const supabase = await getSupabase();
  const { data: row } = await supabase
    .from('orders')
    .select('reference_number, payment_status')
    .eq('id', parsed.data.orderId)
    .maybeSingle();
  if (!row) return { error: 'That order is no longer here.' };
  if (row.payment_status !== 'paid') return { error: 'A receipt is only available after the order is marked paid.' };

  const [order, settings] = await Promise.all([
    fetchOrder(supabase, row.reference_number),
    fetchQuoteSettings(supabase),
  ]);
  if (!order) return { error: 'That order is no longer here.' };

  const stored = await persistReceiptPdf(supabase, order, settings, user.userId);
  if (!stored.ok) return { error: stored.error };

  const sent = await sendReceipt({
    to: parsed.data.to,
    reference: order.reference,
    customerName: order.customerName,
    pdf: stored.bytes,
    filename: receiptPdfFilename(order.reference, order.customerName),
  });
  if (!sent.sent) {
    await reportSendFailure(sent, {
      area: 'receipt.email',
      summary: `Receipt email for ${order.reference} did not send`,
      context: { order: order.reference },
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

  revalidateOrder(order.reference, order.quoteReference);
  return { ok: `Sent to ${parsed.data.to}.` };
}

export async function markReceiptSharedWhatsApp(reference: string, path: string): Promise<OrderActionState> {
  const user = await requirePath('/orders');
  if (!isDocumentPathFor('receipts', reference, path)) return { error: 'That document does not belong to this order.' };
  const supabase = await getSupabase();
  const { error } = await supabase
    .from('documents')
    .update({ sent_channel: 'whatsapp', sent_at: new Date().toISOString() })
    .eq('storage_path', path)
    .eq('generated_by', user.userId);
  if (error) return { error: 'Shared, but the send was not recorded.' };
  revalidatePath(`/orders/${reference}`);
  return { ok: 'Recorded as sent on WhatsApp.' };
}
