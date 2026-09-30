/**
 * What may leave the API in a Sentry event (plan P0-06). Applied in
 * beforeSend, after the SDK has built the event, so it catches whatever an
 * integration attached.
 *
 * Kept: the error, stack, route, method, status, request id, user id.
 * Removed: request bodies (passwords, addresses, card-adjacent data),
 * cookies, query strings (reset and guest-order tokens), auth headers, and
 * any user field but the id.
 */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'token',
  'x-guest-token',
  'stripe-signature',
  'x-forwarded-for',
  'x-real-ip',
]);

// JWTs (access tokens, reset links), then long hex/base64 runs with a
// digit in them (refresh, guest-order, verification tokens). Plain long
// words such as class names have no digit and stay readable.
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;
const TOKENISH = /[A-Za-z0-9_-]{24,}/g;

function scrubUrl(url) {
  if (typeof url !== 'string') return url;
  const [path] = url.split('?');
  // /api/password/reset-password/:userId/:token → keep the route shape
  return path.replace(/(reset-password\/)[^/]+\/[^/]+/, '$1[id]/[token]');
}

function scrubHeaders(headers) {
  if (!headers || typeof headers !== 'object') return headers;
  const out = {};
  for (const [name, value] of Object.entries(headers)) {
    out[name] = SENSITIVE_HEADERS.has(name.toLowerCase()) ? '[Filtered]' : value;
  }
  return out;
}

function scrubMessage(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(JWT, '[Filtered]')
    .replace(TOKENISH, (m) => (/[0-9]/.test(m) ? '[Filtered]' : m));
}

/** Sentry beforeSend: returns the event with sensitive data removed. */
function scrubEvent(event) {
  if (!event || typeof event !== 'object') return event;
  if (event.request) {
    const { request } = event;
    delete request.data;
    delete request.cookies;
    delete request.query_string;
    request.url = scrubUrl(request.url);
    request.headers = scrubHeaders(request.headers);
  }
  if (event.user) {
    event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  }
  if (typeof event.message === 'string') event.message = scrubMessage(event.message);
  for (const ex of event.exception?.values || []) {
    ex.value = scrubMessage(ex.value);
  }
  for (const crumb of event.breadcrumbs || []) {
    if (crumb?.data?.url) crumb.data.url = scrubUrl(crumb.data.url);
  }
  return event;
}

/**
 * Sentry v11 `dataCollection`: its defaults collect bodies, cookies, query
 * strings, all headers and local variable values from stack frames (which
 * can hold a password). Collect none of it at the source; scrubEvent is the
 * second layer.
 */
const DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { allow: ['user-agent', 'content-type', 'accept-language'] }, response: false },
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
};

module.exports = { scrubEvent, scrubUrl, scrubHeaders, DATA_COLLECTION };
