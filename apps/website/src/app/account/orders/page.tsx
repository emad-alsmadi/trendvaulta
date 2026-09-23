'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useMyOrders } from '@/hooks/orders/ordersQuery';
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
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function OrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const ordersQuery = useMyOrders();
  const { t, formatPrice, locale } = useTranslation();

  if (!getAuthToken()) {
    router.push('/auth/login');
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
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
              <Package className='h-4 w-4 text-fuchsia-700' />
              {t('orders.badge')}
            </div>
            <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
              {t('common.orders')}
            </h1>
            <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
              {t('orders.subtitle')}
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => ordersQuery.refetch()}
            disabled={ordersQuery.isFetching}
          >
            <RefreshCw className={`me-2 h-4 w-4 ${ordersQuery.isFetching ? 'animate-spin' : ''}`} />
            {t('orders.refresh')}
          </Button>
        </div>
      </motion.div>

      {ordersQuery.isLoading && (
        <div className='flex items-center justify-center py-12'>
          <div className='h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent' />
        </div>
      )}

      {ordersQuery.isError && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className='rounded-3xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950/30'
        >
          <div className='flex items-center gap-3'>
            <AlertCircle className='h-6 w-6 text-rose-600 dark:text-rose-400' />
            <div>
              <p className='font-bold text-rose-800 dark:text-rose-200'>{t('orders.loadError')}</p>
              <p className='text-sm text-rose-700 dark:text-rose-300'>
                {t('orders.loadErrorHint')}
              </p>
            </div>
          </div>
          <Button
            className='mt-4'
            variant='outline'
            onClick={() => ordersQuery.refetch()}
          >
            <RefreshCw className='me-2 h-4 w-4' />
            {t('orders.retry')}
          </Button>
        </motion.div>
      )}

      {!ordersQuery.isLoading && !ordersQuery.isError && ordersQuery.data?.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className='rounded-3xl border border-white/30 bg-white/35 p-12 text-center shadow-sm backdrop-blur-xl'
        >
          <Package className='mx-auto h-12 w-12 text-indigo-950/30' />
          <h2 className='mt-4 text-xl font-bold text-indigo-950'>{t('orders.emptyTitle')}</h2>
          <p className='mt-2 text-sm text-indigo-950/70'>
            {t('orders.emptyDescription')}
          </p>
          <Link href='/products' className='mt-6 inline-block'>
            <Button size='lg'>
              <Package className='me-2 h-4 w-4' />
              {t('orders.startShopping')}
            </Button>
          </Link>
        </motion.div>
      )}

      {!ordersQuery.isLoading && !ordersQuery.isError && ordersQuery.data && ordersQuery.data.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className='rounded-3xl border border-white/30 bg-white/35 shadow-sm backdrop-blur-xl overflow-hidden'
        >
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-indigo-950/5'>
                <tr className='border-b border-white/30'>
                  <th className='px-4 py-3 text-start text-xs font-medium uppercase tracking-wider text-indigo-950/70'>
                    {t('orders.table.order')}
                  </th>
                  <th className='px-4 py-3 text-start text-xs font-medium uppercase tracking-wider text-indigo-950/70'>
                    {t('orders.table.date')}
                  </th>
                  <th className='px-4 py-3 text-start text-xs font-medium uppercase tracking-wider text-indigo-950/70'>
                    {t('orders.table.status')}
                  </th>
                  <th className='px-4 py-3 text-start text-xs font-medium uppercase tracking-wider text-indigo-950/70'>
                    {t('orders.table.payment')}
                  </th>
                  <th className='px-4 py-3 text-start text-xs font-medium uppercase tracking-wider text-indigo-950/70'>
                    {t('checkout.total')}
                  </th>
                  <th className='px-4 py-3 text-end text-xs font-medium uppercase tracking-wider text-indigo-950/70'>
                    {t('orders.table.action')}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-white/30'>
                {ordersQuery.data.map((order: Order) => (
                  <tr key={order._id} className='hover:bg-indigo-950/5 transition-colors'>
                    <td className='px-4 py-4'>
                      <Link
                        href={`/account/orders/${order._id}`}
                        className='font-mono text-sm font-semibold text-indigo-950 hover:underline'
                      >
                        #{order._id.slice(-8).toUpperCase()}
                      </Link>
                      <p className='mt-1 text-xs text-indigo-950/50'>
                        {t('orders.itemCount', { count: order.items.length })}
                      </p>
                    </td>
                    <td className='px-4 py-4 text-sm text-indigo-950/70'>
                      {formatDate(order.createdAt, intlLocale(locale))}
                    </td>
                    <td className='px-4 py-4'>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(order.status)}`}>
                        {STATUS_LABELS[order.status]
                          ? t(STATUS_LABELS[order.status])
                          : order.status}
                      </span>
                      {order.attentionReason && (
                        <span className='ms-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200'>
                          {ATTENTION_REASON_LABELS[order.attentionReason]
                            ? t(ATTENTION_REASON_LABELS[order.attentionReason])
                            : order.attentionReason.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>
                    <td className='px-4 py-4'>
                      <span className='inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200'>
                        {order.paymentStatus
                          ? PAYMENT_STATUS_LABELS[order.paymentStatus]
                            ? t(PAYMENT_STATUS_LABELS[order.paymentStatus])
                            : order.paymentStatus
                          : '—'}
                      </span>
                      {order.paymentStatus === 'refunded' && (order.refundAmount ?? 0) > 0 && (
                        <span className='ms-1 block text-xs text-rose-600 dark:text-rose-400'>
                          {t('orders.refundedAmount', {
                            amount: formatPrice(order.refundAmount ?? 0),
                          })}
                        </span>
                      )}
                    </td>
                    <td className='px-4 py-4 font-semibold text-indigo-950'>
                      {formatPrice(order.totalPrice)}
                    </td>
                    <td className='px-4 py-4 text-end'>
                      <Link
                        href={`/account/orders/${order._id}`}
                        className='inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300'
                      >
                        {t('orders.view')}
                        <RefreshCw className='h-3.5 w-3.5' />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}