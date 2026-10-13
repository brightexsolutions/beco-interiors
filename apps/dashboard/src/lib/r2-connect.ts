/**
 * The R2 origin the browser may PUT photographs to, for the CSP's
 * connect-src (D116, D139). The account's own S3 host, never a wildcard;
 * `R2_ENDPOINT` stands in for it in local development only.
 *
 * Read at build time. A Cloudflare account ID is 32 hex characters, and
 * anything else is left out rather than written into the policy: Vercel
 * hands a variable marked Sensitive to `vercel pull` as the placeholder
 * `[sensitive]`, which would put a host no browser can match into the CSP.
 * Without the host the upload takes the form post fallback, which the
 * in-browser resize keeps under its limit, so the direct PUT is lost but
 * nothing breaks. D150.
 */
export function r2ConnectOrigin(env: { R2_ENDPOINT?: string | undefined; R2_ACCOUNT_ID?: string | undefined }): string {
  if (env.R2_ENDPOINT) return env.R2_ENDPOINT;
  const account = env.R2_ACCOUNT_ID?.trim() ?? '';
  return /^[0-9a-f]{32}$/i.test(account) ? `https://${account}.r2.cloudflarestorage.com` : '';
}
