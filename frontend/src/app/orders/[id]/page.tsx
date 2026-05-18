'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Loader2,
  ArrowLeft,
  Receipt,
  MapPin,
  Phone,
  User,
  Package,
} from 'lucide-react';
import { useOrderById } from '@/hooks/orders/ordersQuery';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import { normalizeRemoteImageSrc, remoteCoverLoader } from '@/lib/utils';

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string | undefined;

  const q = useOrderById(id);
  const order = q.data || null;

  if (q.isLoading) {
    return (
      <div className='flex items-center justify-center rounded-3xl border border-white/40 bg-white/50 p-12 shadow-sm backdrop-blur-xl'>
        <Loader2 className='h-7 w-7 animate-spin text-fuchsia-600' />
      </div>
    );
  }

  if (q.error || !order) {
    if (q.error) logErrorForDev(q.error);
    const msg = getUserFacingErrorMessage(q.error, 'Order not found');
    return (
      <div className='space-y-4'>
        <Link
          href='/orders'
          className='inline-flex items-center gap-2 text-sm font-extrabold text-indigo-700'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to orders
        </Link>
        <div className='rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900'>
          {msg}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'>
        <Link
          href='/orders'
          className='inline-flex items-center gap-2 text-sm font-extrabold text-indigo-700'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to orders
        </Link>

        <div className='mt-4 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
          <Receipt className='h-4 w-4 text-fuchsia-700' />
          Order
        </div>
        <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
          Order #{order._id.slice(-6).toUpperCase()}
        </h1>
        <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
          Placed on {formatDate(order.createdAt)}
        </p>
      </div>

      <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl'
        >
          <div className='flex items-center gap-2 text-sm font-extrabold text-indigo-950'>
            <Package className='h-4 w-4 text-cyan-700' />
            Items
          </div>

          <div className='mt-4 space-y-3'>
            {order.items.map((it) => (
              <div
                key={`${it.templateId}-${it.title}`}
                className='flex items-center gap-4 rounded-3xl border border-white/30 bg-white/30 p-4'
              >
                <div className='relative h-20 w-16 overflow-hidden rounded-2xl border border-white/30 bg-white/20'>
                  <Image
                    loader={remoteCoverLoader}
                    src={normalizeRemoteImageSrc(it.cover)}
                    alt={it.title}
                    fill
                    className='object-cover'
                    sizes='64px'
                  />
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-sm font-extrabold text-indigo-950'>
                    {it.title}
                  </div>
                  <div className='mt-1 text-xs font-semibold text-indigo-950/70'>
                    ${it.price.toFixed(2)} x {it.qty}
                  </div>
                </div>
                <div className='text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-700 via-indigo-700 to-cyan-700'>
                  ${(it.price * it.qty).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className='space-y-4'
        >
          <div className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl'>
            <div className='text-sm font-extrabold text-indigo-950'>Totals</div>
            <div className='mt-4 space-y-3'>
              <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/80'>
                <span>Items</span>
                <span>${order.itemsPrice.toFixed(2)}</span>
              </div>
              <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/70'>
                <span>Shipping</span>
                <span>${order.shippingPrice.toFixed(2)}</span>
              </div>
              <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/70'>
                <span>Tax</span>
                <span>${order.taxPrice.toFixed(2)}</span>
              </div>
              <div className='h-px bg-indigo-900/10' />
              <div className='flex items-center justify-between text-base font-extrabold text-indigo-950'>
                <span>Total</span>
                <span>${order.totalPrice.toFixed(2)}</span>
              </div>
              <div className='rounded-2xl border border-white/25 bg-white/25 px-4 py-3'>
                <div className='text-xs font-extrabold uppercase tracking-wider text-indigo-950/65'>
                  Payment
                </div>
                <div className='mt-1 text-sm font-extrabold capitalize text-indigo-950'>
                  {(order.paymentStatus ?? 'paid').replace('-', ' ')}
                </div>
                {order.paidAt ? (
                  <div className='mt-1 text-xs font-semibold text-indigo-950/70'>
                    Paid {formatDate(order.paidAt)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl'>
            <div className='text-sm font-extrabold text-indigo-950'>
              Shipping
            </div>
            <div className='mt-4 space-y-3'>
              <div className='flex items-center gap-2 text-sm font-extrabold text-indigo-950'>
                <User className='h-4 w-4 text-indigo-700' />
                {order.shippingAddress.name}
              </div>
              <div className='flex items-center gap-2 text-sm font-semibold text-indigo-950/80'>
                <Phone className='h-4 w-4 text-fuchsia-700' />
                {order.shippingAddress.phone}
              </div>
              <div className='flex items-start gap-2 text-sm font-semibold text-indigo-950/80'>
                <MapPin className='mt-0.5 h-4 w-4 text-cyan-700' />
                <div>
                  <div>{order.shippingAddress.address}</div>
                  <div className='mt-1 text-xs font-semibold text-indigo-950/70'>
                    {order.shippingAddress.city} • {order.shippingAddress.zip}
                  </div>
                  {order.shippingAddress.notes && (
                    <div className='mt-2 text-xs font-semibold text-indigo-950/70'>
                      Notes: {order.shippingAddress.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
