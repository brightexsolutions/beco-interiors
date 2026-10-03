import type { createServerClient } from '@beco/supabase-client';
import type { Stage, TrendPoint } from '@beco/ui';

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Weekly activity and the pipeline, from `activity_series()` and
 * `quote_pipeline()` (migration 59). Both are security invoker, so a role
 * that cannot read orders simply sees zero money, and nothing here does
 * date maths: every week boundary is a Nairobi Monday chosen in Postgres.
 */
export interface ActivityWeek {
  weekStart: string;
  raised: number;
  won: number;
  lost: number;
  wonValue: number;
  invoiced: number;
  collected: number;
}

export interface Pipeline {
  new: number;
  reviewing: number;
  quoted: number;
  won: number;
  lost: number;
}

export const EMPTY_PIPELINE: Pipeline = { new: 0, reviewing: 0, quoted: 0, won: 0, lost: 0 };

const num = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const toActivityWeek = (row: Record<string, unknown>): ActivityWeek => ({
  weekStart: String(row.week_start ?? ''),
  raised: num(row.raised),
  won: num(row.won),
  lost: num(row.lost),
  wonValue: num(row.won_value),
  invoiced: num(row.invoiced),
  collected: num(row.collected),
});

export async function fetchActivitySeries(supabase: SupabaseClient, weeks = 8): Promise<ActivityWeek[]> {
  const { data, error } = await supabase.rpc('activity_series', { p_weeks: weeks });
  if (error) throw new Error(`Could not load the weekly activity: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map(toActivityWeek);
}

export async function fetchPipeline(supabase: SupabaseClient): Promise<Pipeline> {
  const { data, error } = await supabase.rpc('quote_pipeline');
  if (error) throw new Error(`Could not load the pipeline: ${error.message}`);
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    new: num(raw.new),
    reviewing: num(raw.reviewing),
    quoted: num(raw.quoted),
    won: num(raw.won),
    lost: num(raw.lost),
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "29 Sep" from "2026-09-29": the Monday the week starts, as a reader says it. */
export const weekLabel = (ymd: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!match) return ymd;
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1] ?? ''}`.trim();
};

/** Quotes raised beside quotes won, one point per week. */
export const toQuotePoints = (weeks: ActivityWeek[]): TrendPoint[] =>
  weeks.map((week) => ({ label: weekLabel(week.weekStart), raised: week.raised, won: week.won }));

/** Invoiced beside collected, one point per week, in whole shillings. */
export const toMoneyPoints = (weeks: ActivityWeek[]): TrendPoint[] =>
  weeks.map((week) => ({
    label: weekLabel(week.weekStart),
    invoiced: Math.round(week.invoiced),
    collected: Math.round(week.collected),
  }));

/** The pipeline as stages from first to last. New quotes take the
 *  attention colour only when some have waited past the response target. */
export const toStages = (pipeline: Pipeline, breached: boolean): Stage[] => [
  { key: 'new', label: 'New', value: pipeline.new, attention: breached && pipeline.new > 0 },
  { key: 'reviewing', label: 'Reviewing', value: pipeline.reviewing },
  { key: 'quoted', label: 'Quoted', value: pipeline.quoted },
  { key: 'won', label: 'Won', value: pipeline.won },
  { key: 'lost', label: 'Lost', value: pipeline.lost },
];

/** True when there is anything at all to chart, so an empty week run is
 *  not drawn as eight bars of nothing. */
export const hasActivity = (weeks: ActivityWeek[]): boolean =>
  weeks.some((week) => week.raised > 0 || week.won > 0 || week.invoiced > 0 || week.collected > 0);
