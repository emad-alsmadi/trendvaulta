const { Coupon } = require('../models/Coupon');
const logger = require('./logger');

const FLAT_SHIPPING_USD = () => {
  const n = Number(process.env.SHIPPING_FLAT_USD);
  return Number.isFinite(n) && n >= 0 ? n : 5;
};

const TAX_RATE_PERCENT_ENV = () => {
  const n = Number(process.env.TAX_RATE_PERCENT);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0;
};

// In-process cache of the StoreSettings singleton, refreshed at most every
// 30s so checkout/quote requests don't hit the DB on every call. Cleared
// immediately whenever the admin updates settings (see invalidateStoreSettingsCache).
const STORE_SETTINGS_CACHE_TTL_MS = 30_000;
let storeSettingsCache = { value: undefined, expiresAt: 0 };

function invalidateStoreSettingsCache() {
  storeSettingsCache = { value: undefined, expiresAt: 0 };
}

async function getStoreSettings() {
  const now = Date.now();
  if (storeSettingsCache.value !== undefined && storeSettingsCache.expiresAt > now) {
    return storeSettingsCache.value;
  }

  let value = null;
  try {
    // Lazy require avoids a require cycle at module load time.
    const { StoreSettings, SINGLETON_ID } = require('../models/StoreSettings');
    value = await StoreSettings.findById(SINGLETON_ID).lean();
  } catch (_err) {
    value = null;
  }

  storeSettingsCache = { value, expiresAt: now + STORE_SETTINGS_CACHE_TTL_MS };
  return value;
}

function matchVariant(product, variant) {
  if (!variant || !Array.isArray(product.variants) || product.variants.length === 0) {
    return null;
  }
  return (
    product.variants.find((v) => {
      const sizeOk =
        variant.size == null || String(v.size || '') === String(variant.size);
      const colorOk =
        variant.color == null || String(v.color || '') === String(variant.color);
      const skuOk =
        !variant.sku || String(v.sku || '') === String(variant.sku);
      return sizeOk && colorOk && skuOk;
    }) || null
  );
}

/**
 * Round a dollar amount to whole cents. Every money value the server stores
 * or sends to Stripe goes through this, so the order total always equals
 * what Stripe charges (Stripe works in integer cents per unit/line).
 */
function roundMoney(amount) {
  const n = Number(amount) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Order total from already-rounded parts (never negative). */
function computeOrderTotal({ itemsPrice, discountAmount, shippingPrice, taxPrice }) {
  return roundMoney(
    Math.max(0, itemsPrice - discountAmount + shippingPrice + taxPrice),
  );
}

function resolveUnitPrice(product, matchedVariant) {
  if (
    matchedVariant &&
    matchedVariant.price != null &&
    Number.isFinite(Number(matchedVariant.price))
  ) {
    return roundMoney(matchedVariant.price);
  }
  return roundMoney(product.price);
}

function resolveAvailableStock(product, matchedVariant) {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    if (!matchedVariant) return 0;
    return Number(matchedVariant.stock ?? 0);
  }
  return Number(product.stock ?? 0);
}

/**
 * Normalise the checkout's fulfilment intent so the price charged and the
 * method stored on the order always agree. `delivery: false` or method
 * 'none' means store pickup ($0 shipping, not shipped); anything else is a
 * delivery using the given zone/method handle, defaulting to 'standard'.
 * @returns {{ delivery: boolean, shippingMethod: string }}
 */
function resolveFulfillment({ delivery, shippingMethod } = {}) {
  const method = typeof shippingMethod === 'string' ? shippingMethod.trim() : '';
  if (delivery === false || method === 'none') {
    return { delivery: false, shippingMethod: 'none' };
  }
  if (delivery === true || method) {
    return { delivery: true, shippingMethod: method || 'standard' };
  }
  return { delivery: false, shippingMethod: 'none' };
}

/**
 * Resolve the shipping charge from ShippingZone model (falling back to
 * StoreSettings/env-based flat rate when no zone matches). `itemsPrice`
 * is optional and, when provided, zeroes the rate once it meets the
 * configured free-shipping threshold (0 = disabled).
 */
