'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, Receipt, ArrowRight } from 'lucide-react';
import { useMyOrders } from '@/hooks/orders/ordersQuery';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'paid':
      return 'Paid';
    case 'shipped':
      return 'Shipped';
    case 'delivered':
      return 'Delivered';
    case 'canceled':
      return 'Canceled';
    default:
      return status;
  }
}

function paymentBadgeClass(paymentStatus?: string) {
  const p = paymentStatus ?? 'pending';
  switch (p) {
    case 'paid':
      return 'bg-emerald-500/12 text-emerald-900 border-emerald-200';
    case 'failed':
    case 'refunded':
      return 'bg-rose-500/12 text-rose-900 border-rose-200';
    default:
      return 'bg-amber-500/12 text-amber-900 border-amber-200';
  }
}

function paymentBadgeLabel(paymentStatus?: string) {
  const p = paymentStatus ?? 'pending';
  switch (p) {
    case 'paid':
      return 'Paid';
    case 'pending':
    case 'unpaid':
      return 'Awaiting payment';
    case 'failed':
      return 'Payment failed';
    case 'refunded':
      return 'Refunded';
    default:
      return p;
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'paid':
    case 'delivered':
      return 'bg-emerald-500/15 text-emerald-900 border-emerald-200';
    case 'shipped':
      return 'bg-cyan-500/15 text-cyan-900 border-cyan-200';
    case 'canceled':
      return 'bg-rose-500/15 text-rose-900 border-rose-200';
    default:
      return 'bg-amber-500/15 text-amber-900 border-amber-200';
  }
}

export default function OrdersPage() {
  const q = useMyOrders();
  const orders = q.data || [];

  if (q.isLoading) {
    return (
      <div className='flex items-center justify-center rounded-3xl border border-white/40 bg-white/50 p-12 shadow-sm backdrop-blur-xl'>
        <Loader2 className='h-7 w-7 animate-spin text-fuchsia-600' />
      </div>
    );
  }

  if (q.error) {
    logErrorForDev(q.error);
    const msg = getUserFacingErrorMessage(q.error, 'Failed to load orders');
    return (
      <div className='rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900'>
        {msg}
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'>
        <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
          <Receipt className='h-4 w-4 text-fuchsia-700' />
          Orders
        </div>
        <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
          My orders
        </h1>
        <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
          Track your recent purchases.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className='rounded-3xl border border-white/40 bg-white/50 p-8 text-center shadow-sm backdrop-blur-xl'>
          <div className='mx-auto inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-sm'>
            <Receipt className='h-6 w-6' />
          </div>
          <div className='mt-4 text-lg font-extrabold text-indigo-950'>
            No orders yet
          </div>
          <div className='mt-2 text-sm font-semibold text-indigo-950/75'>
            Start browsing templates and place your first order.
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className='grid gap-4'
        >
          {orders.map((o) => (
            <Link
              key={o._id}
              href={`/orders/${o._id}`}
              className='group rounded-3xl border border-white/35 bg-white/45 p-5 shadow-sm backdrop-blur-xl transition hover:bg-white/60'
            >
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='text-sm font-extrabold text-indigo-950'>
                    Order #{o._id.slice(-6).toUpperCase()}
                  </div>
                  <div className='mt-1 text-xs font-semibold text-indigo-950/70'>
                    {formatDate(o.createdAt)}
                  </div>
                </div>

                <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                  <div
                    className={`rounded-full border px-3 py-1 text-xs font-extrabold ${paymentBadgeClass(
                      o.paymentStatus,
                    )}`}
                  >
                    {paymentBadgeLabel(o.paymentStatus)}
                  </div>
                  <div
                    className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusClass(
                      o.status,
                    )}`}
                  >
                    {statusLabel(o.status)}
                  </div>
                  <div className='text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-700 via-indigo-700 to-cyan-700'>
                    ${o.totalPrice.toFixed(2)}
                  </div>
                  <ArrowRight className='h-4 w-4 text-indigo-950/60 transition group-hover:translate-x-0.5' />
                </div>
              </div>
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
}
