const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  ORDER_STATUSES,
  canTransitionOrderStatus,
  getAllowedNextStatuses,
} = require('./orderTransitions');

describe('orderTransitions', () => {
  it('includes needs_attention and refunded statuses', () => {
    assert.ok(ORDER_STATUSES.includes('needs_attention'));
    assert.ok(ORDER_STATUSES.includes('refunded'));
  });

  it('allows pending → paid | canceled | needs_attention', () => {
    assert.equal(canTransitionOrderStatus('pending', 'paid').ok, true);
    assert.equal(canTransitionOrderStatus('pending', 'canceled').ok, true);
    assert.equal(
      canTransitionOrderStatus('pending', 'needs_attention').ok,
      true,
    );
  });

  it('allows paid → shipped | canceled | needs_attention | refunded', () => {
    assert.equal(canTransitionOrderStatus('paid', 'shipped').ok, true);
    assert.equal(canTransitionOrderStatus('paid', 'canceled').ok, true);
    assert.equal(canTransitionOrderStatus('paid', 'needs_attention').ok, true);
    assert.equal(canTransitionOrderStatus('paid', 'refunded').ok, true);
  });

  it('allows needs_attention → paid | canceled | refunded only', () => {
    assert.deepEqual(getAllowedNextStatuses('needs_attention'), [
      'paid',
      'canceled',
      'refunded',
    ]);
    assert.equal(
      canTransitionOrderStatus('needs_attention', 'shipped').ok,
      false,
    );
  });

  it('allows canceled → refunded (late refund of a captured payment)', () => {
    assert.equal(canTransitionOrderStatus('canceled', 'refunded').ok, true);
    assert.equal(canTransitionOrderStatus('canceled', 'paid').ok, false);
  });

  it('allows shipped → delivered | refunded and delivered → refunded', () => {
    assert.equal(canTransitionOrderStatus('shipped', 'delivered').ok, true);
    assert.equal(canTransitionOrderStatus('shipped', 'refunded').ok, true);
    assert.equal(canTransitionOrderStatus('delivered', 'refunded').ok, true);
    assert.equal(canTransitionOrderStatus('delivered', 'shipped').ok, false);
  });

  it('blocks pending → shipped and refunded → anything', () => {
    assert.equal(canTransitionOrderStatus('pending', 'shipped').ok, false);
    assert.deepEqual(getAllowedNextStatuses('refunded'), []);
    assert.equal(canTransitionOrderStatus('refunded', 'paid').ok, false);
  });

  it('rejects same-status and unknown target status', () => {
    assert.equal(canTransitionOrderStatus('paid', 'paid').ok, false);
    const r = canTransitionOrderStatus('paid', 'processing');
    assert.equal(r.ok, false);
  });
});
