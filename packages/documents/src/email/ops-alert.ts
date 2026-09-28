import { Resend } from 'resend';
import { CHARCOAL, MUTED, RULE, SANS, escapeHtml } from './shell';
import type { SendResult } from './send';

/**
 * An operational failure, for Brightex rather than a customer: something the
 * platform tried to do and could not, with enough context to act on it
 * without opening the logs first.
 *
 * Plain markup, not the branded shell. This is an internal alert, read on a
 * phone, and the only job of its layout is to put the summary first.
 */
export type OpsAlertApp = 'dashboard' | 'storefront' | 'drive-import';

export type OpsAlertContext = Record<string, string | number | boolean | null | undefined>;

export interface OpsAlert {
  app: OpsAlertApp;
  /** A stable area name: `quote.email`, `storefront.revalidate`, `pdf.render`. */
  area: string;
  /** One line, what failed, in words someone can act on. */
  summary: string;
  /** The underlying error message, if there is one. */
  detail?: string | undefined;
  context?: OpsAlertContext | undefined;
  occurredAt: string;
  environment: string;
  /** How many identical alerts were held back since the last one was sent. */
  suppressed?: number | undefined;
}

export const DEFAULT_OPS_ALERT_EMAIL = 'info.brightexsolutions@gmail.com';

const DEFAULT_FROM = 'Beco Operations <alerts@beco.co.ke>';

const MAX_SUBJECT = 140;

const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 3)}...` : value);

const contextRows = (context: OpsAlertContext | undefined): Array<[string, string]> =>
  Object.entries(context ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)]);

export function buildOpsAlertEmail(alert: OpsAlert): { subject: string; text: string; html: string } {
  const env = alert.environment === 'production' ? '' : ` [${alert.environment}]`;
  const subject = clip(`Beco alert${env}: ${alert.summary}`, MAX_SUBJECT);
  const rows: Array<[string, string]> = [
    ['App', alert.app],
    ['Area', alert.area],
    ['When', alert.occurredAt],
    ['Environment', alert.environment],
    ...(alert.detail ? ([['Error', alert.detail]] as Array<[string, string]>) : []),
    ...contextRows(alert.context),
  ];
  const held =
    alert.suppressed && alert.suppressed > 0
      ? `${alert.suppressed} more of the same were held back since the last alert.`
      : '';

  const text = [
    alert.summary,
    '',
    ...rows.map(([key, value]) => `${key}: ${value}`),
    ...(held ? ['', held] : []),
    '',
    'Search the logs for "ops_alert" and this area to see every occurrence.',
  ].join('\n');

  const cell = `font-family:${SANS};font-size:14px;line-height:1.5;padding:6px 0;vertical-align:top;border-top:1px solid ${RULE}`;
  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Beco alert</title></head>' +
    `<body style="margin:0;padding:24px 16px;background:#ffffff;color:${CHARCOAL}">` +
    `<p style="margin:0 0 16px;font-family:${SANS};font-size:18px;font-weight:600;line-height:1.4">${escapeHtml(alert.summary)}</p>` +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px">' +
    rows
      .map(
        ([key, value]) =>
          `<tr><td style="${cell};color:${MUTED};width:120px;padding-right:12px">${escapeHtml(key)}</td>` +
          `<td style="${cell};word-break:break-word">${escapeHtml(value)}</td></tr>`,
      )
      .join('') +
    '</table>' +
    (held ? `<p style="margin:16px 0 0;font-family:${SANS};font-size:14px;color:${MUTED}">${escapeHtml(held)}</p>` : '') +
    `<p style="margin:16px 0 0;font-family:${SANS};font-size:14px;color:${MUTED}">` +
    'Search the logs for &quot;ops_alert&quot; and this area to see every occurrence.</p>' +
    '</body></html>';

  return { subject, text, html };
}

/**
 * Never throws. An alert that cannot be sent is logged by the caller, which
 * is the most anyone can do when the mail provider is itself the failure.
 */
export async function sendOpsAlert(alert: OpsAlert): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no-api-key' };

  const to = (process.env.OPS_ALERT_EMAIL || DEFAULT_OPS_ALERT_EMAIL)
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
  const { subject, text, html } = buildOpsAlertEmail(alert);

  try {
    const { data, error } = await new Resend(key).emails.send({
      from: process.env.OPS_ALERT_FROM_EMAIL || process.env.QUOTE_FROM_EMAIL || DEFAULT_FROM,
      to,
      subject,
      text,
      html,
    });
    if (error || !data) return { sent: false, reason: 'error', detail: error?.message };
    return { sent: true, id: data.id };
  } catch (cause) {
    return { sent: false, reason: 'error', detail: cause instanceof Error ? cause.message : undefined };
  }
}
