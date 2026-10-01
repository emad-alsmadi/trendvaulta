import { Plus, Trash2 } from 'lucide-react';
import type { ProductVariant } from '../../lib/api';
import { useT } from '../../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Field';
import { hintClass, labelClass } from '../ui/styles';

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
  const { t } = useT();
  function update(index: number, patch: Partial<ProductVariant>) {
    onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }
  const fieldLabel = (i: number, field: string) =>
    t('variants.fieldLabel', { n: i + 1, field });

  return (
    <fieldset className='space-y-3'>
      <div className='space-y-1'>
        <legend className={labelClass}>{t('variants.legend')}</legend>
        <p className={hintClass}>{t('variants.hint')}</p>
      </div>

      {value.length > 0 && (
        <div className='space-y-2'>
          {value.map((v, i) => (
            <div
              key={i}
              className='grid grid-cols-2 items-center gap-2 rounded-badge border border-border bg-muted/40 p-2 sm:grid-cols-[1fr_1fr_5rem_5.5rem_1fr_auto]'
            >
              <Input
                aria-label={fieldLabel(i, t('variants.size'))}
                placeholder={t('variants.size')}
                value={v.size ?? ''}
                onChange={(e) => update(i, { size: e.target.value })}
              />
              <div className='flex gap-1.5'>
                <Input
                  aria-label={fieldLabel(i, t('variants.color'))}
                  placeholder={t('variants.color')}
                  value={v.color ?? ''}
                  onChange={(e) => update(i, { color: e.target.value })}
                />
                <input
                  type='color'
                  aria-label={fieldLabel(i, t('variants.swatch'))}
                  value={v.colorCode || '#000000'}
                  onChange={(e) => update(i, { colorCode: e.target.value })}
                  className='size-9 shrink-0 cursor-pointer rounded-control border border-input bg-background p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                />
              </div>
              <Input
                type='number'
                min={0}
                step={1}
                aria-label={fieldLabel(i, t('variants.stock'))}
                placeholder={t('variants.stock')}
                value={v.stock}
                onChange={(e) =>
                  update(i, {
                    stock: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                  })
                }
              />
              <Input
                type='number'
                min={0}
                step='0.01'
                aria-label={fieldLabel(i, t('variants.price'))}
                placeholder={t('variants.price')}
                value={v.price ?? ''}
                onChange={(e) =>
                  update(i, {
                    price:
                      e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
              <Input
                aria-label={fieldLabel(i, t('variants.sku'))}
                placeholder={t('variants.sku')}
                dir='ltr'
                value={v.sku ?? ''}
                onChange={(e) => update(i, { sku: e.target.value })}
              />
              <IconButton
                icon={<Trash2 aria-hidden />}
                label={t('variants.remove', { n: i + 1 })}
                size='md'
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className='justify-self-end'
              />
            </div>
          ))}
        </div>
      )}

      <Button
        size='sm'
        className='border-dashed shadow-none'
        onClick={() => onChange([...value, { size: '', color: '', stock: 0 }])}
        icon={<Plus aria-hidden />}
      >
        {t('variants.add')}
      </Button>
    </fieldset>
  );
}
