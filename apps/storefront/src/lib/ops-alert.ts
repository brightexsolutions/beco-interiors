import 'server-only';

/**
 * Operational failure reporting for the storefront. This app never holds
 * the Resend key, so the email itself is sent by the dashboard: the report
 * is POSTed to its `/api/ops-alert` behind `OPS_ALERT_SECRET`. The log line
 * is written here regardless, so a failure is visible in this project's own
 * logs even when the dashboard cannot be reached.
 *
 * Never throws, and gives up after a few seconds, so a customer is never
 * kept waiting on an alert about their own request.
 */
export interface StorefrontFailure {
  area: string;
  summary: string;
  detail?: string | undefined;
  context?: Record<string, string | number | boolean | null> | undefined;
}

export async function reportOpsFailure(failure: StorefrontFailure): Promise<void> {
  try {
    console.error(
      JSON.stringify({
        event: 'ops_alert',
        level: 'error',
        app: 'storefront',
        occurredAt: new Date().toISOString(),
        ...failure,
      }),
    );

    const origin = process.env.DASHBOARD_URL;
    const secret = process.env.OPS_ALERT_SECRET;
    if (!origin || !secret) return;

    const response = await fetch(`${origin.replace(/\/$/, '')}/api/ops-alert`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        area: failure.area,
        summary: failure.summary.slice(0, 200),
        detail: failure.detail?.slice(0, 2000),
        context: failure.context,
      }),
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) {
      console.error(JSON.stringify({ event: 'ops_alert_undelivered', area: failure.area, status: response.status }));
    }
  } catch (cause) {
    console.error(
      JSON.stringify({
        event: 'ops_alert_undelivered',
        area: failure.area,
        detail: cause instanceof Error ? cause.message : String(cause),
      }),
    );
  }
}
