import { sendOpsAlert, type OpsAlert, type OpsAlertApp, type OpsAlertContext } from '@beco/documents';

/**
 * Operational failure reporting. Every report is one structured log line
 * (`"event":"ops_alert"`, searchable in the Vercel logs) and, throttled, an
 * email to Brightex with the summary.
 *
 * Reserved for failures of the platform itself: an email that did not go, a
 * PDF that did not render, a storefront that did not refresh, a customer
 * submission that did not save. A user's own validation error or a stale
 * edit is not an alert.
 */
export interface FailureReport {
  area: string;
  summary: string;
  error?: unknown;
  detail?: string | undefined;
  context?: OpsAlertContext | undefined;
  /** Identical keys inside the window are held back and counted. Defaults to
   *  app, area and summary. */
  dedupeKey?: string | undefined;
  app?: OpsAlertApp | undefined;
}

export interface ThrottleDecision {
  send: boolean;
  /** How many were held back under this key since it last went out. */
  suppressed: number;
}

/**
 * Per key: one email per window, the rest counted and reported on the next
 * one that goes. Overall: a cap per hour, so a full outage produces a handful
 * of emails rather than one per request. Per server instance, which is
 * enough to stop a flood; the log line is still written for every occurrence.
 */
export function createAlertThrottle({
  windowMs = 15 * 60_000,
  hourlyCap = 30,
  maxKeys = 500,
  now = () => Date.now(),
}: { windowMs?: number; hourlyCap?: number; maxKeys?: number; now?: () => number } = {}) {
  const byKey = new Map<string, { sentAt: number; suppressed: number }>();
  let hourStart = now();
  let sentThisHour = 0;

  const prune = (at: number) => {
    if (byKey.size < maxKeys) return;
    for (const [key, entry] of byKey) {
      if (at - entry.sentAt >= windowMs && entry.suppressed === 0) byKey.delete(key);
    }
    // Still full of live keys: drop the oldest, a held-back count is not
    // worth unbounded memory.
    while (byKey.size >= maxKeys) {
      const oldest = byKey.keys().next().value;
      if (oldest === undefined) break;
      byKey.delete(oldest);
    }
  };

  return {
    admit(key: string): ThrottleDecision {
      const at = now();
      if (at - hourStart >= 60 * 60_000) {
        hourStart = at;
        sentThisHour = 0;
      }
      const entry = byKey.get(key);
      if (entry && at - entry.sentAt < windowMs) {
        entry.suppressed += 1;
        return { send: false, suppressed: entry.suppressed };
      }
      if (sentThisHour >= hourlyCap) {
        if (entry) entry.suppressed += 1;
        else byKey.set(key, { sentAt: Number.NEGATIVE_INFINITY, suppressed: 1 });
        return { send: false, suppressed: entry?.suppressed ?? 1 };
      }
      const suppressed = entry?.suppressed ?? 0;
      if (!entry) prune(at);
      byKey.delete(key);
      byKey.set(key, { sentAt: at, suppressed: 0 });
      sentThisHour += 1;
      return { send: true, suppressed };
    },
  };
}

const throttle = createAlertThrottle();

export const environmentName = (): string =>
  process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';

const describeError = (error: unknown): string | undefined => {
  if (error === undefined || error === null) return undefined;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return String(error);
};

/**
 * A customer email that did not go. A provider error always alerts. A missing
 * key alerts only in production, where it means the deploy is misconfigured;
 * locally it is the documented default.
 */
export async function reportSendFailure(
  result: { sent: true } | { sent: false; reason: 'no-api-key' | 'error'; detail?: string | undefined },
  report: Omit<FailureReport, 'detail' | 'error'>,
): Promise<void> {
  if (result.sent) return;
  if (result.reason === 'no-api-key') {
    if (environmentName() !== 'production') return;
    await reportOpsFailure({ ...report, detail: 'RESEND_API_KEY is not set in production' });
    return;
  }
  await reportOpsFailure({ ...report, detail: result.detail ?? 'The mail provider returned an error' });
}

/** Never throws, never blocks the caller on anything but the send itself. */
export async function reportOpsFailure(report: FailureReport): Promise<void> {
  try {
    const app = report.app ?? 'dashboard';
    const alert: OpsAlert = {
      app,
      area: report.area,
      summary: report.summary,
      detail: report.detail ?? describeError(report.error),
      context: report.context,
      occurredAt: new Date().toISOString(),
      environment: environmentName(),
    };
    console.error(JSON.stringify({ event: 'ops_alert', level: 'error', ...alert }));

    const decision = throttle.admit(report.dedupeKey ?? `${app}:${report.area}:${report.summary}`);
    if (!decision.send) return;

    const result = await sendOpsAlert({ ...alert, suppressed: decision.suppressed });
    if (!result.sent && result.reason === 'error') {
      console.error(
        JSON.stringify({ event: 'ops_alert_undelivered', area: report.area, detail: result.detail ?? null }),
      );
    }
  } catch (cause) {
    console.error('reportOpsFailure itself failed', cause);
  }
}
