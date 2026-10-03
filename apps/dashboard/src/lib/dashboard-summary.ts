import type { StatCardDelta, StatCardProps } from '@beco/ui';
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

/** A trend chip against last month, or none when there is nothing to compare. */
const trend = (now: number, before: number, unit = ''): StatCardDelta | undefined => {
  if (before === 0 && now === 0) return undefined;
  const diff = Math.round((now - before) * 10) / 10;
  if (diff === 0) return { direction: 'flat', label: 'Level', sentiment: 'neutral' };
  return {
    direction: diff > 0 ? 'up' : 'down',
    label: `${diff > 0 ? '+' : ''}${diff}${unit}`,
    sentiment: diff > 0 ? 'good' : 'bad',
  };
};

/** A month tile: the card, plus where tapping it goes. */
export type HomeCard = Omit<StatCardProps, 'action'> & { href: string; actionLabel: string };

export interface HomeFocus {
  waiting: number;
  /** "Oldest has waited 3 hours", or "Nothing waiting". */
  waitingLine: string;
  breached: boolean;
  /** "Past the 2 hours target" when breached, else the target itself. */
  slaLine: string;
  owed: number;
  owedLabel: string | null;
  lowStock: number;
  drafts: number;
}

/**
 * What needs someone today, for the charcoal panel at the top of home.
 * Warm Red is spent only on a genuinely breached SLA, never on a merely
 * non-zero count, so a busy morning inside the target does not read as a
 * problem and a panel that is always red is not ignored.
 */
export const toFocus = (s: DashboardSummary): HomeFocus => {
  const breached = s.awaiting.count > 0 && s.awaiting.oldest_hours > s.awaiting.sla_hours;
  const owed = Math.max(0, s.sales.invoiced - s.sales.collected);
  return {
    waiting: s.awaiting.count,
    waitingLine:
      s.awaiting.count === 0 ? 'Nothing waiting' : `Oldest has waited ${humanAge(s.awaiting.oldest_hours)}`,
    breached,
    slaLine: breached
      ? `Past the ${humanAge(s.awaiting.sla_hours)} target. Answer the oldest first.`
      : `Target: answer within ${humanAge(s.awaiting.sla_hours)}`,
    owed,
    owedLabel: owed > 0 ? money(owed) : null,
    lowStock: s.catalogue.low_stock,
    drafts: s.catalogue.draft,
  };
};

/**
 * How the month is going, in the order a director reads it. Each tile names
 * its comparison, carries the one visual that helps (a trend, a meter, a
 * split), and links to the screen behind the figure.
 *
 * Pure, so the wording and the tone decisions are unit tested without a
 * database. None of these is ever Warm Red: the attention colour is spent
 * in the focus panel above, per the page budget.
 */
export const toStatCards = (s: DashboardSummary): HomeCard[] => {
  const decidedLine =
    s.conversion.decided > 0
      ? `${s.conversion.decided} quote${s.conversion.decided === 1 ? '' : 's'} decided`
      : 'Nothing won or lost yet this month';
  const paidShare = s.sales.invoiced > 0 ? s.sales.collected / s.sales.invoiced : 0;

  return [
    {
      label: 'Won this month',
      value: String(s.won.count),
      delta: trend(s.won.count, s.won.prev_count),
      comparison: versus(s.won.count, s.won.prev_count, s.won.prev_count === 1 ? 'quote' : 'quotes'),
      implication: s.won.value > 0 ? `${money(s.won.value)} of business` : undefined,
      tone: s.won.count > 0 && s.won.count >= s.won.prev_count ? 'positive' : 'plain',
      href: '/quotes?owner=all&status=won',
      actionLabel: 'Won quotes',
    },
    {
      label: 'Quote to won',
      // A month with nothing decided has no rate. Printing 0% would read as
      // a bad month rather than an empty one. A short 'None' holds the
      // shape; the line beneath says why.
      value: s.conversion.rate === null ? 'None' : `${s.conversion.rate}%`,
      delta:
        s.conversion.rate !== null && s.conversion.prev_rate !== null
          ? trend(s.conversion.rate, s.conversion.prev_rate, ' pts')
          : undefined,
      meter: s.conversion.rate === null ? undefined : { value: s.conversion.rate / 100, label: decidedLine },
      comparison:
        s.conversion.prev_rate === null ? 'No decisions last month' : `vs ${s.conversion.prev_rate}% last month`,
      implication: s.conversion.rate === null ? decidedLine : undefined,
      tone: 'plain',
      href: '/reports',
      actionLabel: 'Conversion report',
    },
    {
      label: 'Invoiced this month',
      value: money(s.sales.invoiced),
      // Kept deliberately apart per D8. Billed is not banked.
      meter: s.sales.invoiced > 0 ? { value: paidShare, label: `${money(s.sales.collected)} collected` } : undefined,
      comparison: s.sales.invoiced > 0 ? undefined : `${money(s.sales.collected)} collected`,
      implication:
        s.sales.invoiced > s.sales.collected
          ? `${money(s.sales.invoiced - s.sales.collected)} still owed`
          : undefined,
      tone: 'plain',
      href: '/orders?payment=unpaid',
      actionLabel: 'Unpaid orders',
    },
    {
      label: 'Leads today',
      value: String(s.leads.total),
      // The only view that counts the leads that left the site entirely.
      segments: [
        { label: 'quoted', value: s.leads.submissions },
        { label: 'WhatsApp', value: s.leads.whatsapp },
        { label: 'called', value: s.leads.calls },
      ],
      implication:
        s.leads.whatsapp + s.leads.calls > 0
          ? `${s.leads.whatsapp + s.leads.calls} left the site to reach you`
          : undefined,
      tone: 'plain',
      href: '/reports',
      actionLabel: 'Lead sources',
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
      href: '/products',
      actionLabel: 'Catalogue',
    },
  ];
};
