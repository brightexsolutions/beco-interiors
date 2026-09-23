import type { createServerClient } from '@beco/supabase-client';
import type { Database } from '@beco/types';

type SupabaseClient = ReturnType<typeof createServerClient>;

type AuditActionValue = Database['public']['Enums']['audit_action'];

// Mirrors the audit_action enum in migration 00000000000001. A search param
// outside this set is treated as no filter rather than sent to Postgres,
// which would otherwise reject it as an invalid enum value.
const AUDIT_ACTION_VALUES = new Set<AuditActionValue>([
  'create',
  'update',
  'delete',
  'login',
  'send',
  'export',
  'assign',
]);

function isAuditActionValue(value: string): value is AuditActionValue {
  return (AUDIT_ACTION_VALUES as Set<string>).has(value);
}

export interface AuditRow {
  id: string;
  userId: string | null;
  actor: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface AuditFilters {
  search?: string | undefined;
  entity?: string | undefined;
  action?: string | undefined;
}

export async function fetchAuditLog(supabase: SupabaseClient, filters: AuditFilters = {}): Promise<AuditRow[]> {
  let query = supabase
    .from('audit_log')
    .select('id, user_id, action, entity_type, entity_id, before, after, created_at, users(full_name)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.entity) query = query.eq('entity_type', filters.entity);
  if (filters.action && isAuditActionValue(filters.action)) query = query.eq('action', filters.action);
  if (filters.search) {
    const term = filters.search.replace(/[%]/g, '');
    query = query.ilike('entity_type', `%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const users = row.users as { full_name?: string } | { full_name?: string }[] | null;
    const actor = Array.isArray(users) ? users[0]?.full_name : users?.full_name;
    return {
      id: row.id,
      userId: row.user_id,
      actor: actor ?? null,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      before: row.before,
      after: row.after,
      createdAt: row.created_at,
    };
  });
}

export const AUDIT_ACTIONS = ['create', 'update', 'delete', 'login'] as const;

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  login: 'Signed in',
};

const FIELD_LABELS: Record<string, string> = {
  key: 'Setting',
  value: 'Value',
  updated_at: 'Updated',
  updated_by: 'Updated by',
  created_at: 'Created',
  created_by: 'Created by',
  user_id: 'User',
  entity_id: 'Record',
  entity_type: 'Entity',
  full_name: 'Name',
  is_active: 'Active',
  vat_rate: 'VAT rate',
};

const SETTING_LABELS: Record<string, string> = {
  send_money_number: 'Send money number',
  paybill_number: 'Paybill number',
  paybill_account: 'Paybill account',
  till_number: 'Till number',
  bank_details: 'Bank details',
  vat_rate: 'VAT rate',
  quote_validity_days: 'Quote validity days',
  quote_footer: 'Quote footer',
  quote_response_sla_hours: 'Quote response SLA hours',
  notification_recipients: 'Notification recipients',
  brightex_allowed_emails: 'Brightex allowlist',
  whatsapp_number: 'WhatsApp number',
  business_phone: 'Business phone',
  payment_terms: 'Payment terms',
  site_launch_at: 'Launch date',
  site_launch_live: 'Launch live',
};

export function formatAuditWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Africa/Nairobi',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function humanizeAuditKey(key: string): string {
  return SETTING_LABELS[key] ?? FIELD_LABELS[key] ?? key.replace(/_/g, ' ');
}

export function formatAuditAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ');
}

export function formatAuditTitle(action: string, entityType: string): string {
  return `${formatAuditAction(action)} ${humanizeAuditKey(entityType)}`;
}

export interface AuditField {
  label: string;
  text: string;
}

function looksLikeIso(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function formatAuditScalar(value: unknown, field?: string, settingKey?: string): string {
  if (value == null || value === '') return 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number' && (field === 'vat_rate' || settingKey === 'vat_rate')) {
    return `${Math.round(value * 1000) / 10}%`;
  }
  if (typeof value === 'string') {
    if (field === 'key') return humanizeAuditKey(value);
    if (looksLikeIso(value)) return formatAuditWhen(value);
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'None';
    if (value.every((item) => typeof item !== 'object' || item == null)) {
      return value.map((item) => formatAuditScalar(item)).join(', ');
    }
    return `${value.length} items`;
  }
  if (typeof value === 'object') {
    return formatAuditFields(value)
      .map((fieldRow) => `${fieldRow.label}: ${fieldRow.text}`)
      .join('; ');
  }
  return String(value);
}

export function formatAuditFields(value: unknown): AuditField[] {
  if (value == null) return [];
  if (typeof value !== 'object' || Array.isArray(value)) {
    return [{ label: 'Value', text: formatAuditScalar(value) }];
  }
  const record = value as Record<string, unknown>;
  const settingKey = typeof record.key === 'string' ? record.key : undefined;
  return Object.entries(record).map(([key, fieldValue]) => ({
    label: humanizeAuditKey(key),
    text: formatAuditScalar(fieldValue, key, settingKey),
  }));
}
