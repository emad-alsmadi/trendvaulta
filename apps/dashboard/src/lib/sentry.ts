import * as Sentry from '@sentry/react';
import { viteEnv } from './viteEnv';

/**
 * Dashboard error tracking (plan P0-06). Off unless VITE_SENTRY_DSN is set
 * at build time. Staff pages show customer data, so nothing but the error
 * itself leaves the browser: no bodies, cookies, query strings, headers
 * beyond the user agent, or stack-frame variables, and the user is not
 * attached.
 */
const dsn = viteEnv.VITE_SENTRY_DSN;

export const sentryEnabled = Boolean(dsn);

export function initSentry() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: viteEnv.MODE,
    tracesSampleRate: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: ['user-agent'] }, response: false },
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.query_string;
        if (event.request.url) event.request.url = event.request.url.split('?')[0];
      }
      delete event.user;
      return event;
    },
  });
}

/** For error boundaries: report a caught render crash (no-op when off). */
export function reportError(error: unknown, componentStack?: string | null) {
  if (!dsn) return;
  Sentry.captureException(error, {
    contexts: componentStack ? { react: { componentStack } } : undefined,
  });
}