async function resolveShippingPrice({
  delivery,
  shippingMethod,
  itemsPrice = 0,
  country,
  zip,
  region,
} = {}) {
  const isStandard = shippingMethod === 'standard' || delivery === true;
  const isExpress = shippingMethod === 'express';
  if (!isStandard && !isExpress) {
    if (shippingMethod === 'none' || delivery === false) return 0;
    // Default: no physical shipping charge unless explicitly requested
    return 0;
  }

  let rate = 0;
  let freeThreshold = 0;
  // null = no zone method matched. Kept apart from the rate so a zone
  // method priced at $0 (free) doesn't fall through to the flat rate.
  let zoneRate = null;

  if (country) {
    const {
      ShippingZone,
      zoneMatchesAddress,
    } = require('../models/ShippingZone');
    const countryCode = String(country).toUpperCase();
    const zones = await ShippingZone.find({
      isActive: true,
      $or: [
        { countries: countryCode },
        { countries: { $size: 0 } },
      ],
    }).sort({ sortOrder: 1 }).lean();

    const matchedZone = zones.find(
      (zone) =>
        (zone.countries.length === 0 || zone.countries.includes(countryCode)) &&
        zoneMatchesAddress(zone, { region, zip }),
    );

    if (matchedZone) {
      const method = matchedZone.methods.find(
        (m) => m.handle === shippingMethod && m.isActive,
      );
      if (method) {
        zoneRate = Number(method.priceUsd) || 0;
      }
    }
  }

  if (zoneRate === null) {
    const settings = await getStoreSettings();
    const standardRate = Number.isFinite(Number(settings?.shipping?.standardRateUsd))
      ? Number(settings.shipping.standardRateUsd)
      : FLAT_SHIPPING_USD();
    const expressRate = Number.isFinite(Number(settings?.shipping?.expressRateUsd))
      ? Number(settings.shipping.expressRateUsd)
      : FLAT_SHIPPING_USD();
    freeThreshold = Number(settings?.shipping?.freeShippingThresholdUsd) || 0;
    rate = isExpress ? expressRate : standardRate;
  } else {
    rate = zoneRate;
    const settings = await getStoreSettings();
    freeThreshold = Number(settings?.shipping?.freeShippingThresholdUsd) || 0;
  }

  if (freeThreshold > 0 && Number(itemsPrice) >= freeThreshold) {
    return 0;
  }
  return roundMoney(rate);
}

/**
 * Resolve the tax charge from StoreSettings' taxRatePercent (env fallback
 * when no settings document exists yet).
 */
async function resolveTaxPrice(itemsPrice = 0) {
  const settings = await getStoreSettings();
  const ratePercent = Number.isFinite(Number(settings?.taxRatePercent))
    ? Number(settings.taxRatePercent)
    : TAX_RATE_PERCENT_ENV();
  const amount = (Math.max(0, Number(itemsPrice) || 0) * ratePercent) / 100;
  return Math.round(amount * 100) / 100;
}

function calculateCouponDiscount(coupon, orderAmount) {
  const amount = Math.max(0, Number(orderAmount) || 0);
  if (!coupon) {
    return { discountAmount: 0, valid: false, message: 'Coupon not found' };
  }
  if (!coupon.isActive) {
    return { discountAmount: 0, valid: false, message: 'Coupon is inactive' };
  }
  if (new Date(coupon.expirationDate) < new Date()) {
    return { discountAmount: 0, valid: false, message: 'Coupon has expired' };
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return {
      discountAmount: 0,
      valid: false,
      message: 'Coupon usage limit has been reached',
    };
  }
  if (amount < Number(coupon.minimumOrderAmount || 0)) {
    return {
      discountAmount: 0,
      valid: false,
      message: `Minimum order amount of $${coupon.minimumOrderAmount} required`,
    };
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (amount * Number(coupon.discountValue)) / 100;
  } else {
    discountAmount = Number(coupon.discountValue);
  }
  discountAmount = roundMoney(Math.min(Math.max(0, discountAmount), amount));

  return { discountAmount, valid: true };
}

// A Stripe Checkout session lives 30 min (payment.controller); a pending
// order younger than this is an open checkout holding a coupon use.
const OPEN_CHECKOUT_WINDOW_MS = 31 * 60 * 1000;

/**
 * Usage limits that need order history (calculateCouponDiscount only sees
 * the coupon). Global: paid uses + other shoppers' open checkouts must stay
 * under usageLimit, so concurrent sessions can't all redeem the last use.
 * Per customer: only this customer's PAID orders count, so returning from
 * Stripe to retry isn't blocked by their own abandoned checkout.
 * @returns {Promise<{ valid: boolean, message?: string }>}
 */
async function checkCouponUsage(coupon, userId) {
  if (!coupon) return { valid: false, message: 'Coupon not found' };
  const { Order } = require('../models/Order');

  if (coupon.usageLimit) {
    const openFilter = {
      couponId: coupon._id,
      paymentStatus: 'pending',
      createdAt: { $gte: new Date(Date.now() - OPEN_CHECKOUT_WINDOW_MS) },
    };
    if (userId) openFilter.user = { $ne: userId };
    const openCheckouts = await Order.countDocuments(openFilter);
    if (Number(coupon.usedCount || 0) + openCheckouts >= coupon.usageLimit) {
      return { valid: false, message: 'Coupon usage limit has been reached' };
    }
  }

  if (coupon.perCustomerLimit && userId) {
    const usedByCustomer = await Order.countDocuments({
      couponId: coupon._id,
      user: userId,
      paymentStatus: 'paid',
    });
    if (usedByCustomer >= coupon.perCustomerLimit) {
      return { valid: false, message: 'You have already used this coupon' };
    }
  }

  return { valid: true };
}

