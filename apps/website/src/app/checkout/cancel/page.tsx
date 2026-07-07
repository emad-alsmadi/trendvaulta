'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

function CheckoutCancelInner() {
  const orderId = useSearchParams().get('order_id');
  const shortId = orderId ? orderId.slice(-6).toUpperCase() : '';

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'>
        <h1 className='text-2xl font-extrabold tracking-tight text-indigo-950 sm:text-3xl'>
          Payment canceled
        </h1>
        <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
          No charge was made
          {shortId ? ` for draft order #${shortId}` : ''}. You can return to
          checkout anytime.
        </p>
        <div className='mt-6 flex flex-wrap gap-3'>
          <Link
            href='/checkout'
            className='inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:brightness-110'
          >
            <ArrowLeft className='h-4 w-4' />
            Return to checkout
          </Link>
          <Link
            href='/cart'
            className='inline-flex items-center justify-center rounded-full border border-white/35 bg-white/45 px-5 py-3 text-sm font-extrabold text-indigo-950 shadow-sm backdrop-blur-xl transition hover:bg-white/65'
          >
            Back to cart
          </Link>
          {orderId ? (
            <Link
              href={`/orders/${orderId}`}
              className='inline-flex items-center justify-center rounded-full border border-white/35 bg-white/45 px-5 py-3 text-sm font-extrabold text-indigo-950 shadow-sm backdrop-blur-xl transition hover:bg-white/65'
            >
              View draft order
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutCancelInner />
    </Suspense>
  );
}
