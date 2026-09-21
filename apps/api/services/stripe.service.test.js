const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const { refundPaymentIntent } = require('./stripe.service');

function fakeStripe() {
  return {
    refunds: {
      create: mock.fn(async (params) => ({
        id: 're_1',
        amount: params.amount ?? 1234,
        status: 'succeeded',
      })),
    },
  };
}

describe('refundPaymentIntent', () => {
  it('creates a full refund with an idempotency key', async () => {
    const stripe = fakeStripe();
    const refund = await refundPaymentIntent(stripe, 'pi_1');
    assert.equal(refund.id, 're_1');
    assert.deepEqual(stripe.refunds.create.mock.calls[0].arguments, [
      { payment_intent: 'pi_1' },
      { idempotencyKey: 'refund:pi_1:full' },
    ]);
  });

  it('passes a partial amount without the full-refund key', async () => {
    const stripe = fakeStripe();
    await refundPaymentIntent(stripe, 'pi_1', { amountCents: 500 });
    assert.deepEqual(stripe.refunds.create.mock.calls[0].arguments, [
      { payment_intent: 'pi_1', amount: 500 },
      {},
    ]);
  });

  it('rejects a missing payment intent id', async () => {
    await assert.rejects(
      () => refundPaymentIntent(fakeStripe(), ''),
      /Missing payment intent id/,
    );
  });
});
