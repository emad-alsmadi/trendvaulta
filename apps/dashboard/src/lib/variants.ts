import type { ProductVariant } from './api';

/** Case-insensitive size+color key; two rows sharing one are ambiguous at checkout. */
export function variantKey(v: ProductVariant) {
  return `${(v.size || '').trim().toLowerCase()}|${(v.color || '').trim().toLowerCase()}`;
}

/**
 * Returns a user-facing problem with the variant rows, or null when they can
 * be saved. Checkout matches a cart line to the *first* variant with the same
 * size and color (utils/commerce.js matchVariant), so a duplicate pair would
 * make the second row unsellable while still showing its stock.
 */
export function validateVariants(variants: ProductVariant[]): string | null {
  const seen = new Set<string>();
  for (const [i, v] of variants.entries()) {
    if (!v.size?.trim() && !v.color?.trim()) {
      return `Variant ${i + 1} needs a size or a color.`;
    }
    const key = variantKey(v);
    if (seen.has(key)) {
      return `Variant ${i + 1} repeats the size/color of an earlier variant.`;
    }
    seen.add(key);
  }
  return null;
}

/** Only the keys the API's variant schema accepts, with blanks dropped
 *  (Joi.string() rejects ''), and never the stored subdocument `_id`. */
export function cleanVariant(v: ProductVariant): ProductVariant {
  const out: ProductVariant = { stock: Math.max(0, Math.floor(Number(v.stock) || 0)) };
  const size = v.size?.trim();
  const color = v.color?.trim();
  const sku = v.sku?.trim();
  if (size) out.size = size;
  if (color) out.color = color;
  if (color && v.colorCode) out.colorCode = v.colorCode;
  if (sku) out.sku = sku;
  if (typeof v.price === 'number' && Number.isFinite(v.price)) out.price = v.price;
  return out;
}

/** Short human label, e.g. "M / Black"; empty when neither is set. */
export function variantLabel(v: ProductVariant) {
  return [v.size, v.color].filter(Boolean).join(' / ');
}
