/**
 * Pricing domain: money rounding, order totals, fulfilment normalization,
 * and shipping/tax resolution. Shared by checkout, quote, order transitions
 * and returns. Extracted from commerce.service.js — behavior unchanged.
 */

const { getStoreSettings } = require('./storeSettings.service');

const FLAT_SHIPPING_USD = () => {
  const n = Number(process.env.SHIPPING_FLAT_USD);
  return Number.isFinite(n) && n >= 0 ? n : 5;
};

const TAX_RATE_PERCENT_ENV = () => {
  const n = Number(process.env.TAX_RATE_PERCENT);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0;
};

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
      } else {
        // A zone matched the address, but not the requested method handle
        // (DASH-609/API-203) — stale/renamed/deactivated method, or a bug
        // on the client. Letting this fall through to the flat rate would
        // silently charge the wrong price; the caller must fail the quote
        // instead. (When no zone matches the address at all, the flat-rate
        // fallback below is still the correct, intended behavior.)
        const err = new Error(
          `Shipping method "${shippingMethod}" is not available for this address`,
        );
        err.statusCode = 400;
        err.code = 'SHIPPING_METHOD_UNAVAILABLE';
        throw err;
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

module.exports = {
  matchVariant,
  roundMoney,
  computeOrderTotal,
  resolveUnitPrice,
  resolveAvailableStock,
  resolveFulfillment,
  resolveShippingPrice,
  resolveTaxPrice,
  FLAT_SHIPPING_USD,
};
