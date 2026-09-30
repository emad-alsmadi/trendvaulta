/**
 * Browser error tracking (plan P0-06). Off unless NEXT_PUBLIC_SENTRY_DSN is
 * set at build time; events are filtered by lib/sentryScrub.ts.
 */
import * as Sentry from '@sentry/nextjs';
import { DATA_COLLECTION, scrubEvent } from '@/lib/sentryScrub';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    dataCollection: DATA_COLLECTION,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
  });
}

export const onRouterTransitionStart = dsn ? Sentry.captureRouterTransitionStart : undefined;
