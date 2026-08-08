'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Package } from 'lucide-react';
import { useOrderById } from '@/hooks/orders/ordersQuery';
import { OrderTrackingTimeline } from '@/components/orders/OrderTrackingTimeline';
import { orderStatusLabel } from '@/lib/orderTracking';
import { Button } from '@/components/ui/Button';

export default function OrderDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { data: order, isLoading, error, refetch } = useOrderById(id || undefined);

  if (!id) {
    return (
      <div className='rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900'>
        Missing order id.{' '}
        <Link href='/orders' className='font-bold underline'>
          Back to orders
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center rounded-2xl border border-stone-200 bg-white p-16'>
        <Loader2 className='h-8 w-8 animate-spin text-fuchsia-600' />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className='rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-900'>
        <p className='font-semibold'>Couldn’t load this order.</p>
        <Button type='button' className='mt-4' onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const shortId = order._id.slice(-6).toUpperCase();

  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Link
          href='/orders'
          className='inline-flex items-center gap-2 text-sm font-bold text-stone-700 hover:text-stone-900'
        >
          <ArrowLeft className='h-4 w-4' aria-hidden />
          All orders
        </Link>
        <Link
          href='/help'
          className='text-sm font-bold text-fuchsia-700 hover:underline'
        >
          Need help?
        </Link>
      </div>

      <header className='rounded-2xl border border-stone-200 bg-white p-6'>
        <div className='inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs font-extrabold text-stone-700'>
          <Package className='h-3.5 w-3.5' aria-hidden />
          Order #{shortId}
        </div>
        <h1 className='mt-3 text-2xl font-extrabold text-stone-900 sm:text-3xl'>
          Order details
        </h1>
        <p className='mt-1 text-sm font-semibold text-stone-600'>
          Placed {new Date(order.createdAt).toLocaleString()} · Status{' '}
          <span className='text-fuchsia-700'>
            {orderStatusLabel(order.status)}
          </span>
        </p>
      </header>

      <OrderTrackingTimeline order={order} />

      <section className='rounded-2xl border border-stone-200 bg-white p-6'>
        <h2 className='text-lg font-extrabold text-stone-900'>Items</h2>
        <ul className='mt-4 divide-y divide-stone-100'>
          {order.items.map((item) => (
            <li
              key={`${item.productId}-${item.title}`}
              className='flex gap-3 py-3'
            >
              <img
                src={item.cover}
                alt=''
                className='h-16 w-16 rounded-lg object-cover bg-stone-100'
              />
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-bold text-stone-900'>
                  {item.title}
                </p>
                <p className='text-xs font-semibold text-stone-500'>
                  Qty {item.qty}
                </p>
              </div>
              <p className='text-sm font-extrabold text-stone-900'>
                ${(item.price * item.qty).toFixed(2)}
              </p>
            </li>
          ))}
        </ul>
        <div className='mt-4 space-y-1 border-t border-stone-100 pt-4 text-sm font-semibold text-stone-600'>
          <div className='flex justify-between'>
            <span>Subtotal</span>
            <span>${order.itemsPrice.toFixed(2)}</span>
          </div>
          <div className='flex justify-between'>
            <span>Shipping</span>
            <span>${order.shippingPrice.toFixed(2)}</span>
          </div>
          {order.discountAmount ? (
            <div className='flex justify-between text-emerald-700'>
              <span>Discount</span>
              <span>-${order.discountAmount.toFixed(2)}</span>
            </div>
          ) : null}
          <div className='flex justify-between text-base font-extrabold text-stone-900'>
            <span>Total</span>
            <span>${order.totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </section>

      <section className='rounded-2xl border border-stone-200 bg-white p-6'>
        <h2 className='text-lg font-extrabold text-stone-900'>
          Delivery contact
        </h2>
        <dl className='mt-3 space-y-1 text-sm font-semibold text-stone-600'>
          <div>
            <dt className='inline text-stone-400'>Name: </dt>
            <dd className='inline'>{order.shippingAddress.name}</dd>
          </div>
          <div>
            <dt className='inline text-stone-400'>Phone: </dt>
            <dd className='inline'>{order.shippingAddress.phone}</dd>
          </div>
          <div>
            <dt className='inline text-stone-400'>Address: </dt>
            <dd className='inline'>
              {order.shippingAddress.address}, {order.shippingAddress.city}{' '}
              {order.shippingAddress.zip}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
