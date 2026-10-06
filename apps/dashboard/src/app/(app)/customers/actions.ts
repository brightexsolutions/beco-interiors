'use server';

import { revalidatePath } from 'next/cache';
import { createCustomerSchema, deleteCustomerSchema, updateCustomerSchema } from '@beco/validation';
import { isAdminRole } from '@/lib/access';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import type { CustomerSummary } from '@/lib/customer-search';
import {
  insertCustomer,
  softDeleteCustomer,
  updateCustomerRecord,
  type CustomerWriteResult,
} from '@/lib/customer-records';

/**
 * Customer record actions, D130. Route gated in the action as well as the
 * proxy, validated with zod here (the server is the authority), and written
 * through the caller's own client so RLS decides what sticks:
 *
 *   create, edit   beco_sales, beco_admin, brightex_admin
 *   soft delete    beco_admin, brightex_admin
 *
 * The product manager reads the list but is refused here before the
 * database is asked, and the controls are not drawn for it.
 */

export interface CustomerActionState {
  error?: string;
  /** Which field the error belongs to, so the form can mark that input. */
  field?: string;
  ok?: string;
  customerId?: string;
  /** The record just created, so the quote form can pick it at once. */
  customer?: CustomerSummary;
  updatedAt?: string;
  /** The live customer that already holds this number. The form links to them. */
  existing?: CustomerSummary;
}

const WRITERS = new Set(['beco_sales', 'beco_admin', 'brightex_admin']);

const formFields = (form: FormData) => ({
  name: String(form.get('name') ?? ''),
  phone: String(form.get('phone') ?? ''),
  email: String(form.get('email') ?? ''),
  company: String(form.get('company') ?? ''),
  kraPin: String(form.get('kraPin') ?? ''),
  location: String(form.get('location') ?? ''),
  clientType: String(form.get('clientType') ?? ''),
  notes: String(form.get('notes') ?? ''),
});

const issueState = (issues: { message: string; path: PropertyKey[] }[]): CustomerActionState => {
  const first = issues[0];
  return {
    error: first?.message ?? 'Check the form, then try again.',
    ...(first?.path[0] ? { field: String(first.path[0]) } : {}),
  };
};

const failure = (result: Exclude<CustomerWriteResult, { ok: true }>): CustomerActionState => {
  if (result.reason === 'duplicate') {
    return {
      error: result.existing
        ? `That number already belongs to ${result.existing.name}.`
        : 'That number already belongs to another customer.',
      field: 'phone',
      ...(result.existing ? { existing: result.existing } : {}),
    };
  }
  if (result.reason === 'stale') {
    return { error: 'This customer changed while you were editing. Reload and try again.' };
  }
  return { error: result.message.includes('row-level security') ? 'You do not have permission to change customers.' : result.message };
};

export async function createCustomer(_prev: CustomerActionState, form: FormData): Promise<CustomerActionState> {
  const user = await requirePath('/customers');
  if (!WRITERS.has(user.role)) return { error: 'You do not have permission to add customers.' };
  const parsed = createCustomerSchema.safeParse(formFields(form));
  if (!parsed.success) return issueState(parsed.error.issues);

  const supabase = await getSupabase();
  const result = await insertCustomer(supabase, user.userId, parsed.data);
  if (!result.ok) return failure(result);

  revalidatePath('/customers');
  return {
    ok: `${parsed.data.name} added.`,
    customerId: result.id,
    customer: {
      id: result.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      company: parsed.data.company,
      kraPin: parsed.data.kraPin,
    },
    updatedAt: result.updatedAt,
  };
}

export async function updateCustomer(_prev: CustomerActionState, form: FormData): Promise<CustomerActionState> {
  const user = await requirePath('/customers');
  if (!WRITERS.has(user.role)) return { error: 'You do not have permission to change customers.' };
  const parsed = updateCustomerSchema.safeParse({
    ...formFields(form),
    customerId: String(form.get('customerId') ?? ''),
    updatedAt: String(form.get('updatedAt') ?? ''),
  });
  if (!parsed.success) return issueState(parsed.error.issues);

  const { customerId, updatedAt, ...fields } = parsed.data;
  const supabase = await getSupabase();
  const result = await updateCustomerRecord(supabase, customerId, updatedAt, fields);
  if (!result.ok) return failure(result);

  revalidatePath('/customers');
  revalidatePath(`/customers/${customerId}`);
  return { ok: 'Saved.', customerId, updatedAt: result.updatedAt };
}

export async function deleteCustomer(_prev: CustomerActionState, form: FormData): Promise<CustomerActionState> {
  const user = await requirePath('/customers');
  if (!isAdminRole(user.role)) return { error: 'Only an admin can delete a customer.' };
  const parsed = deleteCustomerSchema.safeParse({ customerId: String(form.get('customerId') ?? '') });
  if (!parsed.success) return { error: 'That customer is no longer here.' };

  const supabase = await getSupabase();
  const result = await softDeleteCustomer(supabase, parsed.data.customerId);
  if (!result.ok) return { error: result.message };

  revalidatePath('/customers');
  return { ok: 'Customer deleted.', customerId: parsed.data.customerId };
}
