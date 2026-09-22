'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useOrderById } from '@/hooks/orders/ordersQuery';
import type { Order } from '@/types';
import { getAuthToken } from '@/lib/authCookies';
import { formatCurrency } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  canceled: 'Canceled',
  needs_attention: 'Needs Attention',
  refunded: 'Refunded',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};

const ATTENTION_REASON_LABELS: Record<string, string> = {
  insufficient_stock: 'Insufficient stock after payment',
  paid_after_cancel: 'Paid after cancel',
  refund_failed: 'Refund failed — manual action',
  manual_refund_required: 'Manual refund required',
};

function statusBadgeClass(status: string) {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    case 'paid':
    case 'shipped':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    case 'canceled':
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    case 'needs_attention':
      return 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200';
    case 'refunded':
      return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  }
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function variantLabel(variant?: {
  size?: string;
  color?: string;
  colorCode?: string;
  sku?: string;
}) {
  if (!variant) return null;
  const parts = [
    variant.size ? `Size: ${variant.size}` : null,
    variant.color ? `Color: ${variant.color}` : null,
    variant.sku ? `SKU: ${variant.sku}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const orderId = params.id;
  const orderQuery = useOrderById(orderId);
  const order = orderQuery.data;

  const copyId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast('Copied to clipboard', { variant: 'success' });
    } catch {
      toast('Could not copy', { variant: 'error' });
    }
  };

  if (!getAuthToken()) {
    return null;
  }

  return (
    <div className='space-y-6'>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'
      >
        <Link
          href='/account/orders'
          className='mb-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to orders
        </Link>

        {orderQuery.isLoading && (
          <p className='py-10 text-center text-sm text-indigo-950/50'>
            Loading order…
          </p>
        )}

        {orderQuery.isError && (
          <div className='rounded-lg border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'>
            Failed to load order
          </div>
        )}

        {order && (
          <div className='space-y-6'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div>
                <div className='flex items-center gap-2'>
                  <h1 className='text-2xl font-bold text-indigo-950'>
                    Order {order._id.slice(-8).toUpperCase()}
                  </h1>
                  <button
                    type='button'
                    onClick={() => void copyId(order._id)}
                    aria-label='Copy full order id'
                    className='rounded p-1 text-indigo-950/40 hover:text-indigo-950/70 dark:text-indigo-200/50 dark:hover:text-indigo-200/70'
                  >
                    <Copy className='h-4 w-4' />
                  </button>
                </div>
                {order.createdAt && (
                  <p className='mt-1 text-sm font-semibold text-indigo-950/70'>
                    Placed {formatDate(order.createdAt)}
                  </p>
                )}
              </div>
              <div className='flex flex-wrap gap-2'>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(order.status)}`}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </span>
                <span className='inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200'>
                  Payment:{' '}
                  {order.paymentStatus
                    ? PAYMENT_STATUS_LABELS[order.paymentStatus] ||
                      order.paymentStatus
                    : '—'}
                </span>
                {order.attentionReason && (
                  <span className='inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'>
                    {ATTENTION_REASON_LABELS[order.attentionReason] ||
                      order.attentionReason}
                  </span>
                )}
              </div>
            </div>

            <div className='grid gap-6 lg:grid-cols-3'>
              <div className='lg:col-span-2 space-y-6'>
                <section className='rounded-2xl border border-white/30 bg-white/35 p-5 shadow-sm backdrop-blur-xl'>
                  <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-indigo-950/70'>
                    Items
                  </h2>
                  <ul className='divide-y divide-white/30'>
                    {order.items.map((item, i) => (
                      <li
                        key={`${item.productId}-${i}`}
                        className='flex items-center gap-3 py-3 first:pt-0 last:pb-0'
                      >
                        {item.cover ? (
                          <img
                            src={item.cover}
                            alt={item.title}
                            className='h-14 w-14 shrink-0 rounded-lg bg-white/30 object-cover'
                          />
                        ) : (
                          <div className='h-14 w-14 shrink-0 rounded-lg bg-white/30' />
                        )}
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-sm font-bold text-indigo-950'>
                            {item.title}
                          </p>
                          {variantLabel(item.variant) && (
                            <p className='text-xs font-semibold text-indigo-950/60'>
                              {variantLabel(item.variant)}
                            </p>
                          )}
                          <p className='text-xs font-semibold text-indigo-950/60'>
                            Qty {item.qty} × {formatCurrency(item.price)}
                          </p>
                        </div>
                        <p className='shrink-0 text-sm font-extrabold text-indigo-950'>
                          {formatCurrency(item.price * item.qty)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className='rounded-2xl border border-white/30 bg-white/35 p-5 shadow-sm backdrop-blur-xl'>
                  <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-indigo-950/70'>
                    Shipping Address
                  </h2>
                  <dl className='grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2'>
                    <div>
                      <dt className='text-indigo-950/50'>Name</dt>
                      <dd className='font-medium text-indigo-950'>
                        {order.shippingAddress?.name || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className='text-indigo-950/50'>Phone</dt>
                      <dd className='font-medium text-indigo-950'>
                        {order.shippingAddress?.phone || '—'}
                      </dd>
                    </div>
                    <div className='sm:col-span-2'>
                      <dt className='text-indigo-950/50'>Address</dt>
                      <dd className='font-medium text-indigo-950'>
                        {order.shippingAddress?.address || '—'},{' '}
                        {order.shippingAddress?.city || '—'}{' '}
                        {order.shippingAddress?.zip || ''}
                      </dd>
                    </div>
                    <div>
                      <dt className='text-indigo-950/50'>Country</dt>
                      <dd className='font-medium text-indigo-950'>
                        {order.shippingAddress?.country || '—'}
                      </dd>
                    </div>
                    {order.shippingAddress?.notes && (
                      <div className='sm:col-span-2'>
                        <dt className='text-indigo-950/50'>Notes</dt>
                        <dd className='font-medium text-indigo-950'>
                          {order.shippingAddress.notes}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              </div>

              <div className='space-y-6'>
                <section className='rounded-2xl border border-white/30 bg-white/35 p-5 shadow-sm backdrop-blur-xl'>
                  <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-indigo-950/70'>
                    Order Summary
                  </h2>
                  <dl className='space-y-3 text-sm'>
                    <div className='flex justify-between'>
                      <dt className='text-indigo-950/70'>
                        Subtotal ({order.items.length} items)
                      </dt>
                      <dd className='font-medium text-indigo-950'>
                        {formatCurrency(order.itemsPrice)}
                      </dd>
                    </div>
                    {(order.discountAmount ?? 0) > 0 && (
                      <div className='flex justify-between text-green-700 bg-green-50 rounded-lg px-3 py-2'>
                        <dt className='flex items-center gap-2'>
                          <CheckCircle className='h-4 w-4' />
                          Discount{' '}
                          {order.couponCode ? `(${order.couponCode})` : ''}
                        </dt>
                        <dd className='font-medium'>
                          -{formatCurrency(order.discountAmount ?? 0)}
                        </dd>
                      </div>
                    )}
                    <div className='flex justify-between'>
                      <dt className='text-indigo-950/70 flex items-center gap-2'>
                        <Truck className='h-4 w-4' />
                        Shipping
                      </dt>
                      <dd className='font-medium text-indigo-950'>
                        {formatCurrency(order.shippingPrice)}
                      </dd>
                    </div>
                    <div className='flex justify-between'>
                      <dt className='text-indigo-950/70 flex items-center gap-2'>
                        <CreditCard className='h-4 w-4' />
                        Tax
                      </dt>
                      <dd className='font-medium text-indigo-950'>
                        {formatCurrency(order.taxPrice)}
                      </dd>
                    </div>
                    <div className='flex justify-between border-t border-white/30 pt-3 font-bold text-indigo-950'>
                      <dt>Total</dt>
                      <dd>{formatCurrency(order.totalPrice)}</dd>
                    </div>
                    {(order.refundAmount ?? 0) > 0 && (
                      <div className='flex justify-between text-rose-600 dark:text-rose-400'>
                        <dt>Refunded</dt>
                        <dd>-{formatCurrency(order.refundAmount ?? 0)}</dd>
                      </div>
                    )}
                  </dl>
                </section>

                {(order.stripeSessionId ||
                  order.paymentIntentId ||
                  order.refundId) && (
                  <section className='rounded-2xl border border-white/30 bg-white/35 p-5 shadow-sm backdrop-blur-xl'>
                    <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-indigo-950/70'>
                      Payment References
                    </h2>
                    <dl className='space-y-2 text-xs font-mono'>
                      {order.stripeSessionId && (
                        <div>
                          <dt className='text-indigo-950/50'>
                            Checkout Session
                          </dt>
                          <dd className='break-all text-indigo-950/70'>
                            {order.stripeSessionId}
                          </dd>
                        </div>
                      )}
                      {order.paymentIntentId && (
                        <div>
                          <dt className='text-indigo-950/50'>Payment Intent</dt>
                          <dd className='break-all text-indigo-950/70'>
                            {order.paymentIntentId}
                          </dd>
                        </div>
                      )}
                      {order.refundId && (
                        <div>
                          <dt className='text-indigo-950/50'>Refund ID</dt>
                          <dd className='break-all text-rose-600 dark:text-rose-400'>
                            {order.refundId}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </section>
                )}

                {order.trackingNumber && (
                  <section className='rounded-2xl border border-white/30 bg-white/35 p-5 shadow-sm backdrop-blur-xl'>
                    <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-indigo-950/70 flex items-center gap-2'>
                      <Truck className='h-4 w-4' />
                      Tracking
                    </h2>
                    <dl className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <dt className='text-indigo-950/70'>Tracking Number</dt>
                        <dd className='font-mono font-medium text-indigo-950'>
                          {order.trackingNumber}
                        </dd>
                      </div>
                      {order.trackingCarrier && (
                        <div className='flex justify-between'>
                          <dt className='text-indigo-950/70'>Carrier</dt>
                          <dd className='font-medium text-indigo-950'>
                            {order.trackingCarrier}
                          </dd>
                        </div>
                      )}
                      {order.trackingUrl && (
                        <div>
                          <a
                            href={order.trackingUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300'
                          >
                            Track Shipment
                            <ArrowLeft className='h-3.5 w-3.5 rotate-180' />
                          </a>
                        </div>
                      )}
                    </dl>
                  </section>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
