import type { StatCardProps } from '@beco/ui';
import { createServerClient } from '@beco/supabase-client';

type SupabaseClient = ReturnType<typeof createServerClient>;

/** The shape `dashboard_summary()` returns. Mirrors the jsonb built in
 *  migration 31; every figure is already computed against Africa/Nairobi
 *  boundaries there, so nothing in this file does date math. */
export interface DashboardSummary {
  awaiting: { count: number; oldest_hours: number; sla_hours: number };
  won: { count: number; value: number; prev_count: number; prev_value: number };
  conversion: { rate: number | null; prev_rate: number | null; decided: number };
  sales: { invoiced: number; collected: number; orders: number };
  catalogue: { published: number; unavailable: number; poa: number; draft: number; low_stock: number };
  leads: { submissions: number; whatsapp: number; calls: number; total: number };
}

export const EMPTY_SUMMARY: DashboardSummary = {
  awaiting: { count: 0, oldest_hours: 0, sla_hours: 2 },
  won: { count: 0, value: 0, prev_count: 0, prev_value: 0 },
  conversion: { rate: null, prev_rate: null, decided: 0 },
  sales: { invoiced: 0, collected: 0, orders: 0 },
  catalogue: { published: 0, unavailable: 0, poa: 0, draft: 0, low_stock: 0 },
  leads: { submissions: 0, whatsapp: 0, calls: 0, total: 0 },
};

export async function fetchDashboardSummary(supabase: SupabaseClient): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc('dashboard_summary');
  if (error) throw new Error(`Could not load the dashboard summary: ${error.message}`);
  return (data as DashboardSummary | null) ?? EMPTY_SUMMARY;
}

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n);

/** "3 hours", "45 minutes". Below an hour the figure in hours reads as 0.7,
 *  which nobody says out loud. */
export const humanAge = (hours: number): string => {
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  const rounded = Math.round(hours);
  return `${rounded} hour${rounded === 1 ? '' : 's'}`;
};

/** "vs 8 last month", and the awkward cases said plainly rather than as a
 *  percentage of zero, which is what produces "+Infinity%" on a dashboard. */
const versus = (now: number, before: number, noun: string): string => {
  if (before === 0) return now === 0 ? `None last month either` : `None last month`;
  return `vs ${before} ${noun} last month`;
};

/**
 * The summary as cards, in the order a director reads them: what needs doing
 * today, then how the month is going, then what the catalogue and the day's
 * leads look like.
 *
 * Pure, so the wording and especially the tone decisions are unit tested
 * without a database. Tone is the thing that matters most here: per D37 the
 * Warm Red card is a claim that someone must act today, so it is spent only
 * on a genuinely breached SLA, never on a merely non-zero number.
 */
export const toStatCards = (s: DashboardSummary): StatCardProps[] => {
  const breached = s.awaiting.count > 0 && s.awaiting.oldest_hours > s.awaiting.sla_hours;

  return [
    {
      label: 'Awaiting a response',
      value: String(s.awaiting.count),
      comparison:
        s.awaiting.count === 0
          ? 'Nothing waiting'
          : `Oldest has waited ${humanAge(s.awaiting.oldest_hours)}`,
      implication: breached
        ? `Past the ${humanAge(s.awaiting.sla_hours)} target. Answer the oldest first.`
        : undefined,
      tone: breached ? 'attention' : 'plain',
    },
    {
      label: 'Won this month',
      value: String(s.won.count),
      comparison: versus(s.won.count, s.won.prev_count, s.won.prev_count === 1 ? 'quote' : 'quotes'),
      implication: s.won.value > 0 ? `${money(s.won.value)} of business` : undefined,
      tone: s.won.count > 0 && s.won.count >= s.won.prev_count ? 'positive' : 'plain',
    },
    {
      label: 'Quote to won',
      // A month with nothing decided has no rate. Printing 0% would read as
      // a bad month rather than an empty one, and spelling that out in the
      // value slot puts a sentence where a figure belongs, at display size.
      // A short 'None' holds the shape; the line beneath says why.
      value: s.conversion.rate === null ? 'None' : `${s.conversion.rate}%`,
      comparison:
        s.conversion.prev_rate === null
          ? 'No decisions last month'
          : `vs ${s.conversion.prev_rate}% last month`,
      implication:
        s.conversion.decided > 0
          ? `${s.conversion.decided} quote${s.conversion.decided === 1 ? '' : 's'} decided`
          : 'Nothing won or lost yet this month',
      tone: 'plain',
    },
    {
      label: 'Invoiced this month',
      value: money(s.sales.invoiced),
      // Kept deliberately apart per D8. Billed is not banked, and one
      // blended "revenue" figure is how a business runs out of cash while
      // looking profitable.
      comparison: `${money(s.sales.collected)} collected`,
      implication:
        s.sales.invoiced > s.sales.collected
          ? `${money(s.sales.invoiced - s.sales.collected)} still owed`
          : undefined,
      tone: 'plain',
    },
    {
      label: 'Products live',
      value: String(s.catalogue.published),
      comparison:
        s.catalogue.draft > 0 ? `${s.catalogue.draft} not published` : 'Whole catalogue published',
      implication: [
        s.catalogue.low_stock > 0 ? `${s.catalogue.low_stock} at or below the low-stock mark` : null,
        s.catalogue.unavailable > 0 ? `${s.catalogue.unavailable} showing as unavailable` : null,
      ]
        .filter(Boolean)
        .join('. ') || undefined,
      tone: 'plain',
    },
    {
      label: 'Leads today',
      value: String(s.leads.total),
      comparison: `${s.leads.submissions} quoted, ${s.leads.whatsapp} WhatsApp, ${s.leads.calls} called`,
      // The only view that counts the leads that left the site entirely.
      implication:
        s.leads.whatsapp + s.leads.calls > 0
          ? `${s.leads.whatsapp + s.leads.calls} left the site to reach you`
          : undefined,
      tone: 'plain',
    },
  ];
};
