// Stripe gives a webhook ~10–20s before timing out, so a claim still
// `processing` after this long belongs to a crashed handler.
const STALE_PROCESSING_MS = 5 * 60 * 1000;

/**
 * Claim a Stripe event id for processing. Duplicate eventIds are safe no-ops,
 * except a stale `processing` claim, which is taken over so Stripe's retry
 * can finish the work.
 * @param {{ create: Function, deleteOne: Function }} StripeWebhookEvent
 * @param {string} eventId
 * @param {{ type?: string }} [meta]
 * @returns {Promise<{ duplicate: boolean }>}
 */
async function claimWebhookEvent(StripeWebhookEvent, eventId, meta = {}) {
  if (!eventId) {
    const err = new Error('Missing Stripe event id');
    err.statusCode = 400;
    throw err;
  }

  const doc = { eventId, status: 'processing' };
  if (meta && typeof meta.type === 'string' && meta.type) {
    doc.type = meta.type;
  }

  try {
    await StripeWebhookEvent.create(doc);
    return { duplicate: false };
  } catch (e) {
    if (e && e.code === 11000) {
      // Atomic: timestamps bump updatedAt, so only one retry can reclaim.
      const reclaimed = await StripeWebhookEvent.findOneAndUpdate(
        {
          eventId,
          status: 'processing',
          updatedAt: { $lt: new Date(Date.now() - STALE_PROCESSING_MS) },
        },
        { $set: { status: 'processing' } },
      );
      return { duplicate: !reclaimed };
    }
    throw e;
  }
}

/**
 * Record the outcome of a claimed event (best-effort; never throws).
 * @param {{ updateOne: Function }} StripeWebhookEvent
 * @param {string} eventId
 * @param {{ orderId?: string|null, status?: 'processed'|'failed' }} [outcome]
 */
async function markWebhookEventProcessed(
  StripeWebhookEvent,
  eventId,
  { orderId, status = 'processed' } = {},
) {
  if (!eventId) return;
  const $set = { status };
  if (orderId) $set.orderId = String(orderId);
  await StripeWebhookEvent.updateOne({ eventId }, { $set }).catch(() => {});
}

/**
 * Release claim so Stripe can retry after a handler failure.
 */
async function releaseWebhookEvent(StripeWebhookEvent, eventId) {
  if (!eventId) return;
  await StripeWebhookEvent.deleteOne({ eventId }).catch(() => {});
}

module.exports = {
  claimWebhookEvent,
  markWebhookEventProcessed,
  releaseWebhookEvent,
};
