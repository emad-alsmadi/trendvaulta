'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, ShoppingBag, Star } from 'lucide-react';
import { WishlistButton } from '@/components/page/wishlist/WishlistButton';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/lib/cartStore';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/contexts/TranslationContext';
import type { Brand, Product } from '@/types';

export type ProductCardBadge = 'bestseller' | 'lowStock' | 'new';

export type ProductCardProduct = Pick<
  Product,
  | '_id'
  | 'title'
  | 'description'
  | 'price'
  | 'basePrice'
  | 'cover'
  | 'averageRating'
  | 'reviewCount'
  | 'category'
  | 'subcategory'
  | 'brand'
  | 'stock'
  | 'variants'
>;

interface ProductCardProps {
  product: ProductCardProduct;
  /** Merchandising flags — from Product.badges (API) */
  badges?: ProductCardBadge[];
}

function getBrandMeta(brand: Product['brand']): Brand | null {
  if (!brand || typeof brand === 'string') return null;
  return brand;
}

export function ProductCard({ product, badges = [] }: ProductCardProps) {
  const cart = useCart();
  const { toast } = useToast();
  const { t, formatPrice } = useTranslation();
  const brand = getBrandMeta(product.brand);
  // Covers are free-text URLs; a dead one falls back to a neutral placeholder
  // instead of the browser's broken-image icon and alt text.
  const [coverFailed, setCoverFailed] = useState(false);
  // A size/colour must be picked on the product page: the server prices
  // and stocks per variant, so a variant-less line would quote at $0.
  const needsVariant = Boolean(product.variants && product.variants.length > 0);

  const handleAddToCart = () => {
    cart.addToCart({
      productId: product._id,
      title: product.title,
      price: product.price,
      cover: product.cover,
      qty: 1,
      maxQty: typeof product.stock === 'number' ? product.stock : undefined,
    });
    toast(t('product.addedToCart', { title: product.title }), {
      variant: 'success',
    });
  };

  const discount =
    product.basePrice > product.price
      ? Math.round(
          ((product.basePrice - product.price) / product.basePrice) * 100,
        )
      : 0;

  const inStock = product.stock !== undefined ? product.stock > 0 : true;
  // The API now computes this from variant stock when the product has
  // variants (resolveProductBadges, apps/api/models/Product.js), so a
  // client-side fallback on the top-level `stock` field would reintroduce
  // the exact bug this was meant to catch — trust `badges` only.
  const lowStock = badges.includes('lowStock');

  const rating = Number(product.averageRating || 0);
  const pill =
    'rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold leading-none shadow-soft';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className='group flex h-full w-full flex-col'
    >
      {/* Media. The wishlist button is a sibling of the link, not a child:
          a button inside an anchor would navigate on click. */}
      <div className='relative'>
        <Link
          href={`/products/${product._id}`}
          className='relative block aspect-square overflow-hidden rounded-card bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'
        >
          {coverFailed ? (
            <div className='flex h-full w-full items-center justify-center'>
              <Package
                className='h-10 w-10 text-ink-subtle'
                strokeWidth={1.25}
                aria-hidden
              />
            </div>
          ) : (
            <Image
              src={product.cover}
              alt={product.title}
              fill
              className='object-cover transition-transform duration-(--dur-slow) ease-brand group-hover:scale-[1.04]'
              sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
              onError={() => setCoverFailed(true)}
            />
          )}
          <div className='absolute start-2.5 top-2.5 flex flex-col items-start gap-1.5'>
            {discount > 0 && (
              <span className={`${pill} bg-ink text-white`}>
                {t('productCard.discount', { percent: discount })}
              </span>
            )}
            {badges.includes('bestseller') && (
              <span className={`${pill} bg-accent text-white`}>
                {t('productCard.badges.bestseller')}
              </span>
            )}
            {badges.includes('new') && (
              <span className={`${pill} bg-surface text-ink`}>
                {t('productCard.badges.new')}
              </span>
            )}
          </div>
          {!inStock && (
            <div className={`${pill} absolute bottom-2.5 start-2.5 bg-ink/80 text-white`}>
              {t('product.outOfStock')}
            </div>
          )}
          {inStock && lowStock && (
            <div className={`${pill} absolute bottom-2.5 start-2.5 bg-amber-100 text-amber-900`}>
              {t('productCard.badges.lowStock')}
            </div>
          )}
        </Link>
        <WishlistButton
          productId={product._id}
          variant='icon'
          tone='onLight'
          className='absolute end-2.5 top-2.5 inline-flex h-9 w-9 items-center justify-center bg-surface/90 !p-0 shadow-soft [&>svg]:h-4 [&>svg]:w-4'
        />
      </div>

      <div className='flex flex-1 flex-col pt-3'>
        {brand && (
          <Link
            href={`/brands/${brand._id || brand.slug}`}
            className='mb-1 block truncate text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-muted transition-colors hover:text-accent rtl:tracking-normal'
          >
            {brand.name}
          </Link>
        )}

        <Link href={`/products/${product._id}`}>
          <h3
            dir='auto'
            className='line-clamp-2 text-sm font-medium leading-snug text-ink transition-colors hover:text-accent'
          >
            {product.title}
          </h3>
        </Link>

        <div className='mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted'>
          <span className='sr-only'>
            {t('productCard.ratingSummary', {
              rating: rating.toFixed(1),
              count: product.reviewCount || 0,
            })}
          </span>
          <Star
            className='h-3.5 w-3.5 fill-amber-400 text-amber-400'
            aria-hidden
          />
          <span className='font-semibold tabular-nums text-ink' aria-hidden>
            {rating.toFixed(1)}
          </span>
          <span className='tabular-nums' aria-hidden>
            ({product.reviewCount || 0})
          </span>
        </div>

        <div className='mt-2 flex flex-wrap items-baseline gap-x-2'>
          <span className='text-base font-semibold tabular-nums text-ink'>
            {formatPrice(product.price)}
          </span>
          {discount > 0 && (
            <span className='text-sm tabular-nums text-ink-subtle line-through'>
              {formatPrice(product.basePrice)}
            </span>
          )}
        </div>

        <div className='mt-auto pt-3'>
          {needsVariant ? (
            <Link
              href={`/products/${product._id}`}
              className='inline-flex h-10 w-full items-center justify-center rounded-control border border-line px-3 text-sm font-semibold text-ink transition-colors duration-(--dur-fast) hover:border-ink'
            >
              {t('productCard.chooseOptions')}
            </Link>
          ) : (
            <Button
              variant='line'
              size='sm'
              onClick={handleAddToCart}
              disabled={!inStock}
              className='w-full border-line hover:border-ink'
            >
              <ShoppingBag className='h-4 w-4' aria-hidden />
              {t('productCard.add')}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
