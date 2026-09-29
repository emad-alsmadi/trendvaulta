const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateCouponDiscount,
  resolveShippingPrice,
  resolveUnitPrice,
  resolveAvailableStock,
  matchVariant,
  resolveFulfillment,
  roundMoney,
  computeOrderTotal,
} = require('./commerce');
const { zoneMatchesAddress } = require('../models/ShippingZone');

describe('calculateCouponDiscount', () => {
  it('rejects inactive coupons', () => {
    const result = calculateCouponDiscount(
      {
        isActive: false,
        expirationDate: new Date(Date.now() + 86400000),
        discountType: 'fixed',
        discountValue: 10,
        minimumOrderAmount: 0,
      },
      100,
    );
    assert.equal(result.valid, false);
  });

  it('applies percentage and clamps to order amount', () => {
    const result = calculateCouponDiscount(
      {
        isActive: true,
        expirationDate: new Date(Date.now() + 86400000),
        discountType: 'percentage',
        discountValue: 25,
        minimumOrderAmount: 0,
        usedCount: 0,
        usageLimit: null,
      },
      80,
    );
    assert.equal(result.valid, true);
    assert.equal(result.discountAmount, 20);
  });

  it('applies fixed discount without exceeding subtotal', () => {
    const result = calculateCouponDiscount(
      {
        isActive: true,
        expirationDate: new Date(Date.now() + 86400000),
        discountType: 'fixed',
        discountValue: 50,
        minimumOrderAmount: 0,
        usedCount: 0,
      },
      30,
    );
    assert.equal(result.valid, true);
    assert.equal(result.discountAmount, 30);
  });
});

describe('resolveShippingPrice', () => {
  it('charges flat shipping for delivery/standard', async () => {
    // Test without country to avoid DB dependency
    assert.equal(
      await resolveShippingPrice({ delivery: true, country: undefined }),
      5,
    );
    assert.equal(
      await resolveShippingPrice({
        shippingMethod: 'standard',
        country: undefined,
      }),
      5,
    );
  });

  it('is zero when no delivery', async () => {
    assert.equal(
      await resolveShippingPrice({ delivery: false, country: undefined }),
      0,
    );
    assert.equal(
      await resolveShippingPrice({
        shippingMethod: 'none',
        country: undefined,
      }),
      0,
    );
  });
});

describe('variant helpers', () => {
  const product = {
    price: 40,
    stock: 2,
    variants: [
      { size: 'M', color: 'Red', stock: 3, price: 45, sku: 'SKU-M-R' },
      { size: 'L', color: 'Blue', stock: 0, price: 50, sku: 'SKU-L-B' },
    ],
  };

  it('matches variant and resolves price/stock', () => {
    const matched = matchVariant(product, { size: 'M', color: 'Red' });
    assert.ok(matched);
    assert.equal(resolveUnitPrice(product, matched), 45);
    assert.equal(resolveAvailableStock(product, matched), 3);
  });

  it('uses product stock when no variants', () => {
    const simple = { price: 10, stock: 7, variants: [] };
    assert.equal(resolveAvailableStock(simple, null), 7);
    assert.equal(resolveUnitPrice(simple, null), 10);
  });
});

describe('resolveFulfillment', () => {
  it('treats delivery:false or method none as store pickup', () => {
    assert.deepEqual(resolveFulfillment({ delivery: false, shippingMethod: 'standard' }), {
      delivery: false,
      shippingMethod: 'none',
    });
    assert.deepEqual(resolveFulfillment({ shippingMethod: 'none' }), {
      delivery: false,
      shippingMethod: 'none',
    });
    assert.deepEqual(resolveFulfillment({}), { delivery: false, shippingMethod: 'none' });
  });

  it('defaults a delivery to standard, including an empty method', () => {
    assert.deepEqual(resolveFulfillment({ delivery: true, shippingMethod: '' }), {
      delivery: true,
      shippingMethod: 'standard',
    });
    assert.deepEqual(resolveFulfillment({ shippingMethod: 'express' }), {
      delivery: true,
      shippingMethod: 'express',
    });
  });
});

describe('roundMoney / computeOrderTotal', () => {
  it('rounds to whole cents', () => {
    assert.equal(roundMoney(53.4893), 53.49);
    assert.equal(roundMoney(1.005), 1.01);
    assert.equal(roundMoney(0.1 + 0.2), 0.3);
  });

  it('never returns a negative total', () => {
    assert.equal(
      computeOrderTotal({ itemsPrice: 10, discountAmount: 25, shippingPrice: 0, taxPrice: 0 }),
      0,
    );
    assert.equal(
      computeOrderTotal({ itemsPrice: 19.99, discountAmount: 2, shippingPrice: 5, taxPrice: 1.6 }),
      24.59,
    );
  });
});

describe('zoneMatchesAddress', () => {
  it('matches region/postal patterns case-insensitively', () => {
    const zone = { _id: 'z1', regionPattern: '^dubai$', postalCodePattern: '' };
    assert.equal(zoneMatchesAddress(zone, { region: 'Dubai' }), true);
    assert.equal(zoneMatchesAddress(zone, { region: 'Sharjah' }), false);
    // No input to test against: the pattern does not exclude the zone.
    assert.equal(zoneMatchesAddress(zone, {}), true);
  });

  it('treats an uncompilable pattern as no match instead of throwing', () => {
    const zone = { _id: 'z2', regionPattern: '[A-', postalCodePattern: '' };
    assert.equal(zoneMatchesAddress(zone, { region: 'anything' }), false);
  });
});
