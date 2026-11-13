/**
 * Stock domain: atomic decrement on payment, restock on cancel/refund/
 * return, salesCount bumps, and the once-only claim guards that keep
 * webhook/admin retries idempotent. Extracted from commerce.service.js —
 * behavior unchanged.
 */

const logger = require('../utils/logger');
const {
  supportsTransactions,
  runInTransaction,
} = require('../utils/transactions');

/**
 * Mongo query conditions selecting the variant element that matchVariant()
 * would pick for `variant` (same size/color/sku semantics; '' matches unset).
 */
function buildVariantMatch(variant) {
  const match = {};
  for (const key of ['size', 'color']) {
    if (variant[key] == null) continue;
    const value = String(variant[key]);
    match[key] = value === '' ? { $in: ['', null] } : value;
  }
  if (variant.sku) match.sku = String(variant.sku);
  return match;
}

function insufficientStockError(title) {
  const err = new Error(
    title
      ? `Insufficient stock to fulfill ${title}`
      : 'Insufficient stock to fulfill order item',
  );
  err.statusCode = 409;
  // Explicit code: callers must not treat any 409 as a stock problem.
  err.code = 'INSUFFICIENT_STOCK';
  return err;
}

/**
 * Attach a MongoDB session to a query if one is provided, without calling
 * `.session(undefined)` (which mocks don't support).
 */
function withSession(query, session) {
  return session ? query.session(session) : query;
}

/**
 * Atomically decrement stock for every order line: when checkout reserves it
 * (payment.controller createCheckoutSession), or at payment for orders that
 * hold no reservation (older orders, direct/dev orders, staff resolving a
 * needs_attention order). Variant lines use a single
 * conditional positional update (variant match + stock >= qty), so concurrent
 * orders can never oversell. On a shortfall, lines already decremented are
 * restored best-effort and a 409 error is thrown.
 */
async function decrementStockForPaidOrder(Product, order, session) {
  const applied = [];

  try {
    for (const it of order.items || []) {
      const productId = it.productId;
      const qty = Number(it.qty);
      if (!productId || !(qty > 0)) continue;

      const product = await withSession(Product.findById(productId), session);
      if (!product) continue;

      const hasVariants =
        Array.isArray(product.variants) && product.variants.length > 0;

      let updated;
      if (hasVariants && it.variant) {
        updated = await Product.findOneAndUpdate(
          {
            _id: productId,
            variants: {
              $elemMatch: {
                ...buildVariantMatch(it.variant),
                stock: { $gte: qty },
              },
            },
          },
          // Keep product.stock in sync as sum of variants
          { $inc: { 'variants.$.stock': -qty, stock: -qty } },
          { new: true, ...(session ? { session } : {}) },
        );
      } else {
        updated = await Product.findOneAndUpdate(
          { _id: productId, stock: { $gte: qty } },
          { $inc: { stock: -qty } },
          { new: true, ...(session ? { session } : {}) },
        );
      }

      if (!updated) {
        throw insufficientStockError(hasVariants ? product.title : '');
      }
      applied.push(it);
    }
  } catch (err) {
    if (applied.length > 0) {
      await restoreStockForCanceledOrder(
        Product,
        { items: applied },
        session,
      ).catch(() => {});
    }
    throw err;
  }
}

/**
 * Bump Product.salesCount for each paid line qty (bestselling sort).
 * Idempotency is enforced by the caller via order.salesCountIncremented.
 */
async function incrementSalesCountForPaidOrder(Product, order, session) {
  for (const it of order.items || []) {
    const productId = it.productId;
    const qty = Number(it.qty);
    if (!productId || !(qty > 0)) continue;

    await Product.findByIdAndUpdate(
      productId,
      { $inc: { salesCount: qty } },
      ...(session ? [{ session }] : []),
    );
  }
}

/**
 * Restore inventory after a paid order is canceled/refunded.
 * Idempotency is enforced by the caller via order.stockRestored
 * (see restoreStockOnce).
 */
