'use client';

import { useState } from 'react';
import { useProductById } from '@/hooks/products/productsQuery';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import type { ProductVariant } from '@/types';

/**
 * Lets a shopper fix a `variant_required` cart line in place: picks a
 * size/colour for the product and hands the resolved variant back to the
 * caller, which replaces the broken line via cartStore's `replaceCartLine`.
 * Only fetches the product while actually shown (the cart page mounts one
 * of these per blocked line, gated on `notice?.code === 'variant_required'`).
 */
export function InlineVariantPicker({
  productId,
  onConfirm,
}: {
  productId: string;
  onConfirm: (variant: ProductVariant) => void;
}) {
  const { data: product, isLoading, isError } = useProductById(productId);
  const [selected, setSelected] = useState<ProductVariant | null>(null);
  const { t, formatPrice } = useTranslation();

  if (isLoading) {
    return (
      <p className='mt-2 text-xs text-ink-muted'>
        {t('cartPage.pickVariant.loading')}
      </p>
    );
  }

  if (isError || !product || !product.variants?.length) {
    return (
      <p className='mt-2 text-xs text-amber-700'>
        {t('cartPage.pickVariant.loadFailed')}
      </p>
    );
  }

  return (
    <div className='mt-2 rounded-control border border-amber-200 bg-amber-50/60 p-3'>
      <p className='text-xs font-medium text-ink'>
        {t('cartPage.pickVariant.choosePrompt')}
      </p>
      <RadioGroup
        aria-label={t('cartPage.pickVariant.title')}
        className='mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3'
        value={
          selected ? String(product.variants.indexOf(selected)) : ''
        }
        onValueChange={(value) => {
          const variant = product.variants?.[Number(value)];
          if (variant) setSelected(variant);
        }}
      >
        {product.variants.map((variant, idx) => {
          const stock = variant.stock ?? product.stock;
          const soldOut = stock <= 0;
          const label =
            [variant.size, variant.color].filter(Boolean).join(' / ') ||
            t('productPage.variants.optionNumber', { number: idx + 1 });
          return (
            <label
              key={variant.sku || `${variant.size}-${variant.color}-${idx}`}
              className={`flex items-center gap-1.5 rounded-control border border-line bg-surface px-2 py-1.5 text-xs transition-colors has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:bg-surface-sunken ${
                soldOut
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer hover:border-ink-subtle'
              }`}
            >
              <RadioGroupItem
                value={String(idx)}
                disabled={soldOut}
              />
              <span className='min-w-0 truncate'>
                {label}
                {soldOut ? ` · ${t('cartPage.pickVariant.soldOut')}` : ''}
              </span>
            </label>
          );
        })}
      </RadioGroup>
      <Button
        type='button'
        variant='line'
        size='sm'
        className='mt-2.5'
        disabled={!selected}
        onClick={() => {
          if (!selected) return;
          onConfirm({
            ...selected,
            price: selected.price ?? product.price,
            stock: selected.stock ?? product.stock,
          });
        }}
      >
        {selected
          ? `${t('cartPage.pickVariant.confirm')} — ${formatPrice(selected.price ?? product.price)}`
          : t('cartPage.pickVariant.confirm')}
      </Button>
    </div>
  );
}
