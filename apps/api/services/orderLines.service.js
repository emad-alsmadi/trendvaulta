/**
 * Order-line pricing: builds authoritative lines from client product/qty/
 * variant hints (never trusts client price/title/cover) and the tolerant
 * quote variant. Extracted from commerce.service.js — behavior unchanged.
 */

const {
  matchVariant,
  resolveUnitPrice,
  resolveAvailableStock,
  roundMoney,
} = require('./pricing.service');

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

module.exports = {
  buildNormalizedOrderLines,
  quoteOrderLines,
};
