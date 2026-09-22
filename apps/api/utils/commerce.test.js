const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateCouponDiscount,
  resolveShippingPrice,
  resolveUnitPrice,
  resolveAvailableStock,
  matchVariant,
} = require('./commerce');

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
