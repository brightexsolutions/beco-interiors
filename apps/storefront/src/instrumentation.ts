import type { Instrumentation } from 'next';

export function register() {}

/**
 * Any error a storefront page, route handler or server action throws and
 * does not handle, relayed to the dashboard, which sends the alert.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { reportOpsFailure } = await import('./lib/ops-alert');
  const message = error instanceof Error ? error.message : String(error);
  const digest = typeof error === 'object' && error && 'digest' in error ? String(error.digest) : null;
  await reportOpsFailure({
    area: 'request.error',
    summary: `Unhandled error on ${request.method} ${context.routePath}`,
    detail: message,
    context: { path: request.path.split('?')[0] ?? request.path, route: context.routePath, digest },
  });
};