async function loadValidCouponByCode(code) {
  if (!code || typeof code !== 'string') return null;
  return Coupon.findOne({ code: code.trim().toUpperCase() });
}

/**
 * Build authoritative order lines from client productId/qty/variant hints.
 * Never trusts client price/title/cover.
 */
async function buildNormalizedOrderLines(Product, items) {
  // One order can hold several lines of the same product (different variants),
  // so compare against unique ids — find() returns each document once.
  const productIds = [...new Set(items.map((i) => String(i.productId)))];
  const products = await Product.find({ _id: { $in: productIds } });
  if (products.length !== productIds.length) {
    const err = new Error('One or more products not found');
    err.statusCode = 400;
    throw err;
  }

  const productsById = new Map(products.map((p) => [String(p._id), p]));
  const normalizedItems = [];

  for (const i of items) {
    const p = productsById.get(String(i.productId));
    if (!p) {
      const err = new Error('One or more products not found');
      err.statusCode = 404;
      throw err;
    }
    if (p.isActive === false) {
      const err = new Error(`Product is not available: ${p.title}`);
      err.statusCode = 400;
      throw err;
    }

    const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
    const matchedVariant = matchVariant(p, i.variant);
    if (hasVariants) {
      if (!i.variant || !matchedVariant) {
        const err = new Error(`Variant selection required for ${p.title}`);
        err.statusCode = 400;
        throw err;
      }
    }

    const qty = Number(i.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      const err = new Error('Quantity must be a positive integer');
      err.statusCode = 400;
      throw err;
    }

    const available = resolveAvailableStock(p, matchedVariant);
    if (qty > available) {
      const err = new Error(`Insufficient stock for ${p.title}`);
      err.statusCode = 400;
      // Same code as a lost reservation race (409), so clients treat both alike
      err.code = 'OUT_OF_STOCK';
      throw err;
    }

    const price = resolveUnitPrice(p, matchedVariant);
    normalizedItems.push({
      productId: p._id,
      title: p.title,
      price,
      qty,
      cover: p.cover,
      variant: matchedVariant
        ? {
            size: matchedVariant.size,
            color: matchedVariant.color,
            colorCode: matchedVariant.colorCode,
            sku: matchedVariant.sku,
          }
        : i.variant || undefined,
    });
  }

  const itemsPrice = roundMoney(
    normalizedItems.reduce((sum, it) => sum + it.price * it.qty, 0),
  );

  return { normalizedItems, itemsPrice };
}

/**
 * Tolerant variant of buildNormalizedOrderLines for cart/checkout quotes.
 * Never throws on stock/availability problems: every known product yields a
 * line (with `available`) and a warning; unknown ids yield a warning only.
 * itemsPrice counts only the purchasable quantity (min(qty, available)).
 * @returns {Promise<{ lines: Array, itemsPrice: number, warnings: Array }>}
 */
