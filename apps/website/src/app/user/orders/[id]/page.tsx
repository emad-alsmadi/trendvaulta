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
  FileText,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import {
  useCancelOrderMutation,
  useOrderById,
} from '@/hooks/orders/ordersQuery';
import { getUserFacingErrorMessage } from '@/lib/userFacingError';
import { OrderReturnSection } from '@/components/orders/OrderReturnSection';
import type { Order } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';
import { intlLocale } from '@/lib/locale';
import { ListSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';
import {
  ATTENTION_REASON_LABELS,
  PAYMENT_STATUS_LABELS,
  STATUS_LABELS,
  statusBadgeClass,
} from '@/lib/orderStatus';

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
  const confirm = useConfirm();
  const { t, formatPrice, locale } = useTranslation();

  const handleCancel = async () => {
    if (!order) return;
    try {
      const result = await cancelMutation.mutateAsync(order._id);
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

  const hasInvoice =
    order?.paymentStatus === 'paid' || order?.paymentStatus === 'refunded';

  const openInvoice = async () => {
    if (!order) return;
    // A route handler returning a whole HTML document, not a Next page: it
    // needs a full document load, never client-side routing.
    const url = new URL(
      `/user/orders/${order._id}/invoice?lang=${locale}`,
      window.location.origin,
    ).toString();
    // Open the tab inside the click (popup blockers), then refetch the order:
    // that renews an expired access token, which the invoice route reads
    // from the cookie server-side.
    const tab = window.open('', '_blank');
    try {
      await orderQuery.refetch();
    } catch {
      // The invoice route sends an expired session to login and back
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      window.location.assign(url);
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

  return (
    <div className='space-y-6'>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className='space-y-1'
      >
        <Link
          href='/user/orders'
          className='mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink'
        >
          <ArrowLeft className='h-4 w-4 rtl:-scale-x-100' />
          {t('orders.detail.back')}
        </Link>

        {orderQuery.isLoading && (
          <div className='space-y-6'>
            <PageHeaderSkeleton />
            <ListSkeleton rows={2} label={t('orders.detail.loading')} />
          </div>
        )}

        {orderQuery.isError && (
          <div className='py-6 text-sm font-medium text-rose-800'>
            {t('orders.detail.loadError')}
          </div>
        )}

        {order && (
          <div className='space-y-6'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div>
                <div className='flex items-center gap-2'>
                  <h1 className='text-2xl font-semibold tracking-tight text-ink'>
                    {t('orders.detail.title', {
                      id: order._id.slice(-8).toUpperCase(),
                    })}
                  </h1>
                  <button
                    type='button'
                    onClick={() => void copyId(order._id)}
                    aria-label={t('orders.detail.copyId')}
                    className='rounded-full p-1.5 text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink'
                  >
                    <Copy className='h-4 w-4' />
                  </button>
                </div>
                {order.createdAt && (
                  <p className='mt-1 text-sm text-ink-muted'>
                    {t('orders.detail.placed', {
                      date: formatDate(order.createdAt, intlLocale(locale)),
                    })}
                  </p>
                )}
                {hasInvoice && (
                  <div className='mt-3 flex flex-wrap items-center gap-3'>
                    <Button
                      type='button'
                      variant='line'
                      size='sm'
                      onClick={() => void openInvoice()}
                      aria-describedby='invoice-hint'
                    >
                      <FileText className='me-1.5 h-4 w-4' aria-hidden='true' />
                      {t('orders.detail.invoice')}
                    </Button>
                    {order.invoiceNumber && (
                      <span className='text-xs text-ink-muted'>
                        {t('orders.detail.invoiceNumber', { number: order.invoiceNumber })}
                      </span>
                    )}
                    <span id='invoice-hint' className='sr-only'>
                      {t('orders.detail.invoiceHint')}
                    </span>
                  </div>
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
                <span className='inline-flex items-center rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-muted'>
                  {t('orders.detail.paymentBadge', {
                    status: order.paymentStatus
                      ? PAYMENT_STATUS_LABELS[order.paymentStatus]
                        ? t(PAYMENT_STATUS_LABELS[order.paymentStatus])
                        : order.paymentStatus
                      : '—',
                  })}
                </span>
                {order.attentionReason && (
                  <span className='inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800'>
                    {ATTENTION_REASON_LABELS[order.attentionReason]
                      ? t(ATTENTION_REASON_LABELS[order.attentionReason])
                      : order.attentionReason}
                  </span>
                )}
              </div>
            </div>

            {order.canCancel && (
              <div className=''>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <p className='text-sm text-ink-muted'>
                    {t('orders.cancel.prompt')}
                  </p>
                  <Button
                    type='button'
                    variant='line'
                    size='sm'
                    loading={cancelMutation.isPending}
                    onClick={() =>
                      void confirm({
                        variant: 'danger',
                        title: t('orders.cancel.title'),
                        description:
                          order.paymentStatus === 'paid'
                            ? t('orders.cancel.refundNotice', {
                                amount: formatPrice(order.totalPrice),
                              })
                            : t('orders.cancel.noChargeNotice'),
                        confirmLabel: t('orders.cancel.confirm'),
                        cancelLabel: t('orders.cancel.keep'),
                        onConfirm: handleCancel,
                      })
                    }
                  >
                    {t('orders.cancel.button')}
                  </Button>
                </div>
              </div>
            )}

            <OrderReturnSection order={order} />

            <div className='grid gap-10 lg:grid-cols-3'>
              <div className='space-y-10 lg:col-span-2'>
                <section className=''>
                  <h2 className='mb-4 text-heading text-ink'>
                    {t('orders.detail.items')}
                  </h2>
                  <ul className='space-y-1'>
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
                            className='h-14 w-14 shrink-0 rounded-control bg-surface-muted object-cover'
                          />
                        ) : (
                          <div className='h-14 w-14 shrink-0 rounded-control bg-surface-muted' />
                        )}
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-sm font-semibold text-ink'>
                            {item.title}
                          </p>
                          {variantLabel(item.variant, t) && (
                            <p className='text-xs text-ink-muted'>
                              {variantLabel(item.variant, t)}
                            </p>
                          )}
                          <p className='text-xs text-ink-muted'>
                            {t('checkoutPage.summary.qtyPrice', {
                              qty: item.qty,
                              price: formatPrice(item.price),
                            })}
                          </p>
                        </div>
                        <p className='shrink-0 text-sm font-semibold tabular-nums text-ink'>
                          {formatPrice(item.price * item.qty)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className=''>
                  <h2 className='mb-4 text-heading text-ink'>
                    {t('checkout.shippingAddress')}
                  </h2>
                  <dl className='grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2'>
                    <div>
                      <dt className='text-ink-muted'>{t('orders.detail.name')}</dt>
                      <dd className='font-medium text-ink'>
                        {order.shippingAddress?.name || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className='text-ink-muted'>{t('checkout.phone')}</dt>
                      <dd className='font-medium text-ink'>
                        {order.shippingAddress?.phone || '—'}
                      </dd>
                    </div>
                    <div className='sm:col-span-2'>
                      <dt className='text-ink-muted'>{t('checkout.address')}</dt>
                      <dd className='font-medium text-ink'>
                        {order.shippingAddress?.address || '—'},{' '}
                        {order.shippingAddress?.city || '—'}{' '}
                        {order.shippingAddress?.zip || ''}
                      </dd>
                    </div>
                    <div>
                      <dt className='text-ink-muted'>{t('checkout.country')}</dt>
                      <dd className='font-medium text-ink'>
                        {order.shippingAddress?.country || '—'}
                      </dd>
                    </div>
                    {order.shippingAddress?.notes && (
                      <div className='sm:col-span-2'>
                        <dt className='text-ink-muted'>{t('checkoutPage.form.notesLabel')}</dt>
                        <dd className='font-medium text-ink'>
                          {order.shippingAddress.notes}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              </div>

              <div className='space-y-6'>
                <section className=''>
                  <h2 className='mb-4 text-heading text-ink'>
                    {t('orders.detail.summaryTitle')}
                  </h2>
                  <dl className='space-y-3 text-sm'>
                    <div className='flex justify-between'>
                      <dt className='text-ink-muted'>
                        {t('orders.detail.subtotalItems', {
                          count: order.items.length,
                        })}
                      </dt>
                      <dd className='font-medium text-ink'>
                        {formatPrice(order.itemsPrice)}
                      </dd>
                    </div>
                    {(order.discountAmount ?? 0) > 0 && (
                      <div className='flex justify-between text-emerald-700'>
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
                      <dt className='text-ink-muted flex items-center gap-2'>
                        <Truck className='h-4 w-4' />
                        {t('checkout.shipping')}
                      </dt>
                      <dd className='font-medium text-ink'>
                        {formatPrice(order.shippingPrice)}
                      </dd>
                    </div>
                    <div className='flex justify-between'>
                      <dt className='text-ink-muted flex items-center gap-2'>
                        <CreditCard className='h-4 w-4' />
                        {t('checkout.tax')}
                      </dt>
                      <dd className='font-medium text-ink'>
                        {formatPrice(order.taxPrice)}
                      </dd>
                    </div>
                    <div className='flex justify-between pt-3 text-base font-semibold text-ink'>
                      <dt>{t('checkout.total')}</dt>
                      <dd>{formatPrice(order.totalPrice)}</dd>
                    </div>
                    {(order.refundAmount ?? 0) > 0 && (
                      <div className='flex justify-between text-rose-600'>
                        <dt>{t('orders.detail.refunded')}</dt>
                        <dd>-{formatPrice(order.refundAmount ?? 0)}</dd>
                      </div>
                    )}
                  </dl>
                </section>

                {(order.stripeSessionId ||
                  order.paymentIntentId ||
                  order.refundId) && (
                  <section className=''>
                    <h2 className='mb-4 text-heading text-ink'>
                      {t('orders.detail.paymentReferences')}
                    </h2>
                    <dl className='space-y-2 text-xs font-mono'>
                      {order.stripeSessionId && (
                        <div>
                          <dt className='text-ink-muted'>
                            {t('orders.detail.checkoutSession')}
                          </dt>
                          <dd className='break-all text-ink-muted'>
                            {order.stripeSessionId}
                          </dd>
                        </div>
                      )}
                      {order.paymentIntentId && (
                        <div>
                          <dt className='text-ink-muted'>{t('orders.detail.paymentIntent')}</dt>
                          <dd className='break-all text-ink-muted'>
                            {order.paymentIntentId}
                          </dd>
                        </div>
                      )}
                      {order.refundId && (
                        <div>
                          <dt className='text-ink-muted'>{t('orders.detail.refundId')}</dt>
                          <dd className='break-all text-rose-600'>
                            {order.refundId}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </section>
                )}

                {order.trackingNumber && (
                  <section className=''>
                    <h2 className='mb-4 text-heading text-ink flex items-center gap-2'>
                      <Truck className='h-4 w-4' />
                      {t('orders.detail.tracking')}
                    </h2>
                    <dl className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <dt className='text-ink-muted'>{t('orders.detail.trackingNumber')}</dt>
                        <dd className='font-mono font-medium text-ink'>
                          {order.trackingNumber}
                        </dd>
                      </div>
                      {order.trackingCarrier && (
                        <div className='flex justify-between'>
                          <dt className='text-ink-muted'>{t('orders.detail.carrier')}</dt>
                          <dd className='font-medium text-ink'>
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
                            className='inline-flex items-center gap-1 font-semibold text-ink underline underline-offset-4 hover:text-accent'
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
