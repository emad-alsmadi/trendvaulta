const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_ADDRESSES,
  shouldBecomeDefault,
  canAddAddress,
  pickDefaultToPromote,
  toPublicAddress,
  toPublicAddresses,
} = require('./address');

describe('address helpers', () => {
  it('first address is always default', () => {
    assert.equal(shouldBecomeDefault([], false), true);
    assert.equal(shouldBecomeDefault(undefined, undefined), true);
  });

  it('later addresses default only when requested', () => {
    const existing = [{ _id: 'a', isDefault: true }];
    assert.equal(shouldBecomeDefault(existing, false), false);
    assert.equal(shouldBecomeDefault(existing, undefined), false);
    assert.equal(shouldBecomeDefault(existing, true), true);
  });

  it('caps the book at MAX_ADDRESSES', () => {
    assert.equal(MAX_ADDRESSES, 10);
    assert.equal(canAddAddress(0), true);
    assert.equal(canAddAddress(9), true);
    assert.equal(canAddAddress(10), false);
    assert.equal(canAddAddress(11), false);
  });

  it('promotes the first remaining address when no default is left', () => {
    assert.equal(pickDefaultToPromote([]), null);
    assert.equal(pickDefaultToPromote(undefined), null);
    assert.equal(
      pickDefaultToPromote([
        { _id: 'a', isDefault: false },
        { _id: 'b', isDefault: true },
      ]),
      null,
    );
    assert.equal(
      pickDefaultToPromote([
        { _id: 'x', isDefault: false },
        { _id: 'y', isDefault: false },
      ]),
      'x',
    );
  });

  it('serializes a client-safe shape with defaults filled in', () => {
    const out = toPublicAddress({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      name: 'Sara',
      phone: '+962790000000',
      address: '12 Rainbow St',
      city: 'Amman',
      zip: '11181',
    });
    assert.deepEqual(out, {
      _id: '507f1f77bcf86cd799439011',
      label: 'Home',
      name: 'Sara',
      phone: '+962790000000',
      address: '12 Rainbow St',
      city: 'Amman',
      zip: '11181',
      country: '',
      isDefault: false,
    });
    assert.equal(toPublicAddress(null), null);
    assert.deepEqual(toPublicAddresses(undefined), []);
    assert.equal(toPublicAddresses([{ _id: 1, isDefault: true }])[0].isDefault, true);
  });
});
