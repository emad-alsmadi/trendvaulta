import { Plus, Trash2 } from 'lucide-react';
import type { ProductVariant } from '../../lib/api';

const cell =
  'w-full min-w-0 rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white';

/**
 * Size/color rows, each with its own stock, optional price override and SKU.
 *
 * When any variant exists, checkout sells from variant stock and keeps the
 * product's stock equal to their sum — so the product form shows that total
 * instead of an editable stock field.
 */
export function VariantsEditor({
  value,
  onChange,
}: {
  value: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
}) {
  function update(index: number, patch: Partial<ProductVariant>) {
    onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  return (
    <fieldset className="text-sm">
      <legend className="mb-1 font-medium text-gray-700 dark:text-gray-300">
        Variants
      </legend>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Leave empty for a product sold as one item. Price is optional and
        overrides the product price for that variant.
      </p>

      {value.length > 0 && (
        <div className="mb-2 space-y-2">
          {value.map((v, i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 p-2 sm:grid-cols-[1fr_1fr_4.5rem_4.5rem_5rem_1fr_auto] dark:border-gray-700"
            >
              <input
                aria-label={`Variant ${i + 1} size`}
                placeholder="Size"
                value={v.size ?? ''}
                onChange={(e) => update(i, { size: e.target.value })}
                className={cell}
              />
              <div className="flex gap-1">
                <input
                  aria-label={`Variant ${i + 1} color`}
                  placeholder="Color"
                  value={v.color ?? ''}
                  onChange={(e) => update(i, { color: e.target.value })}
                  className={cell}
                />
                <input
                  type="color"
                  aria-label={`Variant ${i + 1} swatch`}
                  value={v.colorCode || '#000000'}
                  onChange={(e) => update(i, { colorCode: e.target.value })}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                />
              </div>
              <input
                type="number"
                min={0}
                step={1}
                aria-label={`Variant ${i + 1} stock`}
                placeholder="Stock"
                value={v.stock}
                onChange={(e) =>
                  update(i, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                }
                className={cell}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                aria-label={`Variant ${i + 1} price`}
                placeholder="Price"
                value={v.price ?? ''}
                onChange={(e) =>
                  update(i, {
                    price: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                className={cell}
              />
              <input
                aria-label={`Variant ${i + 1} SKU`}
                placeholder="SKU"
                value={v.sku ?? ''}
                onChange={(e) => update(i, { sku: e.target.value })}
                className={`${cell} sm:col-span-2`}
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label={`Remove variant ${i + 1}`}
                className="justify-self-end rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onChange([...value, { size: '', color: '', stock: 0 }])}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Add variant
      </button>
    </fieldset>
  );
}
