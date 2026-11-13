/**
 * Commerce domain facade. The implementation is split by responsibility:
 *
 * - storeSettings.service.js — StoreSettings singleton + short-lived cache
 * - pricing.service.js       — money rounding, totals, fulfilment, shipping/tax
 * - coupon.service.js        — discount math and usage-limit checks
 * - orderLines.service.js    — authoritative order lines + tolerant quotes
 * - stock.service.js         — atomic stock decrement/restock + salesCount
 *
 * Consumers keep importing from this module; the public surface is
 * unchanged. Moved from utils/commerce.js without behavior change.
 */

const pricing = require('./pricing.service');
const storeSettings = require('./storeSettings.service');
const coupon = require('./coupon.service');
const orderLines = require('./orderLines.service');
const stock = require('./stock.service');

module.exports = {
  matchVariant: pricing.matchVariant,
  roundMoney: pricing.roundMoney,
  computeOrderTotal: pricing.computeOrderTotal,
  resolveUnitPrice: pricing.resolveUnitPrice,
  resolveAvailableStock: pricing.resolveAvailableStock,
  resolveFulfillment: pricing.resolveFulfillment,
  resolveShippingPrice: pricing.resolveShippingPrice,
  resolveTaxPrice: pricing.resolveTaxPrice,
  FLAT_SHIPPING_USD: pricing.FLAT_SHIPPING_USD,
  getStoreSettings: storeSettings.getStoreSettings,
  invalidateStoreSettingsCache: storeSettings.invalidateStoreSettingsCache,
  calculateCouponDiscount: coupon.calculateCouponDiscount,
  checkCouponUsage: coupon.checkCouponUsage,
  loadValidCouponByCode: coupon.loadValidCouponByCode,
  buildNormalizedOrderLines: orderLines.buildNormalizedOrderLines,
  quoteOrderLines: orderLines.quoteOrderLines,
  buildVariantMatch: stock.buildVariantMatch,
  decrementStockForPaidOrder: stock.decrementStockForPaidOrder,
  restoreStockForCanceledOrder: stock.restoreStockForCanceledOrder,
  restoreStockForReturnedItems: stock.restoreStockForReturnedItems,
  restoreStockOnce: stock.restoreStockOnce,
  incrementCouponUsedCount: coupon.incrementCouponUsedCount,
  incrementSalesCountForPaidOrder: stock.incrementSalesCountForPaidOrder,
};
