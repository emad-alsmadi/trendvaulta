import type { ErrorEvent, init } from '@sentry/nextjs';

type DataCollection = NonNullable<NonNullable<Parameters<typeof init>[0]>['dataCollection']>;

/**
 * Sentry v11 collects bodies, cookies, query strings, headers and stack
 * frame variables by default. Collect none of it at the source; scrubEvent
 * below is the second layer.
 */
export const DATA_COLLECTION: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { allow: ['user-agent', 'content-type', 'accept-language'] }, response: false },
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
};

/**
 * What may leave the storefront in a Sentry event (plan P0-06), for the
 * browser and the server alike: no query strings (guest-order, reset and
 * verification tokens live there), cookies, bodies or auth headers, and no
 * user field but the id.
 */
const SENSITIVE_HEADERS = /^(authorization|cookie|set-cookie|token|x-guest-token)$/i;
const TOKEN_PARAMS = /([?&](?:token|guestToken|order|session_id)=)[^&#]*/gi;

export function scrubUrl(url: string | undefined) {
  return url ? url.replace(TOKEN_PARAMS, '$1[Filtered]') : url;
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    event.request.url = scrubUrl(event.request.url)?.split('?')[0];
    if (event.request.headers) {
      for (const name of Object.keys(event.request.headers)) {
        if (SENSITIVE_HEADERS.test(name)) event.request.headers[name] = '[Filtered]';
      }
    }
  }
  if (event.user) event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.data && typeof crumb.data.url === 'string') crumb.data.url = scrubUrl(crumb.data.url);
    if (crumb.data && typeof crumb.data.to === 'string') crumb.data.to = scrubUrl(crumb.data.to);
    if (crumb.data && typeof crumb.data.from === 'string') crumb.data.from = scrubUrl(crumb.data.from);
  }
  return event;
}
