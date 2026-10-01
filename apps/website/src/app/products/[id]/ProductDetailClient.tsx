'use client';

import { useEffect, useState } from 'react';
import { useProductById } from '@/hooks/products/productsQuery';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Share2,
  Truck,
  ShieldCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import Link from 'next/link';
import Image from 'next/image';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useCart, formatVariantLabel } from '@/lib/cartStore';
import { useToast } from '@/components/ui/Toast';
import { FrequentlyBoughtTogether } from '@/components/products/FrequentlyBoughtTogether';
import { ProductQaSection } from '@/components/products/ProductQaSection';
import { ProductReviewsSection } from '@/components/products/ProductReviewsSection';
import { StarRating } from '@/components/page/rating/StarRating';
import { WishlistButton } from '@/components/page/wishlist/WishlistButton';
import { trackRecentlyViewed } from '@/lib/recentlyViewed';
import { useTranslation } from '@/contexts/TranslationContext';
import type { Product, ProductVariant } from '@/types';
import { Skeleton, SkeletonGroup, SkeletonText } from '@/components/ui/Skeleton';

// Small caps label; tracking is dropped in Arabic, where it breaks letter joins.
const EYEBROW = 'text-eyebrow uppercase text-ink-muted rtl:tracking-normal';
// Hairline accordion rows instead of the default rounded/tinted ones.
const ACCORDION_TRIGGER =
  'rounded-none px-0 py-4 font-semibold text-ink hover:bg-transparent [&>svg]:text-ink-muted [&[data-state=open]>svg]:rotate-180';
