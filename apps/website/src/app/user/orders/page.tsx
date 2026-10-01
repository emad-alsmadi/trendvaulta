'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Package, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useMyOrders } from '@/hooks/orders/ordersQuery';
import type { Order } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';
import { intlLocale } from '@/lib/locale';
import { ListSkeleton } from '@/components/ui/Skeleton';
import {
  ATTENTION_REASON_LABELS,
  PAYMENT_STATUS_LABELS,
  STATUS_LABELS,
  statusBadgeClass,
} from '@/lib/orderStatus';
import { PANEL, PILL, UserEmptyState, UserPageHeader } from '../UserPage';

function formatDate(dateString: string | undefined, locale: string) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function OrdersPage() {
  const ordersQuery = useMyOrders();
  const { t, formatPrice, locale } = useTranslation();
  const orders = ordersQuery.data ?? [];
  const ready = !ordersQuery.isLoading && !ordersQuery.isError;

  return (
    <div className='space-y-6'>
      <UserPageHeader
        title={t('common.orders')}
        subtitle={t('orders.subtitle')}
        action={
          <button
            type='button'
            onClick={() => ordersQuery.refetch()}
            disabled={ordersQuery.isFetching}
            className='inline-flex items-center gap-2 rounded-full bg-stone-200/60 px-4 py-2.5 text-sm font-semibold text-ink transition-colors duration-(--dur-fast) hover:bg-ink hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 disabled:pointer-events-none disabled:opacity-60'
          >
            <RefreshCw
              className={`h-4 w-4 ${ordersQuery.isFetching ? 'animate-spin' : ''}`}
              aria-hidden
            />
            {t('orders.refresh')}
          </button>
        }
      />

      {ordersQuery.isLoading && <ListSkeleton rows={3} />}

      {ordersQuery.isError && (
        <div className={`${PANEL} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
          <div className='flex items-start gap-3'>
            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600'>
              <AlertCircle className='h-5 w-5' aria-hidden />
            </span>
            <div>
              <p className='font-semibold text-ink'>{t('orders.loadError')}</p>
              <p className='mt-0.5 text-sm text-ink-muted'>
                {t('orders.loadErrorHint')}
              </p>
            </div>
          </div>
          <Button
            variant='solid'
            size='sm'
            className='rounded-full'
            onClick={() => ordersQuery.refetch()}
          >
            <RefreshCw className='h-4 w-4' aria-hidden />
            {t('orders.retry')}
          </Button>
        </div>
      )}

      {ready && orders.length === 0 && (
        <UserEmptyState
          icon={<Package className='h-6 w-6' strokeWidth={1.5} aria-hidden />}
          title={t('orders.emptyTitle')}
          description={t('orders.emptyDescription')}
          action={
            <Link
              href='/products'
              className='inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-bold text-white shadow-soft transition-colors hover:bg-stone-800'
            >
              {t('orders.startShopping')}
            </Link>
          }
        />
      )}

      {ready && orders.length > 0 && (
        <motion.ul
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className='space-y-1'
        >
          {orders.map((order: Order) => {
            const paymentLabel = order.paymentStatus
              ? PAYMENT_STATUS_LABELS[order.paymentStatus]
                ? t(PAYMENT_STATUS_LABELS[order.paymentStatus])
                : order.paymentStatus
              : null;
            return (
              <li key={order._id}>
                <Link
                  href={`/user/orders/${order._id}`}
                  aria-label={`${t('orders.view')} #${order._id.slice(-8).toUpperCase()}`}
                  className='group -mx-3 flex flex-col gap-4 rounded-panel px-3 py-4 transition-colors duration-(--dur-fast) hover:bg-stone-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 sm:flex-row sm:items-center sm:justify-between'
                >
                  <div className='flex min-w-0 items-center gap-4'>
                    <span className='hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stone-200/60 text-ink sm:flex'>
                      <Package className='h-5 w-5' strokeWidth={1.5} aria-hidden />
                    </span>
                    <div className='min-w-0'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span
                          className='font-mono text-sm font-semibold text-ink'
                          dir='ltr'
                        >
                          #{order._id.slice(-8).toUpperCase()}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(order.status)}`}
                        >
                          {STATUS_LABELS[order.status]
                            ? t(STATUS_LABELS[order.status])
                            : order.status}
                        </span>
                        {order.attentionReason && (
                          <span className='inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800'>
                            {ATTENTION_REASON_LABELS[order.attentionReason]
                              ? t(ATTENTION_REASON_LABELS[order.attentionReason])
                              : order.attentionReason.replace(/_/g, ' ')}
                          </span>
                        )}
                        {paymentLabel && <span className={PILL}>{paymentLabel}</span>}
                      </div>
                      <p className='mt-2 text-sm text-ink-muted'>
                        {formatDate(order.createdAt, intlLocale(locale))}
                        <span aria-hidden className='mx-2 text-ink-subtle'>
                          ·
                        </span>
                        {t('orders.itemCount', { count: order.items.length })}
                      </p>
                      {order.paymentStatus === 'refunded' &&
                        (order.refundAmount ?? 0) > 0 && (
                          <p className='mt-1 text-xs font-medium text-rose-600'>
                            {t('orders.refundedAmount', {
                              amount: formatPrice(order.refundAmount ?? 0),
                            })}
                          </p>
                        )}
                    </div>
                  </div>

                  <div className='flex items-center justify-between gap-5 sm:justify-end'>
                    <span className='text-lg font-semibold tabular-nums text-ink'>
                      {formatPrice(order.totalPrice)}
                    </span>
                    <span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-200/60 text-ink transition-colors duration-(--dur-fast) group-hover:bg-ink group-hover:text-white'>
                      <ArrowRight className='h-4 w-4 rtl:-scale-x-100' aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}
