'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useOrderById } from '@/hooks/orders/ordersQuery';
import { clearCart } from '@/lib/cartStore';
import { paymentsApi } from '@/lib/api';

function CheckoutSuccessInner() {
  const sp = useSearchParams();
  const orderId = sp.get('order_id');
  const sessionId = sp.get('session_id');

  const q = useOrderById(orderId ?? undefined);
  const order = q.data;

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
        const result = await paymentsApi.verifyPaymentStatus(orderId);
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
  }, [orderId, sessionId]);

  if (!orderId) {
    return (
      <div className='rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900'>
        Missing order reference.{' '}
        <Link
          href='/orders'
          className='font-extrabold underline'
        >
          View orders
        </Link>
      </div>
    );
  }

  if (q.isLoading || (!order && !q.error)) {
    return (
      <div className='flex items-center justify-center rounded-3xl border border-white/40 bg-white/50 p-12 shadow-sm backdrop-blur-xl'>
        <Loader2 className='h-8 w-8 animate-spin text-fuchsia-600' />
      </div>
    );
  }

  if (q.error || !order) {
    return (
      <div className='rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900'>
        Could not load order.
      </div>
    );
  }

  const waiting =
    order.paymentStatus === 'pending' ||
    order.paymentStatus === 'unpaid' ||
    !order.paymentStatus;

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'>
        <h1 className='text-2xl font-extrabold tracking-tight text-indigo-950 sm:text-3xl'>
          {waiting ? 'Confirming payment…' : 'Payment successful'}
        </h1>
        <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
          {waiting
            ? 'Waiting for Stripe confirmation. This page updates automatically.'
            : 'Thank you — your order is paid.'}
        </p>
        {sessionId ? (
          <p className='mt-2 text-xs font-semibold text-indigo-950/55'>
            Checkout session {sessionId.slice(0, 24)}…
          </p>
        ) : null}
        <div className='mt-6 flex flex-wrap gap-3'>
          <Link
            href={`/orders/${order._id}`}
            className='inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:brightness-110'
          >
            View order
          </Link>
          <Link
            href='/'
            className='inline-flex items-center justify-center rounded-full border border-white/35 bg-white/45 px-5 py-3 text-sm font-extrabold text-indigo-950 shadow-sm backdrop-blur-xl transition hover:bg-white/65'
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center rounded-3xl border border-white/40 bg-white/50 p-12'>
          <Loader2 className='h-8 w-8 animate-spin text-fuchsia-600' />
        </div>
      }
    >
      <CheckoutSuccessInner />
    </Suspense>
  );
}
