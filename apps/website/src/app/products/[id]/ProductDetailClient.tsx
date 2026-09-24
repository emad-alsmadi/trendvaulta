'use client';

import { useEffect, useState } from 'react';
import { useProductById } from '@/hooks/products/productsQuery';
import { motion } from 'framer-motion';
import {
  Loader2,
  Star,
  ShoppingCart,
  Share2,
  Truck,
  Shield,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import Image from 'next/image';
import { useCart, formatVariantLabel } from '@/lib/cartStore';
import { FrequentlyBoughtTogether } from '@/components/products/FrequentlyBoughtTogether';
import { ProductQaSection } from '@/components/products/ProductQaSection';
import { ProductReviewsSection } from '@/components/products/ProductReviewsSection';
import { WishlistButton } from '@/components/page/wishlist/WishlistButton';
import { trackRecentlyViewed } from '@/lib/recentlyViewed';
import { useTranslation } from '@/contexts/TranslationContext';
import type { Product, ProductVariant } from '@/types';

type Dimensions = Product['dimensions'];
type Translate = ReturnType<typeof useTranslation>['t'];

/** "30 × 20 × 10 cm" from whichever sides are set, or null when none are. */
function formatDimensions(d: Dimensions, t: Translate): string | null {
  const sides = [d?.length, d?.width, d?.height].filter(
    (v): v is number => typeof v === 'number' && v > 0,
  );
  return sides.length
    ? t('productPage.details.dimensionsValue', { dims: sides.join(' × ') })
    : null;
}

/** One readable line from the shipping object, or null when it says nothing. */
function shippingSummary(
  info: Product['shippingInfo'],
  t: Translate,
): string | null {
  if (!info) return null;
  const parts: string[] = [];
  if (info.weight)
    parts.push(t('productPage.shipping.packedWeight', { weight: info.weight }));
  const dims = formatDimensions(info.dimensions, t);
  if (dims) parts.push(t('productPage.shipping.package', { dims }));
  if (info.requiresSpecialHandling)
    parts.push(t('productPage.shipping.specialHandling'));
  if (!parts.length) return null;
  const line = parts.join(' · ');
  return line.charAt(0).toUpperCase() + line.slice(1);
}

export function ProductDetailClient({ id }: { id: string }) {
  const { data: product, isLoading, error } = useProductById(id);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const cart = useCart();
  const { t, formatPrice } = useTranslation();

  // DEMO: local recently viewed — TODO(api): POST /api/me/recently-viewed
  useEffect(() => {
    if (!product) return;
    trackRecentlyViewed({
      id: product._id,
      title: product.title,
      cover: product.cover,
      price: product.price,
      category: product.category,
    });
  }, [product]);

  if (isLoading) {
    return (
      <div role='status' className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='h-12 w-12 animate-spin text-fuchsia-600 mx-auto' aria-hidden />
          <p className='mt-4 text-gray-600'>{t('productPage.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center text-red-600'>
          {t('productPage.notFound')}
        </div>
      </div>
    );
  }

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.cover];
  const discount =
    product.basePrice > product.price
      ? Math.round(
          ((product.basePrice - product.price) / product.basePrice) * 100,
        )
      : 0;

  const hasVariants = Boolean(product.variants && product.variants.length > 0);
  const variantRequired = hasVariants && !selectedVariant;
  // Per-variant price/stock; fall back to product-level values.
  const unitPrice = selectedVariant?.price ?? product.price;
  const availableStock =
    hasVariants && selectedVariant
      ? (selectedVariant.stock ?? product.stock)
      : product.stock;
  const outOfStock = availableStock <= 0;
  const maxQty = Math.max(0, Math.floor(availableStock));
  const atMax = maxQty > 0 && quantity >= maxQty;
  const canPurchase = !variantRequired && !outOfStock;

  const handleAddToCart = () => {
    if (!canPurchase) return false;
    const variant = selectedVariant
      ? {
          size: selectedVariant.size,
          color: selectedVariant.color,
          colorCode: selectedVariant.colorCode,
          sku: selectedVariant.sku,
        }
      : undefined;
    cart.addToCart({
      productId: product._id,
      title: product.title,
      price: unitPrice,
      cover: product.cover,
      qty: Math.min(quantity, maxQty),
      variant,
      maxQty,
    });
    return true;
  };

  const handleBuyNow = () => {
    if (!handleAddToCart()) return;
    window.location.href = '/checkout';
  };

  const handleSelectVariant = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    const stock = variant.stock ?? product.stock;
    if (stock > 0 && quantity > stock) setQuantity(stock);
  };

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Breadcrumb */}
      <div className='bg-white border-b'>
        <div className='container mx-auto px-4 py-3'>
          <nav className='flex items-center gap-2 text-sm text-gray-600'>
            <Link
              href='/'
              className='hover:text-fuchsia-600'
            >
              {t('common.home')}
            </Link>
            <span>/</span>
            <Link
              href='/products'
              className='hover:text-fuchsia-600'
            >
              {t('common.products')}
            </Link>
            <span>/</span>
            {product.brand && typeof product.brand === 'object' && (
              <>
                <Link
                  href={`/brands/${product.brand._id}`}
                  className='hover:text-fuchsia-600'
                >
                  {product.brand.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className='text-gray-900 truncate max-w-xs'>
              {product.title}
            </span>
          </nav>
        </div>
      </div>

      <div className='container mx-auto px-4 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12'>
          {/* Image Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className='space-y-4'
          >
            <div className='relative aspect-square bg-white rounded-2xl overflow-hidden shadow-lg'>
              <Image
                src={images[selectedImage]}
                alt={product.title}
                fill
                className='object-cover'
              />
              {images.length > 1 && (
                <>
                  <button
                    type='button'
                    onClick={prevImage}
                    aria-label={t('productPage.gallery.previous')}
                    className='absolute start-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-md transition-colors'
                  >
                    <ChevronLeft className='h-5 w-5 rtl:-scale-x-100' />
                  </button>
                  <button
                    type='button'
                    onClick={nextImage}
                    aria-label={t('productPage.gallery.next')}
                    className='absolute end-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-md transition-colors'
                  >
                    <ChevronRight className='h-5 w-5 rtl:-scale-x-100' />
                  </button>
                </>
              )}
              {discount > 0 && (
                <div className='absolute top-4 start-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full'>
                  {t('productPage.discountBadge', { percent: discount })}
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className='flex gap-3 overflow-x-auto pb-2'>
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all relative ${
                      selectedImage === idx
                        ? 'border-fuchsia-600 ring-2 ring-fuchsia-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={t('productPage.gallery.imageAlt', {
                        title: product.title,
                        number: idx + 1,
                      })}
                      fill
                      className='object-cover'
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className='space-y-6'
          >
            {/* Brand */}
            {product.brand && typeof product.brand === 'object' && (
              <Link
                href={`/brands/${product.brand._id}`}
                className='inline-flex items-center gap-2 text-fuchsia-600 hover:text-fuchsia-700 font-medium'
              >
                {product.brand.logo && (
                  <Image
                    src={product.brand.logo}
                    alt={product.brand.name}
                    width={24}
                    height={24}
                    className='object-contain'
                  />
                )}
                {product.brand.name}
              </Link>
            )}

            {/* Title */}
            <h1 className='text-3xl font-bold text-gray-900'>
              {product.title}
            </h1>

            {/* Rating */}
            <div className='flex items-center gap-2'>
              <div className='flex items-center'>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(product.averageRating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className='text-gray-600'>
                {product.averageRating?.toFixed(1) || '0.0'}
              </span>
              <span className='text-gray-400'>|</span>
              <span className='text-gray-600'>
                {t('productPage.reviewCount', {
                  count: product.reviewCount || 0,
                })}
              </span>
            </div>

            {/* Price */}
            <div className='flex items-baseline gap-3'>
              <span className='text-4xl font-bold text-gray-900'>
                {formatPrice(unitPrice)}
              </span>
              {discount > 0 && (
                <>
                  <span className='text-xl text-gray-400 line-through'>
                    {formatPrice(product.basePrice)}
                  </span>
                  <span className='text-sm font-semibold text-green-600'>
                    {t('productPage.save', {
                      amount: formatPrice(product.basePrice - product.price),
                    })}
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            <p className='text-gray-700 leading-relaxed'>
              {product.description}
            </p>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className='space-y-3'>
                <h3 className='font-semibold text-gray-900'>
                  {t('productPage.variants.title')}{' '}
                  <span className='font-normal text-gray-500'>
                    {t('productPage.variants.required')}
                  </span>
                </h3>
                <div className='flex flex-wrap gap-2'>
                  {product.variants.map((variant, idx) => {
                    const stock = variant.stock ?? product.stock;
                    const soldOut = stock <= 0;
                    const label =
                      [variant.size, variant.color]
                        .filter(Boolean)
                        .join(' / ') ||
                      t('productPage.variants.optionNumber', {
                        number: idx + 1,
                      });
                    return (
                      <button
                        key={
                          variant.sku ||
                          `${variant.size}-${variant.color}-${idx}`
                        }
                        type='button'
                        onClick={() => handleSelectVariant(variant)}
                        disabled={soldOut}
                        aria-pressed={selectedVariant === variant}
                        className={`px-4 py-2 border rounded-lg text-start transition-all ${
                          selectedVariant === variant
                            ? 'border-fuchsia-600 bg-fuchsia-50 text-fuchsia-700'
                            : 'border-gray-300 hover:border-gray-400'
                        } ${soldOut ? 'cursor-not-allowed opacity-50 line-through' : ''}`}
                      >
                        <span className='block text-sm font-semibold'>
                          {label}
                        </span>
                        <span className='block text-xs text-gray-500'>
                          {formatPrice(variant.price ?? product.price)}
                          {soldOut
                            ? ` · ${t('productPage.stock.outOfStock')}`
                            : stock <= 5
                              ? ` · ${t('productPage.stock.onlyLeft', { count: stock })}`
                              : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {variantRequired ? (
                  <p className='text-sm text-gray-600'>
                    {t('productPage.variants.chooseToContinue')}
                  </p>
                ) : selectedVariant ? (
                  <p className='text-sm text-gray-600'>
                    {t('productPage.variants.selected', {
                      label:
                        formatVariantLabel(selectedVariant, t) ||
                        t('productPage.variants.optionFallback'),
                    })}
                  </p>
                ) : null}
              </div>
            )}

            {/* Quantity */}
            <div className='space-y-3'>
              <h3 className='font-semibold text-gray-900'>
                {t('product.quantity')}
              </h3>
              <div className='flex items-center gap-3'>
                <button
                  type='button'
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  aria-label={t('productPage.quantity.decrease')}
                  className='w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <Minus className='h-4 w-4' />
                </button>
                <span className='w-12 text-center font-semibold'>
                  {quantity}
                </span>
                <button
                  type='button'
                  onClick={() =>
                    setQuantity(
                      maxQty > 0
                        ? Math.min(maxQty, quantity + 1)
                        : quantity + 1,
                    )
                  }
                  disabled={outOfStock || atMax}
                  aria-label={t('productPage.quantity.increase')}
                  className='w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <Plus className='h-4 w-4' />
                </button>
                <span className='text-sm text-gray-600'>
                  {variantRequired
                    ? t('productPage.stock.chooseForAvailability')
                    : outOfStock
                      ? t('productPage.stock.outOfStock')
                      : atMax
                        ? t('productPage.stock.max', { count: maxQty })
                        : availableStock <= 5
                          ? t('productPage.stock.onlyLeft', {
                              count: availableStock,
                            })
                          : t('productPage.stock.inStock', {
                              count: availableStock,
                            })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className='flex gap-4'>
              <Button
                size='lg'
                onClick={() => void handleAddToCart()}
                disabled={!canPurchase}
                title={
                  variantRequired
                    ? t('productPage.variants.chooseFirst')
                    : undefined
                }
                className='flex-1 gap-2'
              >
                <ShoppingCart className='h-5 w-5' />
                {t('product.addToCart')}
              </Button>
              <Button
                size='lg'
                variant='outline'
                onClick={handleBuyNow}
                disabled={!canPurchase}
                title={
                  variantRequired
                    ? t('productPage.variants.chooseFirst')
                    : undefined
                }
                className='flex-1'
              >
                {t('productPage.buyNow')}
              </Button>
              <WishlistButton
                productId={product._id}
                variant='icon'
                tone='onLight'
                className='inline-flex h-11 w-12 items-center justify-center rounded-md border border-stone-200 !p-0 [&>svg]:h-5 [&>svg]:w-5'
              />
              <Button
                size='lg'
                variant='outline'
                className='px-4'
                aria-label={t('productPage.share')}
              >
                <Share2 className='h-5 w-5' aria-hidden />
              </Button>
            </div>

            {/* Trust Badges */}
            <div className='grid grid-cols-3 gap-4 pt-6 border-t'>
              <div className='text-center'>
                <Truck className='h-6 w-6 text-fuchsia-600 mx-auto mb-2' />
                <p className='text-xs text-gray-600'>
                  {t('productPage.trust.freeShipping')}
                </p>
              </div>
              <div className='text-center'>
                <Shield className='h-6 w-6 text-fuchsia-600 mx-auto mb-2' />
                <p className='text-xs text-gray-600'>
                  {t('productPage.trust.securePayment')}
                </p>
              </div>
              <div className='text-center'>
                <RotateCcw className='h-6 w-6 text-fuchsia-600 mx-auto mb-2' />
                <p className='text-xs text-gray-600'>
                  {t('productPage.trust.easyReturns')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <FrequentlyBoughtTogether
          primary={{
            _id: product._id,
            title: product.title,
            price: product.price,
            cover: product.cover,
            category: product.category,
            stock: product.stock,
          }}
        />

        {/* Product Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='bg-white rounded-2xl shadow-sm p-8 mb-8'
        >
          <h2 className='text-2xl font-bold text-gray-900 mb-6'>
            {t('productPage.details.title')}
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {product.material && (
              <div>
                <h3 className='font-semibold text-gray-900 mb-2'>
                  {t('productPage.details.material')}
                </h3>
                <p className='text-gray-700'>{product.material}</p>
              </div>
            )}
            {product.weight != null && product.weight > 0 && (
              <div>
                <h3 className='font-semibold text-gray-900 mb-2'>
                  {t('productPage.details.weight')}
                </h3>
                <p className='text-gray-700'>
                  {t('productPage.details.weightValue', {
                    weight: product.weight,
                  })}
                </p>
              </div>
            )}
            {formatDimensions(product.dimensions, t) && (
              <div>
                <h3 className='font-semibold text-gray-900 mb-2'>
                  {t('productPage.details.dimensions')}
                </h3>
                <p className='text-gray-700'>
                  {formatDimensions(product.dimensions, t)}
                </p>
              </div>
            )}
            {product.sku && (
              <div>
                <h3 className='font-semibold text-gray-900 mb-2'>
                  {t('productPage.details.sku')}
                </h3>
                <p className='text-gray-700'>{product.sku}</p>
              </div>
            )}
            {shippingSummary(product.shippingInfo, t) && (
              <div className='md:col-span-2'>
                <h3 className='font-semibold text-gray-900 mb-2'>
                  {t('productPage.details.shippingInfo')}
                </h3>
                <p className='text-gray-700'>
                  {shippingSummary(product.shippingInfo, t)}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        <ProductQaSection productId={product._id} />

        {/* Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='bg-white rounded-2xl shadow-sm p-8 mb-8'
        >
          <h2 className='text-2xl font-bold text-gray-900 mb-6'>
            {t('productPage.reviews.title')}
          </h2>
          <div className='flex items-center gap-4 mb-6'>
            <div className='text-5xl font-bold text-gray-900'>
              {product.averageRating?.toFixed(1) || '0.0'}
            </div>
            <div>
              <div className='flex items-center mb-1'>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(product.averageRating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className='text-gray-600'>
                {t('productPage.reviewCount', {
                  count: product.reviewCount || 0,
                })}
              </p>
            </div>
          </div>
          <ProductReviewsSection productId={product._id} />
        </motion.div>
      </div>
    </div>
  );
}
