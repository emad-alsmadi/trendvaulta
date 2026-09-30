'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useTranslation } from '@/contexts/TranslationContext';
import { useGuestOrder } from '@/hooks/orders/ordersQuery';
import { ordersApi } from '@/lib/api';
import { getUserFacingErrorMessage } from '@/lib/userFacingError';

/**
 * A guest's order (plan P0-03), opened from the checkout success page or
 * the link in every order email: /guest-order?order=…&token=…
 * View, cancel before shipping, invoice. Returns need an account with the
 * same email (decision D5), which also moves this order into it.
 */
function GuestOrderContent() {
  const sp = useSearchParams();
  const orderId = sp.get('order');
  const token = sp.get('token');
  const { t, formatPrice, locale } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const q = useGuestOrder(orderId, token);
  const order = q.data;
  const [canceling, setCanceling] = useState(false);

  if (!orderId || !token || q.isError) {
    return (
      <div className='rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-900'>
        {t('guestOrder.notFound')}
      </div>
    );
  }

  if (q.isLoading || !order) {
    return (
      <div role='status' aria-label={t('common.loading')} className='flex justify-center p-12'>
        <Loader2 className='h-8 w-8 animate-spin text-fuchsia-600 motion-reduce:animate-none' aria-hidden />
      </div>
    );
  }

  const paid = order.paymentStatus === 'paid' || order.paymentStatus === 'refunded';
  const invoiceHref = `/guest-order/invoice?${new URLSearchParams({ order: orderId, token, lang: locale })}`;

  const cancel = () =>
    confirm({
      variant: 'danger',
      title: t('orders.cancel.title'),
      description:
        order.paymentStatus === 'paid'
          ? t('orders.cancel.refundNotice', { amount: formatPrice(order.totalPrice) })
          : t('orders.cancel.noChargeNotice'),
      confirmLabel: t('orders.cancel.confirm'),
      cancelLabel: t('orders.cancel.keep'),
      onConfirm: async () => {
        setCanceling(true);
        try {
          const result = await ordersApi.cancelOrder(orderId, token);
          toast(
            t(result.refunded ? 'orders.cancel.successRefunded' : result.refundPending ? 'orders.cancel.successRefundPending' : 'orders.cancel.success'),
            { variant: 'success' },
          );
          await queryClient.invalidateQueries({ queryKey: ['orders', 'guest', orderId] });
        } catch (err) {
          toast(getUserFacingErrorMessage(err, t('orders.toast.cancelFailed'), t), { variant: 'error' });
        } finally {
          setCanceling(false);
        }
      },
    });

  return (
    <div className='mx-auto max-w-3xl space-y-6 py-6'>
      <section className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'>
        <h1 className='text-2xl font-extrabold text-indigo-950'>
          {t('orders.detail.title', { id: order._id.slice(-8).toUpperCase() })}
        </h1>
        <p className='mt-1 text-sm font-semibold text-indigo-950/70'>
          {t('guestOrder.sentTo', { email: order.guestEmail || '' })}
        </p>
        <div className='mt-3 flex flex-wrap gap-2'>
          <span className='rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800'>
            {t(`orders.status.${order.status}`)}
          </span>
          <span className='rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700'>
            {t('orders.detail.paymentBadge', { status: t(`orders.paymentStatus.${order.paymentStatus}`) })}
          </span>
        </div>
        <div className='mt-4 flex flex-wrap gap-3'>
          {paid && (
            <a
              href={invoiceHref}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1.5 rounded-full border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-white/70'
            >
              <FileText className='h-4 w-4' aria-hidden />
              {t('orders.detail.invoice')}
            </a>
          )}
          {order.canCancel && (
            <Button type='button' variant='outline' size='sm' disabled={canceling} onClick={() => void cancel()}>
              {canceling ? t('orders.cancel.canceling') : t('orders.cancel.button')}
            </Button>
          )}
        </div>
      </section>

      <section className='rounded-3xl border border-white/30 bg-white/40 p-6'>
        <h2 className='mb-3 text-sm font-bold uppercase tracking-wide text-indigo-950/70'>{t('orders.detail.items')}</h2>
        <ul className='divide-y divide-white/50'>
          {order.items.map((item, i) => (
            <li key={`${item.productId}-${i}`} className='flex justify-between gap-4 py-2 text-sm'>
              <span className='font-semibold text-indigo-950'>
                <bdi>{item.title}</bdi> × {item.qty}
              </span>
              <span className='font-bold text-indigo-950'>{formatPrice(item.price * item.qty)}</span>
            </li>
          ))}
        </ul>
        <div className='mt-3 flex justify-between border-t border-white/60 pt-3 text-base font-extrabold text-indigo-950'>
          <span>{t('checkout.total')}</span>
          <span>{formatPrice(order.totalPrice)}</span>
        </div>
      </section>

      {order.returnNeedsAccount && (
        <section className='flex items-start gap-3 rounded-3xl border border-indigo-200 bg-indigo-50/70 p-5'>
          <UserPlus className='mt-0.5 h-5 w-5 shrink-0 text-indigo-700' aria-hidden />
          <p className='text-sm font-semibold text-indigo-950/80'>
            {t('guestOrder.returnNeedsAccount', { email: order.guestEmail || '' })}{' '}
            <Link href='/auth/signup' className='font-extrabold text-indigo-700 underline'>
              {t('guestOrder.createAccount')}
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}

export default function GuestOrderPage() {
  return (
    <Suspense fallback={null}>
      <GuestOrderContent />
    </Suspense>
  );
}
