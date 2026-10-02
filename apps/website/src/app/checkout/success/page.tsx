'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Loader2,
  Mail,
  MapPin,
  Package,
  Store,
  Truck,
} from 'lucide-react';
import { useGuestOrder, useOrderById } from '@/hooks/orders/ordersQuery';
import { guestOrderHref, readGuestToken } from '@/lib/guestOrder';
import { clearCart, formatVariantLabel } from '@/lib/cartStore';
import { paymentsApi } from '@/lib/api';
import { normalizeRemoteImageSrc, remoteCoverLoader } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

const PRIMARY_LINK =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white transition-colors duration-(--dur-fast) hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2';
const QUIET_LINK =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-surface-muted px-6 text-sm font-semibold text-ink transition-colors duration-(--dur-fast) hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2';

/** Centred message for the states without an order to show. */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className='mx-auto max-w-xl rounded-panel bg-surface-muted px-6 py-12 text-center text-sm text-ink'>
      {children}
    </div>
  );
}

function CheckoutSuccessInner() {
  const { t, formatPrice, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const sp = useSearchParams();
  const orderId = sp.get('order_id');
  const sessionId = sp.get('session_id');

  // A guest came back from Stripe with the token saved at checkout (P0-03)
  const [guestToken] = useState(() => readGuestToken(orderId));
  const accountQ = useOrderById(guestToken ? undefined : (orderId ?? undefined));
  const guestQ = useGuestOrder(guestToken ? orderId : null, guestToken);
  const q = guestToken ? guestQ : accountQ;
  const order = q.data;
  const orderHref =
    orderId && guestToken ? guestOrderHref(orderId, guestToken) : `/user/orders/${orderId}`;

  // Clear cart when order is confirmed paid
  useEffect(() => {
    if (!orderId || order?.paymentStatus !== 'paid') return;
    clearCart();
  }, [orderId, order?.paymentStatus]);

  // Polling for payment confirmation — uses refs to avoid stale closures
  // and prevent effect re-runs on status changes.
  const paymentStatusRef = useRef(order?.paymentStatus);
  const orderStatusRef = useRef(order?.status);
  const refetchRef = useRef(q.refetch);

  // Update refs in a layout effect to avoid the lint warning about setting refs during render
  useEffect(() => {
    paymentStatusRef.current = order?.paymentStatus;
    orderStatusRef.current = order?.status;
    refetchRef.current = q.refetch;
  });

  useEffect(() => {
    if (!orderId) return;

    const isSettled = () =>
      paymentStatusRef.current === 'paid' ||
      paymentStatusRef.current === 'failed' ||
      orderStatusRef.current === 'canceled';

    // Backoff: 2s, 3s, 5s, then 8s — up to ~3 minutes total.
    const DELAYS = [2000, 3000, 5000];
    const MAX_DELAY = 8000;
    const MAX_TOTAL = 180_000;
    let attempt = 0;
    let elapsed = 0;
    let timer: number | undefined;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || isSettled()) return;
      try {
        const result = await paymentsApi.verifyPaymentStatus(orderId, guestToken ?? undefined);
        if (
          result.verified ||
          result.alreadyPaid ||
          result.paymentStatus === 'paid'
        ) {
          await refetchRef.current();
          return; // paid — stop polling
        }
      } catch {
        // Verification is best-effort; the order refetch below still runs.
      }
      if (cancelled) return;
      await refetchRef.current();
      if (cancelled || isSettled()) return;

      const delay = DELAYS[attempt] ?? MAX_DELAY;
      attempt += 1;
      elapsed += delay;
      if (elapsed > MAX_TOTAL) return;
      timer = window.setTimeout(() => void tick(), delay);
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
    // Depends only on the order/session reference; status is read via refs.
  }, [orderId, sessionId, guestToken]);

  if (!orderId) {
    return (
      <Notice>
        {t('orderResult.success.missingOrder')}{' '}
        <Link
          href='/user/orders'
          className='font-semibold underline underline-offset-4 hover:text-accent'
        >
          {t('orderResult.success.viewOrders')}
        </Link>
      </Notice>
    );
  }

  if (q.isLoading || (!order && !q.error)) {
    return <SuccessSkeleton label={t('common.loading')} />;
  }

  if (q.error || !order) {
    return <Notice>{t('orderResult.success.loadError')}</Notice>;
  }

  const waiting =
    order.paymentStatus === 'pending' ||
    order.paymentStatus === 'unpaid' ||
    !order.paymentStatus;

  const shortRef = order._id.slice(-8).toUpperCase();
  const placedOn = new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar-u-nu-latn' : 'en-US',
    { dateStyle: 'long' },
  ).format(new Date(order.createdAt));
  const isPickup = order.shippingMethod === 'none';
  const address = order.shippingAddress;
  const itemCount = order.items.reduce((n, item) => n + item.qty, 0);
  const discount = order.discountAmount ?? 0;

  const steps = [
    waiting
      ? {
          icon: Loader2,
          title: t('orderResult.success.stepConfirmingTitle'),
          body: t('orderResult.success.stepConfirmingBody'),
          state: 'current' as const,
        }
      : {
          icon: Check,
          title: t('orderResult.success.stepPaidTitle'),
          body: t('orderResult.success.stepPaidBody'),
          state: 'done' as const,
        },
    {
      icon: Package,
      title: t('orderResult.success.stepPrepareTitle'),
      body: t('orderResult.success.stepPrepareBody'),
      state: waiting ? ('upcoming' as const) : ('current' as const),
    },
    {
      icon: Truck,
      title: t('orderResult.success.stepShipTitle'),
      body: t('orderResult.success.stepShipBody'),
      state: 'upcoming' as const,
    },
  ];

  const enter = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className='mx-auto max-w-[1100px] py-4 sm:py-8'>
      <div className='grid gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16'>
        {/* Confirmation */}
        <motion.section
          {...enter(0)}
          aria-live='polite'
          className='min-w-0'
        >
          <motion.span
            initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className={
              waiting
                ? 'flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-ink'
                : 'flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_12px_32px_-12px_rgb(5_150_105/0.6)]'
            }
          >
            {waiting ? (
              <Loader2 className='h-7 w-7 animate-spin' aria-hidden />
            ) : (
              <Check className='h-8 w-8' strokeWidth={2.5} aria-hidden />
            )}
          </motion.span>

          <p className='mt-8 text-eyebrow uppercase text-accent'>
            {waiting
              ? t('orderResult.success.confirmingEyebrow')
              : t('orderResult.success.eyebrow')}
          </p>
          <h1 className='mt-3 text-title text-ink sm:text-display'>
            {waiting
              ? t('orderResult.success.confirmingTitle')
              : t('orderResult.success.title')}
          </h1>
          <p className='mt-4 max-w-lg text-base leading-relaxed text-ink-muted'>
            {waiting
              ? t('orderResult.success.waitingMessage')
              : t('orderResult.success.paidMessage')}
          </p>

          <div className='mt-6 flex flex-wrap items-center gap-2 text-sm'>
            <span className='rounded-full bg-surface-muted px-3.5 py-1.5 font-semibold tabular-nums text-ink'>
              {t('orderResult.success.orderNumber', { id: shortRef })}
            </span>
            <span className='rounded-full bg-surface-muted px-3.5 py-1.5 text-ink-muted'>
              {t('orderResult.success.placedOn', { date: placedOn })}
            </span>
          </div>

          {!waiting && (
            <p className='mt-6 flex items-start gap-2.5 text-sm text-ink-muted'>
              <Mail className='mt-0.5 h-4 w-4 shrink-0 text-ink' aria-hidden />
              <span>
                {order.guestEmail
                  ? t('orderResult.success.emailSent', { email: order.guestEmail })
                  : t('orderResult.success.emailSentGeneric')}
              </span>
            </p>
          )}

          <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
            <Link href={orderHref} className={PRIMARY_LINK}>
              {t('orderResult.success.viewOrder')}
              <ArrowRight className='h-4 w-4 rtl:-scale-x-100' aria-hidden />
            </Link>
            <Link href='/' className={QUIET_LINK}>
              {t('orderResult.success.continueShopping')}
            </Link>
          </div>

          {/* What happens next */}
          <motion.div {...enter(0.15)} className='mt-14'>
            <h2 className='text-heading text-ink'>
              {t('orderResult.success.nextTitle')}
            </h2>
            <ol className='mt-6'>
              {steps.map((step, i) => {
                const Icon = step.icon;
                const last = i === steps.length - 1;
                return (
                  <li key={step.title} className='relative flex gap-4 pb-8 last:pb-0'>
                    {!last && (
                      // A filled track rather than a border, so the timeline stays soft.
                      <span
                        aria-hidden
                        className={
                          step.state === 'done'
                            ? 'absolute start-[1.1875rem] top-11 h-[calc(100%-2.75rem)] w-0.5 rounded-full bg-emerald-600/40'
                            : 'absolute start-[1.1875rem] top-11 h-[calc(100%-2.75rem)] w-0.5 rounded-full bg-surface-muted'
                        }
                      />
                    )}
                    <span
                      className={
                        step.state === 'done'
                          ? 'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white'
                          : step.state === 'current'
                            ? 'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white'
                            : 'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-subtle'
                      }
                    >
                      <Icon
                        className={step.icon === Loader2 ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                        aria-hidden
                      />
                    </span>
                    <div className='pt-2'>
                      <p
                        className={
                          step.state === 'upcoming'
                            ? 'text-sm font-semibold text-ink-muted'
                            : 'text-sm font-semibold text-ink'
                        }
                      >
                        {step.title}
                      </p>
                      <p className='mt-1 text-sm text-ink-muted'>{step.body}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </motion.div>
        </motion.section>

        {/* Order summary */}
        <motion.aside
          {...enter(0.08)}
          aria-labelledby='order-summary-title'
          className='h-fit rounded-panel bg-surface-muted p-6 sm:p-8 lg:sticky lg:top-24'
        >
          <div className='flex items-baseline justify-between gap-3'>
            <h2 id='order-summary-title' className='text-heading text-ink'>
              {t('orderResult.success.summaryTitle')}
            </h2>
            <span className='text-sm tabular-nums text-ink-muted'>
              {t('orderResult.success.itemCount', { count: itemCount })}
            </span>
          </div>

          <ul className='mt-6 space-y-5'>
            {order.items.map((item, i) => {
              const variantLabel = formatVariantLabel(item.variant, t);
              return (
                <li key={`${item.productId}-${i}`} className='flex items-center gap-4'>
                  <div className='relative h-16 w-14 shrink-0'>
                    <div className='relative h-full w-full overflow-hidden rounded-control bg-surface'>
                      {item.cover ? (
                        <Image
                          loader={remoteCoverLoader}
                          src={normalizeRemoteImageSrc(item.cover)}
                          alt=''
                          fill
                          className='object-cover'
                          sizes='56px'
                        />
                      ) : null}
                    </div>
                    <span className='absolute -end-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[0.6875rem] font-semibold tabular-nums text-white'>
                      {item.qty}
                    </span>
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='line-clamp-2 text-sm font-semibold text-ink'>
                      {item.title}
                    </p>
                    {variantLabel && (
                      <p className='mt-0.5 truncate text-xs text-ink-muted'>{variantLabel}</p>
                    )}
                  </div>
                  <p className='shrink-0 text-sm font-semibold tabular-nums text-ink'>
                    {formatPrice(item.price * item.qty)}
                  </p>
                </li>
              );
            })}
          </ul>

          <dl className='mt-8 space-y-3 text-sm'>
            <div className='flex items-center justify-between text-ink-muted'>
              <dt>{t('checkout.subtotal')}</dt>
              <dd className='tabular-nums text-ink'>{formatPrice(order.itemsPrice)}</dd>
            </div>
            {discount > 0 && (
              <div className='flex items-center justify-between text-emerald-700'>
                <dt>
                  {t('cartPage.discount')}
                  {order.couponCode ? ` (${order.couponCode})` : ''}
                </dt>
                <dd className='tabular-nums'>-{formatPrice(discount)}</dd>
              </div>
            )}
            <div className='flex items-center justify-between text-ink-muted'>
              <dt>{t('checkout.shipping')}</dt>
              <dd className='tabular-nums text-ink'>{formatPrice(order.shippingPrice)}</dd>
            </div>
            <div className='flex items-center justify-between text-ink-muted'>
              <dt>{t('checkout.tax')}</dt>
              <dd className='tabular-nums text-ink'>{formatPrice(order.taxPrice)}</dd>
            </div>
          </dl>

          {/* The total sits on its own white tile instead of under a rule. */}
          <div className='mt-5 flex items-baseline justify-between rounded-card bg-surface px-5 py-4 text-ink'>
            <span className='text-base font-semibold'>{t('checkout.total')}</span>
            <span className='text-2xl font-semibold tabular-nums tracking-tight'>
              {formatPrice(order.totalPrice)}
            </span>
          </div>

          {address && (
            <div className='mt-8 flex gap-3'>
              <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink'>
                {isPickup ? (
                  <Store className='h-4 w-4' aria-hidden />
                ) : (
                  <MapPin className='h-4 w-4' aria-hidden />
                )}
              </span>
              <div className='min-w-0 text-sm'>
                <p className='font-semibold text-ink'>
                  {isPickup
                    ? t('orderResult.success.pickup')
                    : t('orderResult.success.shipTo')}
                </p>
                <p className='mt-1 text-ink-muted'>{address.name}</p>
                {!isPickup && (
                  <p className='text-ink-muted'>
                    {[address.address, address.city, address.zip, address.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.aside>
      </div>
    </div>
  );
}

/** Placeholder in the page's own two-column shape while the order loads. */
function SuccessSkeleton({ label }: { label: string }) {
  return (
    <div
      role='status'
      aria-label={label}
      className='mx-auto max-w-[1100px] py-4 sm:py-8'
    >
      <div className='grid gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16'>
        <div className='space-y-5'>
          <div className='h-16 w-16 animate-pulse rounded-full bg-surface-muted' />
          <div className='h-3 w-28 animate-pulse rounded-full bg-surface-muted' />
          <div className='h-10 w-3/4 animate-pulse rounded-control bg-surface-muted' />
          <div className='h-4 w-1/2 animate-pulse rounded-full bg-surface-muted' />
          <div className='flex gap-3 pt-4'>
            <div className='h-12 w-40 animate-pulse rounded-full bg-surface-muted' />
            <div className='h-12 w-40 animate-pulse rounded-full bg-surface-muted' />
          </div>
        </div>
        <div className='h-96 animate-pulse rounded-panel bg-surface-muted' />
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<SuccessSkeleton label='Loading' />}>
      <CheckoutSuccessInner />
    </Suspense>
  );
}
