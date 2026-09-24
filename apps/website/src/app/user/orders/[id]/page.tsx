'use client';

import Link from 'next/link';
import Image from 'next/image';
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
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  useCancelOrderMutation,
  useOrderById,
} from '@/hooks/orders/ordersQuery';
import { getUserFacingErrorMessage } from '@/lib/userFacingError';
import { OrderReturnSection } from '@/components/orders/OrderReturnSection';
import type { Order } from '@/types';
import { getAuthToken } from '@/lib/authCookies';
import { useTranslation } from '@/contexts/TranslationContext';
import { intlLocale } from '@/lib/locale';

/** Message keys, resolved with t() at render. */
const STATUS_LABELS: Record<string, string> = {
  pending: 'orders.status.pending',
  paid: 'orders.status.paid',
  shipped: 'orders.status.shipped',
  delivered: 'orders.status.delivered',
  canceled: 'orders.status.canceled',
  needs_attention: 'orders.status.needs_attention',
  refunded: 'orders.status.refunded',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'orders.paymentStatus.unpaid',
  pending: 'orders.paymentStatus.pending',
  paid: 'orders.paymentStatus.paid',
  failed: 'orders.paymentStatus.failed',
  refunded: 'orders.paymentStatus.refunded',
};

const ATTENTION_REASON_LABELS: Record<string, string> = {
  insufficient_stock: 'orders.attentionReason.insufficient_stock',
  paid_after_cancel: 'orders.attentionReason.paid_after_cancel',
  refund_failed: 'orders.attentionReason.refund_failed',
  manual_refund_required: 'orders.attentionReason.manual_refund_required',
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

function formatDate(dateString: string | undefined, locale: string) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function variantLabel(
  variant: {
    size?: string;
    color?: string;
    colorCode?: string;
    sku?: string;
  } | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (!variant) return null;
  const parts = [
    variant.size ? t('product.sizeValue', { value: variant.size }) : null,
    variant.color ? t('product.colorValue', { value: variant.color }) : null,
    variant.sku ? t('orders.detail.skuValue', { value: variant.sku }) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const orderId = params.id;
  const orderQuery = useOrderById(orderId);
  const order = orderQuery.data;
  const cancelMutation = useCancelOrderMutation();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const { t, formatPrice, locale } = useTranslation();

  const handleCancel = async () => {
    if (!order) return;
    try {
      const result = await cancelMutation.mutateAsync(order._id);
      setConfirmingCancel(false);
      // Chosen from the outcome flags rather than the API's English message.
      toast(
        t(
          result.refunded
            ? 'orders.cancel.successRefunded'
            : result.refundPending
              ? 'orders.cancel.successRefundPending'
              : 'orders.cancel.success',
        ),
        { variant: 'success' },
      );
    } catch (err) {
      toast(getUserFacingErrorMessage(err, t('orders.toast.cancelFailed'), t), {
        variant: 'error',
      });
      // A 409 means the order changed under us (e.g. it just shipped):
      // refetch so the page stops offering an action that no longer applies.
      void orderQuery.refetch();
    }
  };

  const copyId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(t('orders.toast.copied'), { variant: 'success' });
    } catch {
      toast(t('orders.toast.copyFailed'), { variant: 'error' });
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
          href='/user/orders'
          className='mb-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400'
        >
          <ArrowLeft className='h-4 w-4 rtl:-scale-x-100' />
          {t('orders.detail.back')}
        </Link>

        {orderQuery.isLoading && (
          <p className='py-10 text-center text-sm text-indigo-950/50'>
            {t('orders.detail.loading')}
          </p>
        )}

        {orderQuery.isError && (
          <div className='rounded-lg border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'>
            {t('orders.detail.loadError')}
          </div>
        )}

        {order && (
          <div className='space-y-6'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div>
                <div className='flex items-center gap-2'>
                  <h1 className='text-2xl font-bold text-indigo-950'>
                    {t('orders.detail.title', {
                      id: order._id.slice(-8).toUpperCase(),
                    })}
                  </h1>
                  <button
                    type='button'
                    onClick={() => void copyId(order._id)}
                    aria-label={t('orders.detail.copyId')}
                    className='rounded p-1 text-indigo-950/40 hover:text-indigo-950/70 dark:text-indigo-200/50 dark:hover:text-indigo-200/70'
                  >
                    <Copy className='h-4 w-4' />
                  </button>
                </div>
                {order.createdAt && (
                  <p className='mt-1 text-sm font-semibold text-indigo-950/70'>
                    {t('orders.detail.placed', {
                      date: formatDate(order.createdAt, intlLocale(locale)),
                    })}
                  </p>
                )}
              </div>
              <div className='flex flex-wrap gap-2'>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(order.status)}`}
                >
                  {STATUS_LABELS[order.status]
                    ? t(STATUS_LABELS[order.status])
                    : order.status}
                </span>
                <span className='inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200'>
                  {t('orders.detail.paymentBadge', {
                    status: order.paymentStatus
                      ? PAYMENT_STATUS_LABELS[order.paymentStatus]
                        ? t(PAYMENT_STATUS_LABELS[order.paymentStatus])
                        : order.paymentStatus
                      : '—',
                  })}
                </span>
                {order.attentionReason && (
                  <span className='inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'>
                    {ATTENTION_REASON_LABELS[order.attentionReason]
                      ? t(ATTENTION_REASON_LABELS[order.attentionReason])
                      : order.attentionReason}
                  </span>
                )}
              </div>
            </div>

            {order.canCancel && (
              <div className='rounded-2xl border border-rose-200/70 bg-rose-50/60 p-4'>
                {!confirmingCancel ? (
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <p className='text-sm text-indigo-950/80'>
                      {t('orders.cancel.prompt')}
                    </p>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => setConfirmingCancel(true)}
                    >
                      {t('orders.cancel.button')}
                    </Button>
                  </div>
                ) : (
                  <div role='alertdialog' aria-labelledby='cancel-title' className='space-y-3'>
                    <p id='cancel-title' className='font-semibold text-indigo-950'>
                      {t('orders.cancel.title')}
                    </p>
                    <p className='text-sm text-indigo-950/80'>
                      {order.paymentStatus === 'paid'
                        ? t('orders.cancel.refundNotice', {
                            amount: formatPrice(order.totalPrice),
                          })
                        : t('orders.cancel.noChargeNotice')}
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        type='button'
                        variant='destructive'
                        size='sm'
                        disabled={cancelMutation.isPending}
                        onClick={() => void handleCancel()}
                      >
                        {cancelMutation.isPending
                          ? t('orders.cancel.canceling')
                          : t('orders.cancel.confirm')}
                      </Button>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        disabled={cancelMutation.isPending}
                        onClick={() => setConfirmingCancel(false)}
                      >
                        {t('orders.cancel.keep')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <OrderReturnSection order={order} />

            <div className='grid gap-6 lg:grid-cols-3'>
              <div className='lg:col-span-2 space-y-6'>
                <section className='rounded-2xl border border-white/30 bg-white/35 p-5 shadow-sm backdrop-blur-xl'>
                  <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-indigo-950/70'>
                    {t('orders.detail.items')}
                  </h2>
                  <ul className='divide-y divide-white/30'>
                    {order.items.map((item, i) => (
                      <li
                        key={`${item.productId}-${i}`}
                        className='flex items-center gap-3 py-3 first:pt-0 last:pb-0'
                      >
                        {item.cover ? (
                          <Image
                            src={item.cover}
                            alt={item.title}
                            width={56}
                            height={56}
                            className='h-14 w-14 shrink-0 rounded-lg bg-white/30 object-cover'
                          />
                        ) : (
                          <div className='h-14 w-14 shrink-0 rounded-lg bg-white/30' />
                        )}
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-sm font-bold text-indigo-950'>
                            {item.title}
                          </p>
                          {variantLabel(item.variant, t) && (
                            <p className='text-xs font-semibold text-indigo-950/60'>
                              {variantLabel(item.variant, t)}
                            </p>
                          )}
                          <p className='text-xs font-semibold text-indigo-950/60'>
                            {t('checkoutPage.summary.qtyPrice', {
                              qty: item.qty,
                              price: formatPrice(item.price),
                            })}
                          </p>
                        </div>
                        <p className='shrink-0 text-sm font-extrabold text-indigo-950'>
                          {formatPrice(item.price * item.qty)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className='rounded-2xl border border-white/30 bg-white/35 p-5 shadow-sm backdrop-blur-xl'>
                  <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-indigo-950/70'>
                    {t('checkout.shippingAddress')}
                  </h2>
                  <dl className='grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2'>
                    <div>
                      <dt className='text-indigo-950/50'>{t('orders.detail.name')}</dt>
                      <dd className='font-medium text-indigo-950'>
                        {order.shippingAddress?.name || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className='text-indigo-950/50'>{t('checkout.phone')}</dt>
                      <dd className='font-medium text-indigo-950'>
                        {order.shippingAddress?.phone || '—'}
                      </dd>
                    </div>
                    <div className='sm:col-span-2'>
                      <dt className='text-indigo-950/50'>{t('checkout.address')}</dt>
                      <dd className='font-medium text-indigo-950'>
                        {order.shippingAddress?.address || '—'},{' '}
                        {order.shippingAddress?.city || '—'}{' '}
                        {order.shippingAddress?.zip || ''}
                      </dd>
                    </div>
                    <div>
                      <dt className='text-indigo-950/50'>{t('checkout.country')}</dt>
                      <dd className='font-medium text-indigo-950'>
                        {order.shippingAddress?.country || '—'}
                      </dd>
                    </div>
                    {order.shippingAddress?.notes && (
                      <div className='sm:col-span-2'>
                        <dt className='text-indigo-950/50'>{t('checkoutPage.form.notesLabel')}</dt>
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
                    {t('orders.detail.summaryTitle')}
                  </h2>
                  <dl className='space-y-3 text-sm'>
                    <div className='flex justify-between'>
                      <dt className='text-indigo-950/70'>
                        {t('orders.detail.subtotalItems', {
                          count: order.items.length,
                        })}
                      </dt>
                      <dd className='font-medium text-indigo-950'>
                        {formatPrice(order.itemsPrice)}
                      </dd>
                    </div>
                    {(order.discountAmount ?? 0) > 0 && (
                      <div className='flex justify-between text-green-700 bg-green-50 rounded-lg px-3 py-2'>
                        <dt className='flex items-center gap-2'>
                          <CheckCircle className='h-4 w-4' />
                          {order.couponCode
                            ? t('orders.detail.discountWithCode', {
                                code: order.couponCode,
                              })
                            : t('cartPage.discount')}
                        </dt>
                        <dd className='font-medium'>
                          -{formatPrice(order.discountAmount ?? 0)}
                        </dd>
                      </div>
                    )}
                    <div className='flex justify-between'>
                      <dt className='text-indigo-950/70 flex items-center gap-2'>
                        <Truck className='h-4 w-4' />
                        {t('checkout.shipping')}
                      </dt>
                      <dd className='font-medium text-indigo-950'>
                        {formatPrice(order.shippingPrice)}
                      </dd>
                    </div>
                    <div className='flex justify-between'>
                      <dt className='text-indigo-950/70 flex items-center gap-2'>
                        <CreditCard className='h-4 w-4' />
                        {t('checkout.tax')}
                      </dt>
                      <dd className='font-medium text-indigo-950'>
                        {formatPrice(order.taxPrice)}
                      </dd>
                    </div>
                    <div className='flex justify-between border-t border-white/30 pt-3 font-bold text-indigo-950'>
                      <dt>{t('checkout.total')}</dt>
                      <dd>{formatPrice(order.totalPrice)}</dd>
                    </div>
                    {(order.refundAmount ?? 0) > 0 && (
                      <div className='flex justify-between text-rose-600 dark:text-rose-400'>
                        <dt>{t('orders.detail.refunded')}</dt>
                        <dd>-{formatPrice(order.refundAmount ?? 0)}</dd>
                      </div>
                    )}
                  </dl>
                </section>

                {(order.stripeSessionId ||
                  order.paymentIntentId ||
                  order.refundId) && (
                  <section className='rounded-2xl border border-white/30 bg-white/35 p-5 shadow-sm backdrop-blur-xl'>
                    <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-indigo-950/70'>
                      {t('orders.detail.paymentReferences')}
                    </h2>
                    <dl className='space-y-2 text-xs font-mono'>
                      {order.stripeSessionId && (
                        <div>
                          <dt className='text-indigo-950/50'>
                            {t('orders.detail.checkoutSession')}
                          </dt>
                          <dd className='break-all text-indigo-950/70'>
                            {order.stripeSessionId}
                          </dd>
                        </div>
                      )}
                      {order.paymentIntentId && (
                        <div>
                          <dt className='text-indigo-950/50'>{t('orders.detail.paymentIntent')}</dt>
                          <dd className='break-all text-indigo-950/70'>
                            {order.paymentIntentId}
                          </dd>
                        </div>
                      )}
                      {order.refundId && (
                        <div>
                          <dt className='text-indigo-950/50'>{t('orders.detail.refundId')}</dt>
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
                      {t('orders.detail.tracking')}
                    </h2>
                    <dl className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <dt className='text-indigo-950/70'>{t('orders.detail.trackingNumber')}</dt>
                        <dd className='font-mono font-medium text-indigo-950'>
                          {order.trackingNumber}
                        </dd>
                      </div>
                      {order.trackingCarrier && (
                        <div className='flex justify-between'>
                          <dt className='text-indigo-950/70'>{t('orders.detail.carrier')}</dt>
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
                            {t('orders.detail.trackShipment')}
                            <ArrowLeft className='h-3.5 w-3.5 rotate-180 rtl:-scale-x-100' />
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
