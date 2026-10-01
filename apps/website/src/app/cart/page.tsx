'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ArrowLeft,
  Package,
  ShieldCheck,
  Truck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCart, getCartLineKey, formatVariantLabel } from '@/lib/cartStore';
import {
  cartNoticeMessage,
  useCartQuoteSync,
} from '@/hooks/cart/cartQuoteQuery';
import { normalizeRemoteImageSrc, remoteCoverLoader } from '@/lib/utils';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { TrustServiceStrip } from '@/components/home/TrustServiceStrip';
import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function CartPage() {
  const router = useRouter();
  const { state, subtotal, setCartQty, removeFromCart, clearCart } = useCart();
  const confirm = useConfirm();
  const { t, formatPrice } = useTranslation();
  const items = state.items;
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Server revalidation: live stock/price + totals. Falls back to client
  // subtotal while loading or when the quote endpoint is unavailable.
  const { quote, notices } = useCartQuoteSync({ items, shippingMethod: 'none' });
  const itemsPrice = quote?.itemsPrice ?? subtotal;
  const discountAmount = quote?.discountAmount ?? 0;
  const taxPrice = quote?.taxPrice ?? 0;
  const totalPrice = quote?.totalPrice ?? subtotal;
  const presentKeys = new Set(items.map(getCartLineKey));
  const removedNotices = Object.entries(notices).filter(
    ([key]) => !presentKeys.has(key),
  );

  const handleImageError = (productId: string) => {
    setImageErrors((prev) => new Set(prev).add(productId));
  };

  const gridVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.04,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className='mx-auto max-w-[1200px] space-y-8'>
      <header className='flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <Link
            href='/'
            className='inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink'
          >
            <ArrowLeft className='h-3.5 w-3.5 rtl:-scale-x-100' aria-hidden />
            {t('cartPage.continueShopping')}
          </Link>
          <h1 className='mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-title'>
            {t('cartPage.title')}
          </h1>
          <p className='mt-1.5 text-sm tabular-nums text-ink-muted'>
            {items.length > 0
              ? t('cartPage.itemCount', { count: totalQty })
              : t('cartPage.subtitle')}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type='button'
            className='self-start text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-rose-700 sm:self-auto'
            onClick={() =>
              void confirm({
                variant: 'warning',
                title: t('cartPage.clearConfirmTitle'),
                description: t('cartPage.clearConfirmDescription'),
                confirmLabel: t('cartPage.clearCart'),
                cancelLabel: t('cartPage.keepShopping'),
                onConfirm: async () => {
                  clearCart();
                },
              })
            }
          >
            {t('cartPage.clearCart')}
          </button>
        )}
      </header>

      {removedNotices.length > 0 && (
        <div
          role='status'
          className='rounded-control border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'
        >
          <ul className='space-y-1'>
            {removedNotices.map(([key, n]) => (
              <li key={key}>
                {n.title}: {cartNoticeMessage(n, t)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <div className='space-y-8'>
          <div className='rounded-card border border-line bg-surface px-6 py-16 text-center'>
            <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-ink'>
              <ShoppingCart className='h-6 w-6' strokeWidth={1.5} aria-hidden />
            </div>
            <h2 className='mt-5 text-heading text-ink'>
              {t('cartPage.emptyTitle')}
            </h2>
            <p className='mx-auto mt-2 max-w-md text-sm text-ink-muted'>
              {t('cartPage.emptyDescription')}
            </p>
            <div className='mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row'>
              <Link
                href='/products'
                className='inline-flex h-12 items-center justify-center rounded-control bg-ink px-6 text-sm font-bold text-white shadow-soft transition-colors hover:bg-stone-800'
              >
                {t('cartPage.browseCatalog')}
              </Link>
              <Link
                href='/offers'
                className='inline-flex h-12 items-center justify-center rounded-control border border-ink px-6 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-white'
              >
                {t('cartPage.todaysDeals')}
              </Link>
            </div>
          </div>
          {/* Live trust cues (GET /api/storefront/trust); hidden if unavailable */}
          <TrustServiceStrip />
        </div>
      ) : (
        <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]'>
          <motion.ul
            variants={gridVariants}
            initial='hidden'
            animate='show'
            className='divide-y divide-line self-start rounded-card border border-line bg-surface'
          >
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const lineKey = getCartLineKey(item);
                const variantLabel = formatVariantLabel(item.variant, t);
                const atMax =
                  typeof item.maxQty === 'number' && item.qty >= item.maxQty;
                const notice = notices[lineKey];
                return (
                  <motion.li
                    key={lineKey}
                    variants={itemVariants}
                    initial='hidden'
                    animate='show'
                    exit='exit'
                    className='flex gap-4 p-4 sm:gap-6 sm:p-6'
                  >
                    <Link
                      href={`/products/${item.productId}`}
                      className='relative h-28 w-24 shrink-0 overflow-hidden rounded-control bg-surface-muted sm:h-32 sm:w-28'
                    >
                      {imageErrors.has(item.productId) ? (
                        <span className='flex h-full w-full items-center justify-center'>
                          <Package
                            className='h-8 w-8 text-ink-subtle'
                            aria-hidden
                          />
                        </span>
                      ) : (
                        <Image
                          loader={remoteCoverLoader}
                          src={normalizeRemoteImageSrc(item.cover)}
                          alt={item.title}
                          fill
                          className='object-cover'
                          sizes='(max-width: 640px) 96px, 112px'
                          onError={() => handleImageError(item.productId)}
                        />
                      )}
                    </Link>

                    <div className='flex min-w-0 flex-1 flex-col'>
                      <div className='flex items-start justify-between gap-4'>
                        <div className='min-w-0'>
                          <Link
                            href={`/products/${item.productId}`}
                            className='line-clamp-2 text-sm font-semibold text-ink transition-colors hover:text-accent sm:text-base'
                          >
                            {item.title}
                          </Link>
                          {variantLabel && (
                            <div className='mt-1 truncate text-xs text-ink-muted'>
                              {variantLabel}
                            </div>
                          )}
                          <div className='mt-1 text-xs tabular-nums text-ink-muted'>
                            {t('productPage.each', {
                              price: formatPrice(item.price),
                            })}
                          </div>
                          {notice && (
                            <div
                              role='status'
                              className='mt-1.5 text-xs font-medium text-amber-700'
                            >
                              {cartNoticeMessage(notice, t)}
                              {notice.code === 'variant_required' && (
                                <>
                                  {' '}
                                  <Link
                                    href={`/products/${item.productId}`}
                                    className='underline underline-offset-2 hover:text-amber-900'
                                  >
                                    {t('productCard.chooseOptions')}
                                  </Link>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className='shrink-0 text-end text-base font-semibold tabular-nums text-ink'>
                          {formatPrice(item.price * item.qty)}
                        </div>
                      </div>

                      <div className='mt-auto flex flex-wrap items-center justify-between gap-3 pt-4'>
                        <div className='flex items-center gap-3'>
                          <div className='inline-flex h-10 items-center rounded-control border border-line'>
                            <button
                              type='button'
                              className='flex h-full w-10 items-center justify-center rounded-s-control text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-transparent'
                              onClick={() => setCartQty(lineKey, item.qty - 1)}
                              disabled={item.qty <= 1}
                              aria-label={t('cartPage.decreaseQty')}
                            >
                              <Minus className='h-3.5 w-3.5' />
                            </button>
                            <span className='w-9 text-center text-sm font-semibold tabular-nums text-ink'>
                              {item.qty}
                            </span>
                            <button
                              type='button'
                              className='flex h-full w-10 items-center justify-center rounded-e-control text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-transparent'
                              onClick={() => setCartQty(lineKey, item.qty + 1)}
                              disabled={atMax}
                              aria-label={t('cartPage.increaseQty')}
                            >
                              <Plus className='h-3.5 w-3.5' />
                            </button>
                          </div>
                          {atMax && (
                            <span className='text-xs text-ink-muted'>
                              {t('cartPage.maxQty', { max: item.maxQty ?? '' })}
                            </span>
                          )}
                        </div>

                        <button
                          type='button'
                          className='inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-rose-700'
                          onClick={() =>
                            void confirm({
                              variant: 'danger',
                              title: t('cartPage.removeConfirmTitle'),
                              description: t(
                                'cartPage.removeConfirmDescription',
                                { title: item.title },
                              ),
                              confirmLabel: t('cartPage.remove'),
                              cancelLabel: t('cartPage.keepIt'),
                              onConfirm: async () => {
                                removeFromCart(lineKey);
                              },
                            })
                          }
                        >
                          <Trash2 className='h-3.5 w-3.5' aria-hidden />
                          {t('cartPage.remove')}
                        </button>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>

          <aside className='rounded-card border border-line bg-surface p-6 shadow-soft lg:sticky lg:top-24 lg:self-start'>
            <h2 className='text-heading text-ink'>{t('cartPage.summary')}</h2>
            <dl className='mt-5 space-y-3 text-sm'>
              <div className='flex items-center justify-between text-ink-muted'>
                <dt>{t('checkout.subtotal')}</dt>
                <dd className='tabular-nums text-ink'>
                  {formatPrice(itemsPrice)}
                </dd>
              </div>
              {discountAmount > 0 && (
                <div className='flex items-center justify-between text-emerald-700'>
                  <dt>{t('cartPage.discount')}</dt>
                  <dd className='tabular-nums'>
                    -{formatPrice(discountAmount)}
                  </dd>
                </div>
              )}
              <div className='flex items-center justify-between text-ink-muted'>
                <dt>{t('checkout.shipping')}</dt>
                {/* Quoted as pickup here; the method is chosen at checkout. */}
                <dd>{t('cartPage.shippingAtCheckout')}</dd>
              </div>
              <div className='flex items-center justify-between text-ink-muted'>
                <dt>{t('checkout.tax')}</dt>
                <dd className='tabular-nums text-ink'>
                  {formatPrice(taxPrice)}
                </dd>
              </div>
              <div className='flex items-baseline justify-between border-t border-line pt-4 text-ink'>
                <dt className='text-base font-semibold'>
                  {t('checkout.total')}
                </dt>
                <dd className='text-2xl font-semibold tabular-nums tracking-tight'>
                  {formatPrice(totalPrice)}
                </dd>
              </div>
            </dl>

            <div className='mt-6 grid gap-3'>
              <Button
                variant='solid'
                size='lg'
                className='w-full'
                onClick={() => router.push('/checkout')}
              >
                {t('common.checkout')}
              </Button>

              <Link
                href='/products'
                className='inline-flex h-12 items-center justify-center rounded-control border border-line text-sm font-bold text-ink transition-colors hover:border-ink'
              >
                {t('cartPage.browseMore')}
              </Link>
            </div>

            {/* Trust near payment CTA — pattern only; no Stripe/payment changes */}
            <ul className='mt-6 space-y-2.5 border-t border-line pt-5 text-xs text-ink-muted'>
              <li className='flex items-center gap-2.5'>
                <ShieldCheck className='h-4 w-4 shrink-0 text-ink' strokeWidth={1.5} aria-hidden />
                {t('cartPage.trustSecureCheckout')}
              </li>
              <li className='flex items-center gap-2.5'>
                <Truck className='h-4 w-4 shrink-0 text-ink' strokeWidth={1.5} aria-hidden />
                {t('cartPage.trustTrackedShipping')}
              </li>
              <li className='flex items-center gap-2.5'>
                <RefreshCw className='h-4 w-4 shrink-0 text-ink' strokeWidth={1.5} aria-hidden />
                {t('cartPage.trustEasyReturns')}
              </li>
            </ul>

            <p className='mt-4 text-xs leading-relaxed text-ink-subtle'>
              {t('cartPage.checkoutNote')}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