async function quoteOrderLines(Product, items) {
  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  const warnings = [];

  for (const i of items) {
    const productId = String(i.productId);
    const p = productsById.get(productId);
    if (!p) {
      warnings.push({
        productId,
        code: 'unavailable',
        message: 'This product is no longer available',
      });
      continue;
    }

    const qty = Math.max(1, Number(i.qty) || 1);
    const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
    const matchedVariant = matchVariant(p, i.variant);
    const price = resolveUnitPrice(p, matchedVariant);
    let available = resolveAvailableStock(p, matchedVariant);

    if (p.isActive === false) {
      available = 0;
      warnings.push({
        productId,
        code: 'unavailable',
        message: `${p.title} is not available right now`,
        available,
      });
    } else if (hasVariants && !matchedVariant) {
      available = 0;
      warnings.push({
        productId,
        code: 'variant_required',
        message: `Please choose an option (size/color) for ${p.title}`,
        available,
      });
    } else if (qty > available) {
      warnings.push({
        productId,
        code: 'insufficient_stock',
        message:
          available > 0
            ? `Only ${available} of ${p.title} left in stock`
            : `${p.title} is out of stock`,
        available,
      });
    }

    if (
      i.price != null &&
      Number.isFinite(Number(i.price)) &&
      Number(i.price) !== price
    ) {
      warnings.push({
        productId,
        code: 'price_changed',
        message: `The price of ${p.title} has changed`,
      });
    }

    lines.push({
      productId,
      title: p.title,
      price,
      qty,
      available,
      cover: p.cover,
      variant: matchedVariant
        ? {
            size: matchedVariant.size,
            color: matchedVariant.color,
            colorCode: matchedVariant.colorCode,
            sku: matchedVariant.sku,
          }
        : i.variant || undefined,
    });
  }

  const itemsPrice = roundMoney(
    lines.reduce(
      (sum, it) => sum + it.price * Math.min(it.qty, Math.max(0, it.available)),
      0,
    ),
  );

  return { lines, itemsPrice, warnings };
}

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
  return err;
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
async function decrementStockForPaidOrder(Product, order) {
  const applied = [];

  try {
    for (const it of order.items || []) {
      const productId = it.productId;
      const qty = Number(it.qty);
      if (!productId || !(qty > 0)) continue;

      const product = await Product.findById(productId);
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
          { new: true },
        );
      } else {
        updated = await Product.findOneAndUpdate(
          { _id: productId, stock: { $gte: qty } },
          { $inc: { stock: -qty } },
          { new: true },
        );
      }

      if (!updated) {
        throw insufficientStockError(hasVariants ? product.title : '');
      }
      applied.push(it);
    }
  } catch (err) {
    if (applied.length > 0) {
      await restoreStockForCanceledOrder(Product, { items: applied }).catch(
        () => {},
      );
    }
    throw err;
  }
}
async function incrementCouponUsedCount(couponId) {
  if (!couponId) return null;
  return Coupon.findByIdAndUpdate(
    couponId,
    { $inc: { usedCount: 1 } },
    { new: true },
  );
}

/**
 * Bump Product.salesCount for each paid line qty (bestselling sort).
 * Idempotency is enforced by the caller via order.salesCountIncremented.
 */
async function incrementSalesCountForPaidOrder(Product, order) {
  for (const it of order.items || []) {
    const productId = it.productId;
    const qty = Number(it.qty);
    if (!productId || !(qty > 0)) continue;

    await Product.findByIdAndUpdate(productId, {
      $inc: { salesCount: qty },
    });
  }
}

/**
 * Restore inventory after a paid order is canceled/refunded.
 * Idempotency is enforced by the caller via order.stockRestored
 * (see restoreStockOnce).
 */
async function restoreStockLine(Product, it) {
  const productId = it.productId;
  const qty = Number(it.qty);
  if (!productId || !(qty > 0)) return;

  const product = await Product.findById(productId);
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
      { new: true },
    );
    if (updated) return;
    // Variant no longer matches — restore against product-level stock
  }

  await Product.findByIdAndUpdate(productId, {
    $inc: { stock: qty },
  });
}

/**
 * Put every line of `order` back in stock. On failure the thrown error
 * carries `restoredLines` (lines already restocked) so the caller knows
 * whether a retry would double-count.
 */
async function restoreStockForCanceledOrder(Product, order) {
  let restoredLines = 0;
  for (const it of order.items || []) {
    try {
      await restoreStockLine(Product, it);
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
async function restoreStockForReturnedItems(Product, order, returnedItems) {
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
    await restoreStockLine(Product, { ...line, qty });
    remaining.set(id, left - qty);
  }
}

/**
 * Claim `stockRestored` with a conditional update so concurrent callers
 * (admin cancel vs. charge.refunded webhook) restore at most once.
 * @returns {Promise<boolean>} true when this call restored the stock
 */
async function restoreStockOnce(OrderModel, Product, order) {
  const claimed = await OrderModel.findOneAndUpdate(
    { _id: order._id, stockDecremented: true, stockRestored: false },
    { $set: { stockRestored: true } },
    { new: true },
  );
  if (!claimed) return false;

  try {
    await restoreStockForCanceledOrder(Product, claimed);
  } catch (err) {
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
      ).catch(() => {});
    }
    throw err;
  }
  return true;
}

module.exports = {
  matchVariant,
  roundMoney,
  computeOrderTotal,
  resolveUnitPrice,
  resolveAvailableStock,
  resolveFulfillment,
  resolveShippingPrice,
  resolveTaxPrice,
  getStoreSettings,
  invalidateStoreSettingsCache,
  calculateCouponDiscount,
  checkCouponUsage,
  loadValidCouponByCode,
  buildNormalizedOrderLines,
  quoteOrderLines,
  buildVariantMatch,
  decrementStockForPaidOrder,
  restoreStockForCanceledOrder,
  restoreStockForReturnedItems,
  restoreStockOnce,
  incrementCouponUsedCount,
  incrementSalesCountForPaidOrder,
  FLAT_SHIPPING_USD,
};
