const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const {
  claimWebhookEvent,
  markWebhookEventProcessed,
  releaseWebhookEvent,
} = require('./stripeWebhookIdempotency');

describe('claimWebhookEvent', () => {
  it('returns duplicate:false on first claim', async () => {
    const model = {
      create: mock.fn(async () => ({ eventId: 'evt_1' })),
    };
    const result = await claimWebhookEvent(model, 'evt_1');
    assert.equal(result.duplicate, false);
    assert.equal(model.create.mock.callCount(), 1);
    assert.deepEqual(model.create.mock.calls[0].arguments[0], {
      eventId: 'evt_1',
      status: 'processing',
    });
  });

  it('stores the event type when provided', async () => {
    const model = {
      create: mock.fn(async () => ({ eventId: 'evt_1' })),
    };
    await claimWebhookEvent(model, 'evt_1', {
      type: 'checkout.session.completed',
    });
    assert.deepEqual(model.create.mock.calls[0].arguments[0], {
      eventId: 'evt_1',
      status: 'processing',
      type: 'checkout.session.completed',
    });
  });

  it('returns duplicate:true on Mongo duplicate key', async () => {
    const err = new Error('dup');
    err.code = 11000;
    const model = {
      create: mock.fn(async () => {
        throw err;
      }),
    };
    const result = await claimWebhookEvent(model, 'evt_1');
    assert.equal(result.duplicate, true);
  });

  it('rethrows unexpected errors', async () => {
    const model = {
      create: mock.fn(async () => {
        throw new Error('db down');
      }),
    };
    await assert.rejects(() => claimWebhookEvent(model, 'evt_1'), /db down/);
  });

  it('rejects missing event id', async () => {
    await assert.rejects(() => claimWebhookEvent({ create: async () => {} }, ''), /Missing/);
  });
});

describe('markWebhookEventProcessed', () => {
  it('sets status and orderId on the claimed event', async () => {
    const model = {
      updateOne: mock.fn(async () => ({ modifiedCount: 1 })),
    };
    await markWebhookEventProcessed(model, 'evt_1', { orderId: 'o1' });
    assert.equal(model.updateOne.mock.callCount(), 1);
    assert.deepEqual(model.updateOne.mock.calls[0].arguments, [
      { eventId: 'evt_1' },
      { $set: { status: 'processed', orderId: 'o1' } },
    ]);
  });

  it('omits orderId when not provided and never throws', async () => {
    const model = {
      updateOne: mock.fn(async () => {
        throw new Error('db down');
      }),
    };
    await markWebhookEventProcessed(model, 'evt_1', { status: 'failed' });
    assert.deepEqual(model.updateOne.mock.calls[0].arguments[1], {
      $set: { status: 'failed' },
    });
  });
});

describe('releaseWebhookEvent', () => {
  it('deletes claimed event id', async () => {
    const model = {
      deleteOne: mock.fn(async () => ({ deletedCount: 1 })),
    };
    await releaseWebhookEvent(model, 'evt_1');
    assert.equal(model.deleteOne.mock.callCount(), 1);
    assert.deepEqual(model.deleteOne.mock.calls[0].arguments[0], {
      eventId: 'evt_1',
    });
  });
});
