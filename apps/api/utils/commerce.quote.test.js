const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { quoteOrderLines } = require('./commerce');

const simple = {
  _id: 'p1',
  title: 'Serum',
  price: 20,
  stock: 3,
  cover: 'https://cdn/serum.jpg',
  variants: [],
};

const withVariants = {
  _id: 'p2',
  title: 'Tee',
  price: 40,
  stock: 5,
  cover: 'https://cdn/tee.jpg',
  variants: [
    { size: 'M', color: 'Red', stock: 5, price: 45, sku: 'T-M-R' },
    { size: 'L', color: 'Blue', stock: 0, price: 50, sku: 'T-L-B' },
  ],
};

const inactive = {
  _id: 'p3',
  title: 'Old',
  price: 9,
  stock: 10,
  cover: 'https://cdn/old.jpg',
  isActive: false,
  variants: [],
};

function fakeProduct(docs) {
  return {
    async find(query) {
      const ids = query._id.$in.map(String);
      return docs.filter((d) => ids.includes(String(d._id)));
    },
  };
}

describe('quoteOrderLines', () => {
  it('prices lines from the catalog and returns no warnings when fine', async () => {
    const { lines, itemsPrice, warnings } = await quoteOrderLines(
      fakeProduct([simple, withVariants]),
      [
        { productId: 'p1', qty: 2 },
        { productId: 'p2', qty: 1, variant: { size: 'M', color: 'Red' } },
      ],
    );

    assert.deepEqual(warnings, []);
    assert.equal(lines.length, 2);
    assert.equal(lines[0].price, 20);
    assert.equal(lines[0].available, 3);
    assert.equal(lines[1].price, 45);
    assert.equal(lines[1].available, 5);
    assert.deepEqual(lines[1].variant, {
      size: 'M',
      color: 'Red',
      colorCode: undefined,
      sku: 'T-M-R',
    });
    assert.equal(itemsPrice, 2 * 20 + 45);
  });

  it('warns on insufficient stock and only counts the purchasable qty', async () => {
    const { lines, itemsPrice, warnings } = await quoteOrderLines(
      fakeProduct([simple]),
      [{ productId: 'p1', qty: 5 }],
    );

    assert.equal(lines[0].qty, 5);
    assert.equal(lines[0].available, 3);
    assert.equal(itemsPrice, 3 * 20);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].code, 'insufficient_stock');
    assert.equal(warnings[0].productId, 'p1');
    assert.equal(warnings[0].available, 3);
  });

  it('warns variant_required with available 0 when the variant is missing', async () => {
    const { lines, itemsPrice, warnings } = await quoteOrderLines(
      fakeProduct([withVariants]),
      [{ productId: 'p2', qty: 1 }],
    );

    assert.equal(lines[0].available, 0);
    assert.equal(lines[0].price, 40);
    assert.equal(itemsPrice, 0);
    assert.equal(warnings[0].code, 'variant_required');
  });

  it('warns unavailable for inactive and unknown products', async () => {
    const { lines, warnings } = await quoteOrderLines(
      fakeProduct([inactive]),
      [
        { productId: 'p3', qty: 1 },
        { productId: 'missing', qty: 1 },
      ],
    );

    assert.equal(lines.length, 1);
    assert.equal(lines[0].available, 0);
    assert.deepEqual(
      warnings.map((w) => [w.productId, w.code]),
      [
        ['p3', 'unavailable'],
        ['missing', 'unavailable'],
      ],
    );
  });

  it('warns price_changed when the client price differs', async () => {
    const { warnings } = await quoteOrderLines(fakeProduct([simple]), [
      { productId: 'p1', qty: 1, price: 18 },
    ]);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].code, 'price_changed');

    const same = await quoteOrderLines(fakeProduct([simple]), [
      { productId: 'p1', qty: 1, price: 20 },
    ]);
    assert.deepEqual(same.warnings, []);
  });
});
