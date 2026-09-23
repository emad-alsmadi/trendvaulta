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
import { useCartQuoteSync } from '@/hooks/cart/cartQuoteQuery';
import { normalizeRemoteImageSrc, remoteCoverLoader } from '@/lib/utils';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { TrustServiceStrip } from '@/components/home/TrustServiceStrip';
import { DEMO_TRUST_ITEMS } from '@/data/demoStorefront';
import { useState } from 'react';

export default function CartPage() {
  const router = useRouter();
  const { state, subtotal, setCartQty, removeFromCart, clearCart } = useCart();
  const confirm = useConfirm();
  const items = state.items;
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Server revalidation: live stock/price + totals. Falls back to client
  // subtotal while loading or when the quote endpoint is unavailable.
  const { quote, notices } = useCartQuoteSync({ items, shippingMethod: 'none' });
  const itemsPrice = quote?.itemsPrice ?? subtotal;
  const discountAmount = quote?.discountAmount ?? 0;
  const shippingPrice = quote?.shippingPrice ?? 0;
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

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
              <ShoppingCart className='h-4 w-4 text-fuchsia-700' />
              Cart
            </div>
            <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
              Your cart
            </h1>
            <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
              Review items before checkout.
            </p>
          </div>

          <div className='flex w-full flex-col gap-2 sm:w-auto sm:items-end'>
            <Button
              size='sm'
              className='w-full rounded-full border border-white/35 bg-white/45 text-indigo-950 shadow-sm backdrop-blur-xl transition hover:bg-white/65 sm:w-auto'
              onClick={() => router.push('/')}
            >
              <span className='inline-flex items-center gap-2'>
                <ArrowLeft className='h-4 w-4 rtl:-scale-x-100' />
                Continue shopping
              </span>
            </Button>
            {items.length > 0 && (
              <Button
                size='sm'
                className='w-full rounded-full bg-gradient-to-r from-rose-600 via-fuchsia-600 to-amber-500 text-white shadow-md transition hover:brightness-110 active:brightness-95 sm:w-auto'
                onClick={() =>
                  void confirm({
                    variant: 'warning',
                    title: 'Clear your cart?',
                    description:
                      'All items will be removed. You can add products again anytime.',
                    confirmLabel: 'Clear cart',
                    cancelLabel: 'Keep shopping',
                    onConfirm: async () => {
                      clearCart();
                    },
                  })
                }
              >
                Clear cart
              </Button>
            )}
          </div>
        </div>
      </div>

      {removedNotices.length > 0 && (
        <div
          role='status'
          className='rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900'
        >
          <ul className='space-y-1'>
            {removedNotices.map(([key, n]) => (
              <li key={key}>
                {n.title}: {n.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <div className='space-y-6'>
          <div className='rounded-3xl border border-white/40 bg-white/50 p-8 text-center shadow-sm backdrop-blur-xl'>
            <div className='mx-auto inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-sm'>
              <ShoppingCart className='h-6 w-6' />
            </div>
            <div className='mt-4 text-lg font-extrabold text-indigo-950'>
              Your cart is empty
            </div>
            <div className='mt-2 text-sm font-semibold text-indigo-950/75'>
              Browse beauty, fashion, and lifestyle picks — then add what you
              love.
            </div>
            <div className='mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row'>
              <Link
                href='/products'
                className='inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:brightness-110'
              >
                Browse catalog
              </Link>
              <Link
                href='/offers'
                className='inline-flex items-center justify-center rounded-full border border-white/35 bg-white/45 px-5 py-3 text-sm font-extrabold text-indigo-950 shadow-sm backdrop-blur-xl transition hover:bg-white/65'
              >
                See today&apos;s deals
              </Link>
            </div>
          </div>
          {/* DEMO trust cues — swap via TrustServiceStrip API later */}
          <TrustServiceStrip items={DEMO_TRUST_ITEMS} />
        </div>
      ) : (
        <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
          <motion.div
            variants={gridVariants}
            initial='hidden'
            animate='show'
            className='space-y-3'
          >
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const lineKey = getCartLineKey(item);
                const variantLabel = formatVariantLabel(item.variant);
                const atMax =
                  typeof item.maxQty === 'number' && item.qty >= item.maxQty;
                const notice = notices[lineKey];
                return (
                <motion.div
                  key={lineKey}
                  variants={itemVariants}
                  initial='hidden'
                  animate='show'
                  exit='exit'
                  className='rounded-3xl border border-white/30 bg-white/35 p-4 shadow-sm backdrop-blur-xl sm:p-5'
                >
                  <div className='flex flex-col gap-4 sm:flex-row'>
                    <div className='relative h-28 w-24 overflow-hidden rounded-2xl border border-white/30 bg-white/20 sm:h-24 sm:w-20'>
                      {imageErrors.has(item.productId) ? (
                        <div className='flex h-full w-full items-center justify-center bg-gray-100'>
                          <Package className='h-8 w-8 text-gray-400' />
                        </div>
                      ) : (
                        <Image
                          loader={remoteCoverLoader}
                          src={normalizeRemoteImageSrc(item.cover)}
                          alt={item.title}
                          fill
                          className='object-cover'
                          sizes='(max-width: 640px) 96px, 80px'
                          onError={() => handleImageError(item.productId)}
                        />
                      )}
                    </div>

                    <div className='min-w-0 flex-1'>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <div className='truncate text-base font-extrabold text-indigo-950'>
                            {item.title}
                          </div>
                          {variantLabel && (
                            <div className='mt-0.5 truncate text-xs font-semibold text-indigo-950/60'>
                              {variantLabel}
                            </div>
                          )}
                          <div className='mt-1 text-sm font-semibold text-indigo-950/75'>
                            ${item.price.toFixed(2)}
                          </div>
                          {notice && (
                            <div
                              role='status'
                              className='mt-1 text-xs font-semibold text-amber-700'
                            >
                              {notice.message}
                            </div>
                          )}
                        </div>

                        <Button
                          type='button'
                          size='icon'
                          className='h-10 w-10 rounded-2xl border border-white/35 bg-white/45 text-rose-700 shadow-sm backdrop-blur-xl transition hover:bg-white/70'
                          onClick={() =>
                            void confirm({
                              variant: 'danger',
                              title: 'Remove this product?',
                              description: `"${item.title}" will be removed from your cart.`,
                              confirmLabel: 'Remove',
                              cancelLabel: 'Keep it',
                              onConfirm: async () => {
                                removeFromCart(lineKey);
                              },
                            })
                          }
                          aria-label='Remove'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>

                      <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='inline-flex w-full items-center justify-between gap-2 rounded-full border border-white/30 bg-white/40 p-1 backdrop-blur-xl sm:w-auto sm:justify-start'>
                          <Button
                            type='button'
                            size='icon'
                            className='h-9 w-9 rounded-full bg-white/60 text-indigo-950 transition hover:bg-white'
                            onClick={() => setCartQty(lineKey, item.qty - 1)}
                            disabled={item.qty <= 1}
                            aria-label='Decrease'
                          >
                            <Minus className='h-4 w-4' />
                          </Button>
                          <div className='min-w-[36px] text-center text-sm font-extrabold text-indigo-950'>
                            {item.qty}
                          </div>
                          <Button
                            type='button'
                            size='icon'
                            className='h-9 w-9 rounded-full bg-white/60 text-indigo-950 transition hover:bg-white'
                            onClick={() => setCartQty(lineKey, item.qty + 1)}
                            disabled={atMax}
                            aria-label='Increase'
                          >
                            <Plus className='h-4 w-4' />
                          </Button>
                          {atMax && (
                            <span className='px-2 text-xs font-semibold text-indigo-950/60'>
                              Max {item.maxQty}
                            </span>
                          )}
                        </div>

                        <div className='text-end text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-700 via-indigo-700 to-cyan-700 sm:text-start'>
                          ${(item.price * item.qty).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          <div className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl lg:sticky lg:top-6 lg:self-start'>
            <div className='text-sm font-extrabold text-indigo-950'>
              Summary
            </div>
            <div className='mt-4 space-y-3'>
              <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/80'>
                <span>Subtotal</span>
                <span>${itemsPrice.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className='flex items-center justify-between text-sm font-semibold text-green-700'>
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/70'>
                <span>Shipping</span>
                <span>${shippingPrice.toFixed(2)}</span>
              </div>
              <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/70'>
                <span>Tax</span>
                <span>${taxPrice.toFixed(2)}</span>
              </div>
              <div className='h-px bg-indigo-900/10' />
              <div className='flex items-center justify-between text-base font-extrabold text-indigo-950'>
                <span>Total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className='mt-6 grid gap-3'>
              <Button
                className='w-full rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-md transition hover:brightness-110 active:brightness-95'
                size='lg'
                onClick={() => router.push('/checkout')}
              >
                Checkout
              </Button>

              <Link
                href='/products'
                className='inline-flex items-center justify-center rounded-full border border-white/35 bg-white/45 px-5 py-3 text-sm font-extrabold text-indigo-950 shadow-sm backdrop-blur-xl transition hover:bg-white/65'
              >
                Browse more
              </Link>
            </div>

            {/* Trust near payment CTA — pattern only; no Stripe/payment changes */}
            <ul className='mt-5 space-y-2 text-xs font-semibold text-indigo-950/70'>
              <li className='flex items-center gap-2'>
                <ShieldCheck className='h-3.5 w-3.5 shrink-0 text-fuchsia-700' aria-hidden />
                Secure checkout
              </li>
              <li className='flex items-center gap-2'>
                <Truck className='h-3.5 w-3.5 shrink-0 text-fuchsia-700' aria-hidden />
                Tracked shipping on every order
              </li>
              <li className='flex items-center gap-2'>
                <RefreshCw className='h-3.5 w-3.5 shrink-0 text-fuchsia-700' aria-hidden />
                Easy returns within policy
              </li>
            </ul>

            <div className='mt-4 text-xs font-semibold text-indigo-950/60'>
              Coupons apply at checkout. Payment is processed securely when
              Stripe is configured.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
