import type { Instrumentation } from 'next';

export function register() {}

/**
 * Any error a server component, route handler or server action throws and
 * does not handle. The specific paths (a send, a render, a refresh) report
 * with their own context; this is the net under everything else. Node only:
 * the alert path loads the PDF and mail packages, which the edge runtime
 * cannot.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { reportOpsFailure } = await import('./lib/ops-alert');
  const message = error instanceof Error ? error.message : String(error);
  const digest = typeof error === 'object' && error && 'digest' in error ? String(error.digest) : undefined;
  await reportOpsFailure({
    area: 'request.error',
    summary: `Unhandled error on ${request.method} ${context.routePath}`,
    detail: message,
    context: {
      path: request.path.split('?')[0],
      route: context.routePath,
      kind: context.routeType,
      digest,
    },
    dedupeKey: `request.error:${context.routePath}:${message}`,
  });
};
