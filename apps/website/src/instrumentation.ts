/**
 * Server-side error tracking (plan P0-06): render and route-handler errors
 * in the Node and Edge runtimes. Off unless SENTRY_DSN (or the public DSN)
 * is set; events are filtered by lib/sentryScrub.ts.
 */
import type { Instrumentation } from 'next';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (!dsn) return;
  const Sentry = await import('@sentry/nextjs');
  const { DATA_COLLECTION, scrubEvent } = await import('@/lib/sentryScrub');
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    // Vercel sets VERCEL_GIT_COMMIT_SHA: errors are grouped per deploy
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    dataCollection: DATA_COLLECTION,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!dsn) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
};
