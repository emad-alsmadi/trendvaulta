/**
 * Error tracking (plan P0-06). Required first thing in app.js so Sentry can
 * instrument Express and HTTP before they load.
 *
 * Off unless SENTRY_DSN is set; never on in tests. What leaves the process
 * is filtered by utils/sentryScrub.js (no bodies, cookies, tokens or PII
 * beyond the user id).
 */
require('dotenv').config({ quiet: true });

const dsn = (process.env.SENTRY_DSN || '').trim();
const enabled = Boolean(dsn) && process.env.NODE_ENV !== 'test';

let Sentry = null;
if (enabled) {
  Sentry = require('@sentry/node');
  const { scrubEvent, DATA_COLLECTION } = require('./utils/sentryScrub');
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    // Render sets RENDER_GIT_COMMIT: errors are grouped per deploy
    release: process.env.SENTRY_RELEASE || process.env.RENDER_GIT_COMMIT || undefined,
    dataCollection: DATA_COLLECTION,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0,
    // logger.error(...) becomes an event too: failed Stripe refunds, paid
    // orders short of stock, webhook failures are logged, not thrown.
    // Plain logs are not shipped.
    integrations: [
      Sentry.pinoIntegration({ error: { levels: ['error', 'fatal'] }, log: { levels: [] } }),
    ],
    beforeSend: scrubEvent,
  });
}

module.exports = { Sentry, sentryEnabled: enabled };
