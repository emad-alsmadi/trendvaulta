const logger = require('../utils/logger');
const { reconcileStaleCheckouts } = require('../controllers/payment.controller');

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

let timer = null;
let running = false;

/**
 * Periodically settle stale checkouts (see reconcileStaleCheckouts): release
 * stock held by sessions that expired without a webhook, and mark paid the
 * ones whose completion webhook was missed.
 *
 * CHECKOUT_RECONCILE_INTERVAL_MS sets the period; 0 disables it. Safe on
 * several instances at once, because every write it makes is claimed
 * conditionally.
 */
function startCheckoutReconciler() {
  const raw = process.env.CHECKOUT_RECONCILE_INTERVAL_MS;
  const intervalMs = raw === undefined || raw === '' ? DEFAULT_INTERVAL_MS : Number(raw);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    logger.info('Checkout reconciler disabled (CHECKOUT_RECONCILE_INTERVAL_MS=0)');
    return;
  }

  const tick = async () => {
    // A slow run (many orders, slow Stripe) must not overlap the next one
    if (running) return;
    running = true;
    try {
      await reconcileStaleCheckouts();
    } catch (err) {
      logger.error({ err }, 'Checkout reconciler run failed');
    } finally {
      running = false;
    }
  };

  timer = setInterval(tick, intervalMs);
  // Never keep the process alive just for this (graceful shutdown, tests)
  timer.unref();
}

function stopCheckoutReconciler() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startCheckoutReconciler, stopCheckoutReconciler };