async function restoreStockLine(Product, it, session) {
  const productId = it.productId;
  const qty = Number(it.qty);
  if (!productId || !(qty > 0)) return;

  const product = await withSession(Product.findById(productId), session);
  if (!product) return;

  const hasVariants =
    Array.isArray(product.variants) && product.variants.length > 0;

  if (hasVariants && it.variant) {
    const updated = await Product.findOneAndUpdate(
      {
        _id: productId,
        variants: { $elemMatch: buildVariantMatch(it.variant) },
      },
      { $inc: { 'variants.$.stock': qty, stock: qty } },
      { new: true, ...(session ? { session } : {}) },
    );
    if (updated) return;
    // Variant no longer matches — restore against product-level stock
  }

  await Product.findByIdAndUpdate(
    productId,
    { $inc: { stock: qty } },
    ...(session ? [{ session }] : []),
  );
}

/**
 * Put every line of `order` back in stock. On failure the thrown error
 * carries `restoredLines` (lines already restocked) so the caller knows
 * whether a retry would double-count.
 */
async function restoreStockForCanceledOrder(Product, order, session) {
  let restoredLines = 0;
  for (const it of order.items || []) {
    try {
      await restoreStockLine(Product, it, session);
    } catch (err) {
      err.restoredLines = restoredLines;
      throw err;
    }
    restoredLines += 1;
  }
}

/**
 * Restock only the returned quantities (return.controller, on 'received').
 * Return items are per product, so each quantity is spread over that
 * product's order lines in order, keeping each line's variant.
 */
async function restoreStockForReturnedItems(
  Product,
  order,
  returnedItems,
  session,
) {
  const remaining = new Map();
  for (const item of returnedItems || []) {
    const id = String(item.productId);
    remaining.set(id, (remaining.get(id) || 0) + (Number(item.qty) || 0));
  }
  for (const line of order.items || []) {
    const id = String(line.productId);
    const left = remaining.get(id) || 0;
    if (left <= 0) continue;
    const qty = Math.min(left, Number(line.qty) || 0);
    if (qty <= 0) continue;
    await restoreStockLine(Product, { ...line, qty }, session);
    remaining.set(id, left - qty);
  }
}

/**
 * Claim `stockRestored` with a conditional update so concurrent callers
 * (admin cancel vs. charge.refunded webhook) restore at most once.
 * @returns {Promise<boolean>} true when this call restored the stock
 */
async function restoreStockOnce(OrderModel, Product, order, session) {
  // On a replica set the claim and every restock commit or abort together —
  // no more claimed-but-never-restocked window. Callers inside their own
  // transaction pass `session` and skip this wrapper.
  if (!session && supportsTransactions()) {
    return runInTransaction((s) =>
      restoreStockOnce(OrderModel, Product, order, s),
    );
  }

  const claimed = await OrderModel.findOneAndUpdate(
    { _id: order._id, stockDecremented: true, stockRestored: false },
    { $set: { stockRestored: true } },
    { new: true, ...(session ? { session } : {}) },
  );
  if (!claimed) return false;

  try {
    await restoreStockForCanceledOrder(Product, claimed, session);
  } catch (err) {
    if (session) {
      // Inside a transaction the abort rolls the claim back too; the
      // restoredLines count is meaningless before commit.
      throw err;
    }
    if (err?.restoredLines) {
      // Some lines are already back in stock: releasing the claim would let
      // a retry restock them twice. Keep it and leave the rest to staff.
      logger.error(
        `Order ${order._id}: stock partly restored (${err.restoredLines} line(s)); fix the rest manually`,
      );
    } else {
      await OrderModel.updateOne(
        { _id: order._id },
        { $set: { stockRestored: false } },
        ...(session ? [{ session }] : []),
      ).catch(() => {});
    }
    throw err;
  }
  return true;
}

module.exports = {
  buildVariantMatch,
  decrementStockForPaidOrder,
  restoreStockForCanceledOrder,
  restoreStockForReturnedItems,
  restoreStockOnce,
  incrementSalesCountForPaidOrder,
};
