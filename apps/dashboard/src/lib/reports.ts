import { createServerClient } from '@beco/supabase-client';
import { reportRangeSchema } from '@beco/validation';

type SupabaseClient = ReturnType<typeof createServerClient>;

export type ReportPeriod = 'this_month' | 'last_month' | 'custom';

export interface ReportQuery {
  period: ReportPeriod;
  from: string | null;
  to: string | null;
}

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
  invoiced: number;
  collected: number;
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
  value === 'last_month' || value === 'custom' ? value : 'this_month';

export function nairobiYmd(at = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export function nairobiMonthStart(at = new Date()): string {
  return `${nairobiYmd(at).slice(0, 8)}01`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatYmd(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return ymd;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return ymd;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function periodDisplayLabel(period: string, from?: string | null, to?: string | null): string {
  if (period === 'last_month') return 'Last month';
  if (period === 'custom') {
    const start = formatYmd(from || nairobiMonthStart());
    const end = formatYmd(to || nairobiYmd());
    return start === end ? start : `${start} to ${end}`;
  }
  return 'This month';
}

/**
 * Reads the reports URL. Custom without dates uses Nairobi month-start
 * through today. Invalid custom dates fall back to this month so the
 * page still renders.
 */
export function parseReportQuery(
  period?: string,
  from?: string,
  to?: string,
): ReportQuery {
  const kind = parsePeriod(period);
  if (kind !== 'custom') return { period: kind, from: null, to: null };

  const candidate = {
    period: 'custom' as const,
    from: from || nairobiMonthStart(),
    to: to || nairobiYmd(),
  };
  const parsed = reportRangeSchema.safeParse(candidate);
  if (!parsed.success) return { period: 'this_month', from: null, to: null };
  return {
    period: 'custom',
    from: parsed.data.from ?? candidate.from,
    to: parsed.data.to ?? candidate.to,
  };
}

export function invalidCustomRange(period?: string, from?: string, to?: string): boolean {
  if (parsePeriod(period) !== 'custom') return false;
  if (!from && !to) return false;
  return !reportRangeSchema.safeParse({
    period: 'custom',
    from: from || nairobiMonthStart(),
    to: to || nairobiYmd(),
  }).success;
}

export type ReportView = 'sales' | 'products' | 'categories';

export const parseView = (value: string | undefined): ReportView =>
  value === 'products' || value === 'categories' ? value : 'sales';

const PERSON_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * `person` on the reports PDF. Empty is the overall review. Anything that is
 * not a UUID is refused rather than treated as overall.
 */
export const parsePersonId = (
  value: string | undefined,
): { ok: true; id: string | null } | { ok: false } => {
  if (!value) return { ok: true, id: null };
  if (!PERSON_ID.test(value)) return { ok: false };
  return { ok: true, id: value.toLowerCase() };
};

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

const rpcArgs = (query: ReportQuery) => ({
  p_period: query.period,
  // p_from and p_to are `date default null` in Postgres: omitting the key
  // when there is no bound is equivalent to passing null explicitly, and
  // matches the generated arg type, which has no null variant.
  ...(query.from ? { p_from: query.from } : {}),
  ...(query.to ? { p_to: query.to } : {}),
});

export async function fetchLeaderboard(
  supabase: SupabaseClient,
  query: ReportQuery,
): Promise<LeaderboardReport> {
  const { data, error } = await supabase.rpc('salesperson_leaderboard', rpcArgs(query));
  if (error) throw new Error(`Could not load the leaderboard: ${error.message}`);
  return (data as LeaderboardReport | null) ?? EMPTY_LEADERBOARD;
}

export async function fetchConversionReport(
  supabase: SupabaseClient,
  query: ReportQuery,
): Promise<ConversionReport> {
  const { data, error } = await supabase.rpc('conversion_report', rpcArgs(query));
  if (error) throw new Error(`Could not load the conversion report: ${error.message}`);
  return (data as ConversionReport | null) ?? EMPTY_CONVERSION;
}

export const rateLabel = (value: number | null): string => (value == null ? 'n/a' : `${value}%`);