const ACCORDION_CONTENT = 'px-0 pb-5 font-normal text-ink-muted';

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
  const { toast } = useToast();
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
      <SkeletonGroup
        label={t('productPage.loading')}
        className='mx-auto grid max-w-7xl grid-cols-1 gap-8 py-6 lg:grid-cols-2 lg:gap-12'
      >
        <div aria-hidden>
          <Skeleton className='aspect-square w-full rounded-2xl' />
          <div className='mt-4 grid grid-cols-4 gap-3'>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className='aspect-square rounded-xl' />
            ))}
          </div>
        </div>
        <div aria-hidden className='space-y-5'>
          <Skeleton className='h-3 w-24' />
          <Skeleton className='h-9 w-4/5' />
          <Skeleton className='h-4 w-40' />
          <Skeleton className='h-8 w-32' />
          <SkeletonText lines={4} />
          <div className='flex gap-3 pt-2'>
            <Skeleton className='h-12 flex-1' />
            <Skeleton className='h-12 flex-1' />
          </div>
        </div>
      </SkeletonGroup>
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
    toast(t('product.addedToCart', { title: product.title }), {
      variant: 'success',
    });
    return true;
  };

  const handleBuyNow = () => {
    if (!handleAddToCart()) return;
    window.location.href = '/checkout';
  };

  // Native share sheet where available (mobile), else copy the link.
  const handleShare = async () => {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: product.title, url });
        return;
      } catch (err) {
        // User closed the sheet — not an error worth a toast.
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast(t('orders.toast.copied'), { variant: 'success' });
    } catch {
      toast(t('orders.toast.copyFailed'), { variant: 'error' });
    }
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

  const brand =
    product.brand && typeof product.brand === 'object' ? product.brand : null;
  // What the shopper pays for the chosen quantity, shown live next to the stepper.
  const lineTotal = unitPrice * Math.max(1, quantity);
  const dimensions = formatDimensions(product.dimensions, t);
  const shippingLine = shippingSummary(product.shippingInfo, t);
  const specs = [
    { label: t('productPage.details.material'), value: product.material },
    {
      label: t('productPage.details.weight'),
      value:
        product.weight != null && product.weight > 0
          ? t('productPage.details.weightValue', { weight: product.weight })
          : null,
    },
    { label: t('productPage.details.dimensions'), value: dimensions },
    { label: t('productPage.details.sku'), value: product.sku },
  ].filter((s): s is { label: string; value: string } => Boolean(s.value));

  const stockLabel = variantRequired
    ? t('productPage.stock.chooseForAvailability')
    : outOfStock
      ? t('productPage.stock.outOfStock')
      : atMax
        ? t('productPage.stock.max', { count: maxQty })
        : availableStock <= 5
          ? t('productPage.stock.onlyLeft', { count: availableStock })
          : t('productPage.stock.inStock', { count: availableStock });
  const stockTone = variantRequired
    ? 'bg-ink-subtle'
    : outOfStock
      ? 'bg-rose-500'
      : availableStock <= 5
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  const trustItems = [
    { icon: Truck, label: t('productPage.trust.freeShipping') },
    { icon: ShieldCheck, label: t('productPage.trust.securePayment') },
    { icon: RotateCcw, label: t('productPage.trust.easyReturns') },
  ];

  return (
    <div className='-mx-4 -my-6 bg-surface px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-20 lg:px-20 lg:py-10'>
      <div className='mx-auto max-w-[1320px]'>
        {/* Breadcrumb */}
        <nav aria-label={t('nav.breadcrumb')}>
          <ol className='flex flex-wrap items-center gap-1.5 text-xs text-ink-muted'>
            <li>
              <Link href='/' className='transition-colors hover:text-ink'>
                {t('common.home')}
              </Link>
            </li>
            <li className='flex items-center gap-1.5'>
              <ChevronRight className='h-3 w-3 rtl:-scale-x-100' aria-hidden />
              <Link
                href='/products'
                className='transition-colors hover:text-ink'
              >
                {t('common.products')}
              </Link>
            </li>
            {brand && (
              <li className='flex items-center gap-1.5'>
                <ChevronRight
                  className='h-3 w-3 rtl:-scale-x-100'
                  aria-hidden
                />
                <Link
                  href={`/brands/${brand._id}`}
                  className='transition-colors hover:text-ink'
                >
                  {brand.name}
                </Link>
              </li>
            )}
            <li className='flex min-w-0 items-center gap-1.5'>
              <ChevronRight className='h-3 w-3 rtl:-scale-x-100' aria-hidden />
              <span
                aria-current='page'
                className='max-w-[14rem] truncate text-ink sm:max-w-xs'
              >
                {product.title}
              </span>
            </li>
          </ol>
        </nav>

        <div className='mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16'>
          {/* Gallery — thumbnails run down the side on desktop, under the
              image on phones. */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className='flex min-w-0 flex-col-reverse gap-3 lg:flex-row lg:gap-4 lg:self-start'
          >
            {images.length > 1 && (
              <div className='hide-scrollbar flex gap-2 overflow-x-auto lg:max-h-[640px] lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden'>
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    type='button'
                    onClick={() => setSelectedImage(idx)}
                    aria-current={selectedImage === idx ? 'true' : undefined}
                    className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-control bg-surface-muted transition-[opacity,box-shadow] duration-(--dur-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 lg:w-full ${
                      selectedImage === idx
                        ? 'ring-1 ring-inset ring-ink'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={t('productPage.gallery.imageAlt', {
                        title: product.title,
                        number: idx + 1,
                      })}
                      fill
                      sizes='80px'
                      className='object-cover'
                    />
                  </button>
                ))}
              </div>
            )}

            <div className='relative aspect-square min-w-0 flex-1 overflow-hidden rounded-card bg-surface-muted'>
              <Image
                src={images[selectedImage]}
                alt={product.title}
                fill
                priority
                sizes='(max-width: 1024px) 100vw, 50vw'
                className='object-cover'
              />
              {discount > 0 && (
                <div className='absolute start-4 top-4 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white'>
                  {t('productPage.discountBadge', { percent: discount })}
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    type='button'
                    onClick={prevImage}
                    aria-label={t('productPage.gallery.previous')}
                    className='absolute start-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-soft transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'
                  >
                    <ChevronLeft className='h-5 w-5 rtl:-scale-x-100' />
                  </button>
                  <button
                    type='button'
                    onClick={nextImage}
                    aria-label={t('productPage.gallery.next')}
                    className='absolute end-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-soft transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'
                  >
                    <ChevronRight className='h-5 w-5 rtl:-scale-x-100' />
                  </button>
                  <div
                    aria-hidden
                    className='absolute bottom-3 end-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium tabular-nums text-ink shadow-soft'
                  >
                    {selectedImage + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* Product info — stays in view while the gallery scrolls */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className='min-w-0 lg:sticky lg:top-24 lg:self-start'
          >
            {/* Brand + secondary actions */}
            <div className='flex items-center justify-between gap-3'>
              {brand ? (
                <Link
                  href={`/brands/${brand._id}`}
                  className='group inline-flex min-w-0 items-center gap-3'
                >
                  <BrandLogo
                    src={brand.logo}
                    alt=''
                    width={44}
                    height={44}
                    className='h-full w-full object-contain'
                    frameClassName='h-11 w-11 shrink-0 overflow-hidden rounded-full border border-line bg-surface p-1.5'
                    fallback={
                      <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface-muted text-sm font-semibold text-ink'>
                        {brand.name.charAt(0).toUpperCase()}
                      </span>
                    }
                  />
                  <span className='truncate text-eyebrow uppercase text-ink transition-colors group-hover:text-accent rtl:tracking-normal'>
                    {brand.name}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              <div className='flex shrink-0 items-center gap-2'>
                <WishlistButton
                  productId={product._id}
                  variant='icon'
                  tone='onLight'
                  className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-line !p-0 [&>svg]:h-[1.125rem] [&>svg]:w-[1.125rem]'
                />
                <button
                  type='button'
                  onClick={() => void handleShare()}
                  aria-label={t('productPage.share')}
                  className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-ink-subtle hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'
                >
                  <Share2 className='h-[1.125rem] w-[1.125rem]' aria-hidden />
                </button>
              </div>
            </div>

            <h1 className='mt-5 text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-3xl'>
              {product.title}
            </h1>

            {/* Rating — jumps to the reviews section */}
            <a
              href='#reviews'
              className='mt-3 inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink'
            >
              <StarRating
                rating={product.averageRating || 0}
                size={15}
                showValue={false}
              />
              <span className='font-semibold tabular-nums text-ink'>
                {product.averageRating?.toFixed(1) || '0.0'}
              </span>
              <span className='underline underline-offset-4'>
                {t('productPage.reviewCount', {
                  count: product.reviewCount || 0,
                })}
              </span>
            </a>

            {/* Price */}
            <div className='mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1'>
              <span className='text-3xl font-semibold tabular-nums tracking-tight text-ink'>
                {formatPrice(unitPrice)}
              </span>
              {discount > 0 && (
                <>
                  <span className='text-lg tabular-nums text-ink-subtle line-through'>
                    {formatPrice(product.basePrice)}
                  </span>
                  <span className='rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent'>
                    {t('productPage.save', {
                      amount: formatPrice(product.basePrice - product.price),
                    })}
                  </span>
                </>
              )}
            </div>

            <div className='mt-6 space-y-6 border-t border-line pt-6'>
              {/* Variants */}
              {product.variants && product.variants.length > 0 && (
                <div>
                  <div className='flex items-baseline justify-between gap-3'>
                    <span className={EYEBROW}>
                      {t('productPage.variants.title')}{' '}
                      <span className='font-normal normal-case tracking-normal text-ink-subtle'>
                        {t('productPage.variants.required')}
                      </span>
                    </span>
                    {selectedVariant && (
                      <span className='truncate text-xs text-ink-muted'>
                        {t('productPage.variants.selected', {
                          label:
                            formatVariantLabel(selectedVariant, t) ||
                            t('productPage.variants.optionFallback'),
                        })}
                      </span>
                    )}
                  </div>
                  <RadioGroup
                    aria-label={t('productPage.variants.title')}
                    className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3'
                    value={
                      selectedVariant
                        ? String(product.variants.indexOf(selectedVariant))
                        : ''
                    }
                    onValueChange={(value) => {
                      const variant = product.variants?.[Number(value)];
                      if (variant) handleSelectVariant(variant);
                    }}
                  >
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
                        <label
                          key={
                            variant.sku ||
                            `${variant.size}-${variant.color}-${idx}`
                          }
                          className={`flex items-start gap-2.5 rounded-control border border-line p-3 transition-colors duration-(--dur-fast) has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:bg-surface-sunken ${
                            soldOut
                              ? 'cursor-not-allowed opacity-50'
                              : 'cursor-pointer hover:border-ink-subtle'
                          }`}
                        >
                          <RadioGroupItem
                            value={String(idx)}
                            disabled={soldOut}
                            className='mt-0.5'
                          />
                          <span className='min-w-0'>
                            <span
                              className={`flex items-center gap-1.5 text-sm font-semibold text-ink ${soldOut ? 'line-through' : ''}`}
                            >
                              {variant.colorCode && (
                                <span
                                  aria-hidden
                                  className='h-3 w-3 shrink-0 rounded-full border border-line'
                                  style={{ backgroundColor: variant.colorCode }}
                                />
                              )}
                              <span className='truncate'>{label}</span>
                            </span>
                            <span className='mt-0.5 block text-xs tabular-nums text-ink-muted'>
                              {formatPrice(variant.price ?? product.price)}
                              {soldOut
                                ? ` · ${t('productPage.stock.outOfStock')}`
                                : stock <= 5
                                  ? ` · ${t('productPage.stock.onlyLeft', { count: stock })}`
                                  : ''}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                  {variantRequired && (
                    <p className='mt-2 text-xs text-ink-muted'>
                      {t('productPage.variants.chooseToContinue')}
                    </p>
                  )}
                </div>
              )}

              {/* Quantity + the price for that quantity */}
              <div>
                <div className='flex items-center justify-between gap-3'>
                  <span className={EYEBROW}>{t('product.quantity')}</span>
                  <span className='inline-flex items-center gap-2 text-xs text-ink-muted'>
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full ${stockTone}`}
                    />
                    {stockLabel}
                  </span>
                </div>
                <div className='mt-3 flex items-stretch gap-3'>
                  <div className='inline-flex h-14 shrink-0 items-center rounded-control border border-line'>
                    <button
                      type='button'
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      aria-label={t('productPage.quantity.decrease')}
                      className='flex h-full w-11 items-center justify-center rounded-s-control text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-transparent'
                    >
                      <Minus className='h-4 w-4' />
                    </button>
                    <span
                      aria-live='polite'
                      className='w-10 text-center text-sm font-semibold tabular-nums text-ink'
                    >
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
                      className='flex h-full w-11 items-center justify-center rounded-e-control text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-transparent'
                    >
                      <Plus className='h-4 w-4' />
                    </button>
                  </div>
                  <div className='flex h-14 min-w-0 flex-1 items-center justify-between gap-3 rounded-control bg-surface-muted px-4'>
                    <span className='min-w-0 text-xs text-ink-muted'>
                      <span className='block truncate'>
                        {t('productPage.totalForQty', { count: quantity })}
                      </span>
                      {quantity > 1 && (
                        <span className='block truncate tabular-nums text-ink-subtle'>
                          {t('productPage.each', {
                            price: formatPrice(unitPrice),
                          })}
                        </span>
                      )}
                    </span>
                    <span className='shrink-0 text-lg font-semibold tabular-nums text-ink'>
                      {formatPrice(lineTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className='flex flex-col gap-3'>
                <Button
                  variant='solid'
                  size='lg'
                  onClick={() => void handleAddToCart()}
                  disabled={!canPurchase}
                  title={
                    variantRequired
                      ? t('productPage.variants.chooseFirst')
                      : undefined
                  }
                  className='w-full min-w-0 px-4'
                >
                  <ShoppingBag className='h-5 w-5 shrink-0' aria-hidden />
                  <span className='truncate'>{t('product.addToCart')}</span>
                  {canPurchase && (
                    <span className='ms-1 shrink-0 border-s border-white/30 ps-3 tabular-nums'>
                      {formatPrice(lineTotal)}
                    </span>
                  )}
                </Button>
                <Button
                  variant='line'
                  onClick={handleBuyNow}
                  disabled={!canPurchase}
                  title={
                    variantRequired
                      ? t('productPage.variants.chooseFirst')
                      : undefined
                  }
                  className='w-full min-w-0 px-4'
                >
                  <span className='truncate'>{t('productPage.buyNow')}</span>
                </Button>
              </div>

              {/* Trust */}
              <ul className='grid grid-cols-3 divide-x divide-line rounded-card border border-line rtl:divide-x-reverse'>
                {trustItems.map(({ icon: Icon, label }) => (
                  <li key={label} className='px-2 py-4 text-center'>
                    <Icon
                      className='mx-auto h-5 w-5 text-ink'
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <p className='mt-2 text-xs text-ink-muted'>{label}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Description / details / delivery */}
            <Accordion
              type='multiple'
              defaultValue={['description']}
              className='mt-6 border-t border-line'
            >
              {product.description && (
                <AccordionItem
                  value='description'
                  className='border-b border-line'
                >
                  <AccordionTrigger className={ACCORDION_TRIGGER}>
                    {t('productPage.description')}
                  </AccordionTrigger>
                  <AccordionContent className={ACCORDION_CONTENT}>
                    <p className='whitespace-pre-line leading-relaxed'>
                      {product.description}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              )}
              {specs.length > 0 && (
                <AccordionItem value='details' className='border-b border-line'>
                  <AccordionTrigger className={ACCORDION_TRIGGER}>
                    {t('productPage.details.title')}
                  </AccordionTrigger>
                  <AccordionContent className={ACCORDION_CONTENT}>
                    <dl className='divide-y divide-line'>
                      {specs.map((spec) => (
                        <div
                          key={spec.label}
                          className='flex items-baseline justify-between gap-4 py-2.5'
                        >
                          <dt className='text-ink-muted'>{spec.label}</dt>
                          <dd className='text-end font-medium text-ink'>
                            {spec.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </AccordionContent>
                </AccordionItem>
              )}
              <AccordionItem value='delivery' className='border-b border-line'>
                <AccordionTrigger className={ACCORDION_TRIGGER}>
                  {t('productPage.deliveryReturns')}
                </AccordionTrigger>
                <AccordionContent className={ACCORDION_CONTENT}>
                  <ul className='space-y-2.5'>
                    {trustItems.map(({ icon: Icon, label }) => (
                      <li key={label} className='flex items-center gap-2.5'>
                        <Icon
                          className='h-4 w-4 shrink-0 text-ink'
                          strokeWidth={1.5}
                          aria-hidden
                        />
                        {label}
                      </li>
                    ))}
                  </ul>
                  {shippingLine && (
                    <p className='mt-3 border-t border-line pt-3'>
                      <span className='font-medium text-ink'>
                        {t('productPage.details.shippingInfo')}:
                      </span>{' '}
                      {shippingLine}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        </div>

        <div className='mt-16 empty:hidden'>
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
        </div>

        <div
          id='reviews'
          className='mt-16 scroll-mt-24 border-t border-line pt-12'
        >
          <ProductReviewsSection
            productId={product._id}
            averageRating={product.averageRating || 0}
            reviewCount={product.reviewCount || 0}
          />
        </div>

        <div className='mt-16 border-t border-line pt-12'>
          <ProductQaSection productId={product._id} />
        </div>
      </div>
    </div>
  );
}
