import { createServerClient } from '@beco/supabase-client';

type SupabaseClient = ReturnType<typeof createServerClient>;

export type ReportPeriod = 'this_month' | 'last_month';

export interface LeaderboardPerson {
  id: string;
  full_name: string;
  raised: number;
  won: number;
  lost: number;
  won_value: number;
  conversion: number | null;
  orders: number;
  order_value: number;
}

export interface LeaderboardReport {
  period: string;
  invoiced: number;
  collected: number;
  people: LeaderboardPerson[];
}

export interface ConversionRow {
  id: string;
  name: string;
  category?: string;
  views: number;
  add_to_cart: number;
  quote_submitted: number;
  whatsapp: number;
  calls: number;
  view_to_cart: number | null;
  cart_to_quote: number | null;
}

export interface ConversionReport {
  period: string;
  products: ConversionRow[];
  categories: ConversionRow[];
}

const EMPTY_LEADERBOARD: LeaderboardReport = {
  period: 'This month',
  invoiced: 0,
  collected: 0,
  people: [],
};

const EMPTY_CONVERSION: ConversionReport = {
  period: 'This month',
  products: [],
  categories: [],
};

export const parsePeriod = (value: string | undefined): ReportPeriod =>
  value === 'last_month' ? 'last_month' : 'this_month';

export type ReportView = 'sales' | 'products' | 'categories';

export const parseView = (value: string | undefined): ReportView =>
  value === 'products' || value === 'categories' ? value : 'sales';

export const reportFigures = (leaderboard: LeaderboardReport) => {
  const raised = leaderboard.people.reduce((sum, person) => sum + person.raised, 0);
  const won = leaderboard.people.reduce((sum, person) => sum + person.won, 0);
  return {
    raised,
    won,
    conversion: raised === 0 ? null : Math.round((won / raised) * 1000) / 10,
  };
};

export const funnelTotals = (rows: ConversionRow[]) =>
  rows.reduce(
    (sum, row) => ({
      views: sum.views + row.views,
      add_to_cart: sum.add_to_cart + row.add_to_cart,
      quote_submitted: sum.quote_submitted + row.quote_submitted,
    }),
    { views: 0, add_to_cart: 0, quote_submitted: 0 },
  );

export async function fetchLeaderboard(
  supabase: SupabaseClient,
  period: ReportPeriod,
): Promise<LeaderboardReport> {
  const { data, error } = await supabase.rpc('salesperson_leaderboard', { p_period: period });
  if (error) throw new Error(`Could not load the leaderboard: ${error.message}`);
  return (data as LeaderboardReport | null) ?? EMPTY_LEADERBOARD;
}

export async function fetchConversionReport(
  supabase: SupabaseClient,
  period: ReportPeriod,
): Promise<ConversionReport> {
  const { data, error } = await supabase.rpc('conversion_report', { p_period: period });
  if (error) throw new Error(`Could not load the conversion report: ${error.message}`);
  return (data as ConversionReport | null) ?? EMPTY_CONVERSION;
}

export const rateLabel = (value: number | null): string => (value == null ? 'n/a' : `${value}%`);
