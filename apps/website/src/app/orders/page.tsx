'use client';

import Link from 'next/link';
import { Loader2, Package } from 'lucide-react';
import { useMyOrders } from '@/hooks/orders/ordersQuery';
import { orderStatusLabel } from '@/lib/orderTracking';
import { OrderTrackingTimeline } from '@/components/orders/OrderTrackingTimeline';
import { Button } from '@/components/ui/Button';

/** Authenticated orders hub — `/orders` (also linked from checkout success) */
export default function OrdersIndexPage() {
  const { data: orders, isLoading, error, refetch } = useMyOrders();

  if (isLoading) {
    return (
      <div className='flex items-center justify-center rounded-2xl border border-stone-200 bg-white p-16'>
        <Loader2 className='h-8 w-8 animate-spin text-fuchsia-600' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-900'>
        <p className='font-semibold'>Couldn’t load orders.</p>
        <Button type='button' className='mt-4' onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className='rounded-2xl border border-stone-200 bg-white p-10 text-center'>
        <Package className='mx-auto h-12 w-12 text-stone-300' aria-hidden />
        <h1 className='mt-4 text-xl font-extrabold text-stone-900'>
          No orders yet
        </h1>
        <p className='mt-2 text-sm font-semibold text-stone-600'>
          When you checkout, tracking progress will show here.
        </p>
        <Link
          href='/products'
          className='mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-extrabold text-white'
        >
          Browse catalog
        </Link>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      <header>
        <h1 className='text-2xl font-extrabold text-stone-900 sm:text-3xl'>
          Your orders
        </h1>
        <p className='mt-1 text-sm font-semibold text-stone-600'>
          Track progress and open any order for full details.
        </p>
      </header>

      <ul className='space-y-6'>
        {orders.map((order) => {
          const shortId = order._id.slice(-6).toUpperCase();
          return (
            <li
              key={order._id}
              className='space-y-3 rounded-2xl border border-stone-200 bg-stone-50/50 p-4 sm:p-5'
            >
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <p className='text-sm font-extrabold text-stone-900'>
                    Order #{shortId}
                  </p>
                  <p className='text-xs font-semibold text-stone-500'>
                    {new Date(order.createdAt).toLocaleDateString()} ·{' '}
                    {orderStatusLabel(order.status)} · $
                    {order.totalPrice.toFixed(2)}
                  </p>
                </div>
                <Link
                  href={`/orders/${order._id}`}
                  className='rounded-full bg-white px-4 py-2 text-xs font-extrabold text-fuchsia-700 ring-1 ring-stone-200 hover:bg-fuchsia-50'
                >
                  View details
                </Link>
              </div>
              <OrderTrackingTimeline order={order} compact />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
