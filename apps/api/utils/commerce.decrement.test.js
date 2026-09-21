const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const {
  decrementStockForPaidOrder,
  buildVariantMatch,
} = require('./commerce');

describe('buildVariantMatch', () => {
  it('matches by size/color and sku when given', () => {
    assert.deepEqual(buildVariantMatch({ size: 'M', color: 'Red' }), {
      size: 'M',
      color: 'Red',
    });
    assert.deepEqual(buildVariantMatch({ size: 'M', sku: 'SKU-1' }), {
      size: 'M',
      sku: 'SKU-1',
    });
  });

  it('treats empty string as unset, like matchVariant', () => {
    assert.deepEqual(buildVariantMatch({ size: 'M', color: '' }), {
      size: 'M',
      color: { $in: ['', null] },
    });
  });

  it('ignores null keys and empty sku', () => {
    assert.deepEqual(buildVariantMatch({ size: null, color: 'Blue', sku: '' }), {
      color: 'Blue',
    });
  });
});

describe('decrementStockForPaidOrder', () => {
  it('decrements product-level stock with a stock >= qty guard', async () => {
    const Product = {
      findById: mock.fn(async () => ({ _id: 'p1', stock: 5, variants: [] })),
      findOneAndUpdate: mock.fn(async () => ({ _id: 'p1', stock: 3 })),
    };

    await decrementStockForPaidOrder(Product, {
      items: [{ productId: 'p1', qty: 2 }],
    });

    const [filter, update] = Product.findOneAndUpdate.mock.calls[0].arguments;
    assert.deepEqual(filter, { _id: 'p1', stock: { $gte: 2 } });
    assert.deepEqual(update, { $inc: { stock: -2 } });
  });

  it('decrements the matched variant atomically and keeps product.stock in sync', async () => {
    const Product = {
      findById: mock.fn(async () => ({
        _id: 'p2',
        title: 'Tee',
        stock: 3,
        variants: [{ size: 'M', color: 'Red', stock: 3 }],
      })),
      findOneAndUpdate: mock.fn(async () => ({ _id: 'p2' })),
    };

    await decrementStockForPaidOrder(Product, {
      items: [
        { productId: 'p2', qty: 2, variant: { size: 'M', color: 'Red' } },
      ],
    });

    const [filter, update] = Product.findOneAndUpdate.mock.calls[0].arguments;
    assert.deepEqual(filter, {
      _id: 'p2',
      variants: {
        $elemMatch: { size: 'M', color: 'Red', stock: { $gte: 2 } },
      },
    });
    assert.deepEqual(update, {
      $inc: { 'variants.$.stock': -2, stock: -2 },
    });
  });

  it('throws 409 when no document matched (insufficient stock)', async () => {
    const Product = {
      findById: mock.fn(async () => ({
        _id: 'p2',
        title: 'Tee',
        variants: [{ size: 'M', stock: 1 }],
      })),
      findOneAndUpdate: mock.fn(async () => null),
    };

    await assert.rejects(
      () =>
        decrementStockForPaidOrder(Product, {
          items: [{ productId: 'p2', qty: 2, variant: { size: 'M' } }],
        }),
      (err) => err.statusCode === 409 && /Tee/.test(err.message),
    );
  });

  it('restores already-decremented lines when a later line fails', async () => {
    let call = 0;
    const Product = {
      findById: mock.fn(async (id) => ({ _id: id, stock: 5, variants: [] })),
      findOneAndUpdate: mock.fn(async () => {
        call += 1;
        // first line succeeds, second line has no stock
        return call === 1 ? { _id: 'p1' } : null;
      }),
      findByIdAndUpdate: mock.fn(async () => {}),
    };

    await assert.rejects(
      () =>
        decrementStockForPaidOrder(Product, {
          items: [
            { productId: 'p1', qty: 1 },
            { productId: 'p2', qty: 9 },
          ],
        }),
      (err) => err.statusCode === 409,
    );

    // Rollback of p1 via product-level $inc
    assert.equal(Product.findByIdAndUpdate.mock.callCount(), 1);
    assert.deepEqual(Product.findByIdAndUpdate.mock.calls[0].arguments, [
      'p1',
      { $inc: { stock: 1 } },
    ]);
  });

  it('skips missing products and non-positive quantities', async () => {
    const Product = {
      findById: mock.fn(async () => null),
      findOneAndUpdate: mock.fn(async () => ({})),
    };

    await decrementStockForPaidOrder(Product, {
      items: [
        { productId: 'gone', qty: 1 },
        { productId: 'p1', qty: 0 },
      ],
    });

    assert.equal(Product.findOneAndUpdate.mock.callCount(), 0);
  });
});
