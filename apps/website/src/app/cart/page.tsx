'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/lib/cartStore';
import { normalizeRemoteImageSrc, remoteCoverLoader } from '@/lib/utils';
import { useConfirm } from '@/components/confirm/ConfirmProvider';

export default function CartPage() {
  const router = useRouter();
  const { state, subtotal, setCartQty, removeFromCart, clearCart } = useCart();
  const confirm = useConfirm();
  const items = state.items;

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
                <ArrowLeft className='h-4 w-4' />
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
                      'All items will be removed. You can add templates again anytime.',
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

      {items.length === 0 ? (
        <div className='rounded-3xl border border-white/40 bg-white/50 p-8 text-center shadow-sm backdrop-blur-xl'>
          <div className='mx-auto inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-sm'>
            <ShoppingCart className='h-6 w-6' />
          </div>
          <div className='mt-4 text-lg font-extrabold text-indigo-950'>
            Your cart is empty
          </div>
          <div className='mt-2 text-sm font-semibold text-indigo-950/75'>
            Browse templates and add something you like.
          </div>
          <div className='mt-6 flex justify-center'>
            <Link
              href='/'
              className='inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:brightness-110'
            >
              Browse templates
            </Link>
          </div>
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
              {items.map((item) => (
                <motion.div
                  key={item.templateId}
                  variants={itemVariants}
                  initial='hidden'
                  animate='show'
                  exit='exit'
                  className='rounded-3xl border border-white/30 bg-white/35 p-4 shadow-sm backdrop-blur-xl sm:p-5'
                >
                  <div className='flex flex-col gap-4 sm:flex-row'>
                    <div className='relative h-28 w-24 overflow-hidden rounded-2xl border border-white/30 bg-white/20 sm:h-24 sm:w-20'>
                      <Image
                        loader={remoteCoverLoader}
                        src={normalizeRemoteImageSrc(item.cover)}
                        alt={item.title}
                        fill
                        className='object-cover'
                        sizes='(max-width: 640px) 96px, 80px'
                      />
                    </div>

                    <div className='min-w-0 flex-1'>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <div className='truncate text-base font-extrabold text-indigo-950'>
                            {item.title}
                          </div>
                          <div className='mt-1 text-sm font-semibold text-indigo-950/75'>
                            ${item.price.toFixed(2)}
                          </div>
                        </div>

                        <Button
                          type='button'
                          size='icon'
                          className='h-10 w-10 rounded-2xl border border-white/35 bg-white/45 text-rose-700 shadow-sm backdrop-blur-xl transition hover:bg-white/70'
                          onClick={() =>
                            void confirm({
                              variant: 'danger',
                              title: 'Remove this template?',
                              description: `"${item.title}" will be removed from your cart.`,
                              confirmLabel: 'Remove',
                              cancelLabel: 'Keep it',
                              onConfirm: async () => {
                                removeFromCart(item.templateId);
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
                            onClick={() =>
                              setCartQty(item.templateId, item.qty - 1)
                            }
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
                            onClick={() =>
                              setCartQty(item.templateId, item.qty + 1)
                            }
                            aria-label='Increase'
                          >
                            <Plus className='h-4 w-4' />
                          </Button>
                        </div>

                        <div className='text-right text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-700 via-indigo-700 to-cyan-700 sm:text-left'>
                          ${(item.price * item.qty).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <div className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl lg:sticky lg:top-6 lg:self-start'>
            <div className='text-sm font-extrabold text-indigo-950'>
              Summary
            </div>
            <div className='mt-4 space-y-3'>
              <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/80'>
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/70'>
                <span>Shipping</span>
                <span>$0.00</span>
              </div>
              <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/70'>
                <span>Tax</span>
                <span>$0.00</span>
              </div>
              <div className='h-px bg-indigo-900/10' />
              <div className='flex items-center justify-between text-base font-extrabold text-indigo-950'>
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
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
                href='/'
                className='inline-flex items-center justify-center rounded-full border border-white/35 bg-white/45 px-5 py-3 text-sm font-extrabold text-indigo-950 shadow-sm backdrop-blur-xl transition hover:bg-white/65'
              >
                Browse more
              </Link>
            </div>

            <div className='mt-5 text-xs font-semibold text-indigo-950/60'>
              Checkout uses Stripe when configured on the API; otherwise orders
              are created locally for development.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
