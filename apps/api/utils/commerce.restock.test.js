const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const {
  restoreStockForCanceledOrder,
  restoreStockOnce,
} = require('./commerce');

describe('restoreStockForCanceledOrder', () => {
  it('increments product-level stock', async () => {
    const productDoc = { _id: 'p1', stock: 2, variants: [] };
    const Product = {
      findById: mock.fn(async () => productDoc),
      findOneAndUpdate: mock.fn(async () => null),
      findByIdAndUpdate: mock.fn(async () => ({ stock: 5 })),
    };

    await restoreStockForCanceledOrder(Product, {
      items: [{ productId: 'p1', qty: 3 }],
    });

    assert.equal(Product.findOneAndUpdate.mock.callCount(), 0);
    assert.equal(Product.findByIdAndUpdate.mock.callCount(), 1);
    assert.deepEqual(Product.findByIdAndUpdate.mock.calls[0].arguments[1], {
      $inc: { stock: 3 },
    });
  });

  it('atomically increments the matching variant and product.stock', async () => {
    const productDoc = {
      _id: 'p2',
      stock: 1,
      variants: [
        { size: 'M', color: 'Red', stock: 1 },
        { size: 'L', color: 'Blue', stock: 0 },
      ],
    };
    const Product = {
      findById: mock.fn(async () => productDoc),
      findOneAndUpdate: mock.fn(async () => ({ _id: 'p2' })),
      findByIdAndUpdate: mock.fn(async () => {}),
    };

    await restoreStockForCanceledOrder(Product, {
      items: [
        { productId: 'p2', qty: 2, variant: { size: 'M', color: 'Red' } },
      ],
    });

    assert.equal(Product.findOneAndUpdate.mock.callCount(), 1);
    const [filter, update] = Product.findOneAndUpdate.mock.calls[0].arguments;
    assert.deepEqual(filter, {
      _id: 'p2',
      variants: { $elemMatch: { size: 'M', color: 'Red' } },
    });
    assert.deepEqual(update, {
      $inc: { 'variants.$.stock': 2, stock: 2 },
    });
    assert.equal(Product.findByIdAndUpdate.mock.callCount(), 0);
  });

  it('falls back to product-level stock when the variant no longer exists', async () => {
    const productDoc = {
      _id: 'p3',
      stock: 4,
      variants: [{ size: 'S', color: 'Black', stock: 4 }],
    };
    const Product = {
      findById: mock.fn(async () => productDoc),
      findOneAndUpdate: mock.fn(async () => null),
      findByIdAndUpdate: mock.fn(async () => {}),
    };

    await restoreStockForCanceledOrder(Product, {
      items: [{ productId: 'p3', qty: 1, variant: { size: 'XL' } }],
    });

    assert.equal(Product.findOneAndUpdate.mock.callCount(), 1);
    assert.deepEqual(Product.findByIdAndUpdate.mock.calls[0].arguments, [
      'p3',
      { $inc: { stock: 1 } },
    ]);
  });
});

describe('restoreStockOnce', () => {
  const order = { _id: 'o1', items: [{ productId: 'p1', qty: 2 }] };

  function fakeProduct() {
    return {
      findById: mock.fn(async () => ({ _id: 'p1', stock: 0, variants: [] })),
      findByIdAndUpdate: mock.fn(async () => {}),
    };
  }

  it('claims stockRestored and restores when not yet restored', async () => {
    const OrderModel = {
      findOneAndUpdate: mock.fn(async () => ({ ...order, stockRestored: true })),
      updateOne: mock.fn(async () => {}),
    };
    const Product = fakeProduct();

    const restored = await restoreStockOnce(OrderModel, Product, order);

    assert.equal(restored, true);
    assert.deepEqual(OrderModel.findOneAndUpdate.mock.calls[0].arguments[0], {
      _id: 'o1',
      stockDecremented: true,
      stockRestored: false,
    });
    assert.equal(Product.findByIdAndUpdate.mock.callCount(), 1);
  });

  it('is a no-op when another caller already restored', async () => {
    const OrderModel = {
      findOneAndUpdate: mock.fn(async () => null),
      updateOne: mock.fn(async () => {}),
    };
    const Product = fakeProduct();

    const restored = await restoreStockOnce(OrderModel, Product, order);

    assert.equal(restored, false);
    assert.equal(Product.findByIdAndUpdate.mock.callCount(), 0);
  });

  it('releases the claim when restoring throws', async () => {
    const OrderModel = {
      findOneAndUpdate: mock.fn(async () => ({ ...order, stockRestored: true })),
      updateOne: mock.fn(async () => {}),
    };
    const Product = {
      findById: mock.fn(async () => {
        throw new Error('db down');
      }),
    };

    await assert.rejects(
      () => restoreStockOnce(OrderModel, Product, order),
      /db down/,
    );
    assert.deepEqual(OrderModel.updateOne.mock.calls[0].arguments, [
      { _id: 'o1' },
      { $set: { stockRestored: false } },
    ]);
  });
});
