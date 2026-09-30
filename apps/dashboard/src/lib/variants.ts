import type { ProductVariant } from './api';
import type { MessageKey } from '../i18n/en';

/** Case-insensitive size+color key; two rows sharing one are ambiguous at checkout. */
export function variantKey(v: ProductVariant) {
  return `${(v.size || '').trim().toLowerCase()}|${(v.color || '').trim().toLowerCase()}`;
}

export type VariantProblem = { key: MessageKey; vars: { n: number } };

/**
 * Returns the problem with the variant rows (a message key + values, so the
 * caller shows it in the reader's language), or null when they can be saved.
 * Checkout matches a cart line to the *first* variant with the same size and
 * color (utils/commerce.js matchVariant), so a duplicate pair would make the
 * second row unsellable while still showing its stock.
 */
export function validateVariants(variants: ProductVariant[]): VariantProblem | null {
  const seen = new Set<string>();
  for (const [i, v] of variants.entries()) {
    if (!v.size?.trim() && !v.color?.trim()) {
      return { key: 'variants.errorEmpty', vars: { n: i + 1 } };
    }
    const key = variantKey(v);
    if (seen.has(key)) {
      return { key: 'variants.errorDuplicate', vars: { n: i + 1 } };
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
