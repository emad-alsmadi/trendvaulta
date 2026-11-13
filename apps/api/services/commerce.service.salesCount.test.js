const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const { incrementSalesCountForPaidOrder } = require('./commerce.service');

describe('incrementSalesCountForPaidOrder', () => {
  it('increments salesCount by line qty', async () => {
    const Product = {
      findByIdAndUpdate: mock.fn(async () => ({ salesCount: 5 })),
    };

    await incrementSalesCountForPaidOrder(Product, {
      items: [
        { productId: 'p1', qty: 2 },
        { productId: 'p2', qty: 1 },
      ],
    });

    assert.equal(Product.findByIdAndUpdate.mock.callCount(), 2);
    assert.deepEqual(Product.findByIdAndUpdate.mock.calls[0].arguments, [
      'p1',
      { $inc: { salesCount: 2 } },
    ]);
    assert.deepEqual(Product.findByIdAndUpdate.mock.calls[1].arguments, [
      'p2',
      { $inc: { salesCount: 1 } },
    ]);
  });

  it('skips invalid productId or non-positive qty', async () => {
    const Product = {
      findByIdAndUpdate: mock.fn(async () => {}),
    };

    await incrementSalesCountForPaidOrder(Product, {
      items: [
        { productId: null, qty: 2 },
        { productId: 'p1', qty: 0 },
        { productId: 'p1', qty: -1 },
        { productId: 'p3', qty: 4 },
      ],
    });

    assert.equal(Product.findByIdAndUpdate.mock.callCount(), 1);
    assert.deepEqual(Product.findByIdAndUpdate.mock.calls[0].arguments, [
      'p3',
      { $inc: { salesCount: 4 } },
    ]);
  });
});
