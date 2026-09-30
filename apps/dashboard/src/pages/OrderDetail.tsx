import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, FileText, Package, Plus } from 'lucide-react';
import {
  useAdminOrderById,
  useUpdateOrderStatusMutation,
  useUpdateOrderTrackingMutation,
} from '../hooks/useAdminOrders';
import {
  adminOrdersApi,
  errorMessage,
  type AdminOrderCustomer,
  type OrderTrackingPayload,
} from '../lib/api';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { ReturnPanel } from '../components/orders/ReturnPanel';
import { usePermissions } from '../hooks/usePermissions';
import { useState } from 'react';
import { useT } from '../i18n/I18nProvider';
import { orderStatusOutcome } from '../lib/orderStatusOutcome';

// Carrier scan statuses staff can add; labels come from tv('trackingEvent').
const TRACKING_EVENTS = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception'];

function customerLabel(user?: string | AdminOrderCustomer) {
  if (!user) return '—';
  if (typeof user === 'string') return user;
  return user.username || user.email || user._id;
}

function variantLabel(
  variant: { size?: string; color?: string; sku?: string } | undefined,
  t: ReturnType<typeof useT>['t'],
) {
  if (!variant) return null;
  const parts = [
    variant.size ? t('orderDetail.variantSize', { value: variant.size }) : null,
    variant.color ? t('orderDetail.variantColor', { value: variant.color }) : null,
    variant.sku ? t('orderDetail.variantSku', { value: variant.sku }) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const { t, tv, formatCurrency, formatDateTime } = useT();
  const money = (n?: number) => formatCurrency(n ?? 0);
  const orderQ = useAdminOrderById(id);
  const order = orderQ.data;
  // Pickup orders carry an address (checkout requires one) but must not be
  // shipped — make that obvious next to the address.
  const isPickup =
    order?.delivery === false || order?.shippingMethod === 'none';
  const fulfilmentLabel = isPickup
    ? t('orderDetail.pickup')
    : order?.shippingMethod
      ? t('orderDetail.delivery', { method: order.shippingMethod })
      : t('orderDetail.fulfilmentUnknown');
  const hasTracking = Boolean(
    order &&
      (order.trackingNumber ||
        order.trackingCarrier ||
        order.trackingUrl ||
        order.trackingEvents?.length),
  );
  const updateTracking = useUpdateOrderTrackingMutation();
  const updateStatus = useUpdateOrderStatusMutation();

  // Same rules as the Orders list: the server decides which transitions are
  // legal, and moving a paid order to canceled/refunded issues a Stripe refund,
  // so that consequence is spelled out before the admin confirms.
  async function onChangeStatus(next: string) {
    if (!order || !next || next === order.status) return;
    const refunds =
      order.paymentStatus === 'paid' &&
      (next === 'canceled' || next === 'refunded');
    const question = t('orderDetail.confirmChange', {
      from: tv('orderStatus', order.status),
      to: tv('orderStatus', next),
    });
    const ok = await confirm({
      message: refunds ? `${question} ${t('orders.refundNote')}` : question,
      confirmLabel: refunds ? t('orderDetail.changeAndRefund') : t('orders.changeStatus'),
      danger: refunds,
    });
    if (!ok) return;
    try {
      const result = await updateStatus.mutateAsync({ id: order._id, status: next });
      // Report what the server actually did — a refund may have needed
      // manual handling rather than being issued.
      const outcome = orderStatusOutcome(result, next, { t, tv });
      toast[outcome.variant](outcome.message);
    } catch (err) {
      toast.error(errorMessage(err, t('orders.updateFailed')));
    }
  }
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackingForm, setTrackingForm] = useState({
    trackingNumber: '',
    trackingCarrier: '',
    trackingUrl: '',
    eventStatus: '',
    eventDescription: '',
    eventLocation: '',
  });

  const handleUpdateTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const tracking: OrderTrackingPayload = {};
    if (trackingForm.trackingNumber)
      tracking.trackingNumber = trackingForm.trackingNumber;
    if (trackingForm.trackingCarrier)
      tracking.trackingCarrier = trackingForm.trackingCarrier;
    if (trackingForm.trackingUrl)
      tracking.trackingUrl = trackingForm.trackingUrl;
    if (trackingForm.eventStatus) {
      tracking.trackingEvent = {
        status: trackingForm.eventStatus,
        description: trackingForm.eventDescription,
        location: trackingForm.eventLocation,
      };
    }

    try {
      await updateTracking.mutateAsync({ id, tracking });
      toast.success(t('orderDetail.trackingUpdated'));
      setShowTrackingForm(false);
      setTrackingForm({
        trackingNumber: '',
        trackingCarrier: '',
        trackingUrl: '',
        eventStatus: '',
        eventDescription: '',
        eventLocation: '',
      });
    } catch (err) {
      toast.error(errorMessage(err, t('orderDetail.trackingFailed')));
    }
  };

  const copyId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('orderDetail.copied'));
    } catch {
      toast.error(t('orderDetail.copyFailed'));
    }
  };

  const hasInvoice =
    order?.paymentStatus === 'paid' || order?.paymentStatus === 'refunded';

  async function openInvoice(lang: 'en' | 'ar') {
    if (!order) return;
    // Open the tab inside the click (popup blockers), fill it once fetched
    const tab = window.open('', '_blank');
    try {
      const html = await adminOrdersApi.getInvoiceHtml(order._id, lang);
      // The document escapes everything and its CSP <meta> forbids scripts,
      // which matters here: a blob: page runs on the dashboard's origin.
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.assign(url);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      // The first view numbers an older paid order: show it here too
      if (!order.invoiceNumber) void orderQ.refetch();
    } catch (err) {
      tab?.close();
      toast.error(errorMessage(err, t('orderDetail.invoiceFailed')));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link
        to='/orders'
        className='mb-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400'
      >
        <ArrowLeft className='h-4 w-4 rtl:-scale-x-100' aria-hidden />
        {t('orderDetail.back')}
      </Link>

      {orderQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          {t('orderDetail.loading')}
        </p>
      )}

      {orderQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(orderQ.error, t('orderDetail.loadFailed'))}
        </div>
      )}

      {order && (
        <div className='space-y-6'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {t('orderDetail.title', { ref: order._id.slice(-8).toUpperCase() })}
                </h1>
                <button
                  type='button'
                  onClick={() => void copyId(order._id)}
                  aria-label={t('orderDetail.copyId')}
                  className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700'
                >
                  <Copy className='h-4 w-4' />
                </button>
              </div>
              {order.createdAt && (
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                  {t('orderDetail.placed', { date: formatDateTime(order.createdAt) })}
                </p>
              )}
              {hasInvoice && (
                <div className='mt-3 flex flex-wrap items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => void openInvoice('en')}
                    className='inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
                  >
                    <FileText className='h-4 w-4' aria-hidden='true' />
                    {t('orderDetail.invoice')}
                  </button>
                  <button
                    type='button'
                    lang='ar'
                    onClick={() => void openInvoice('ar')}
                    aria-label={t('orderDetail.invoiceArabic')}
                    className='rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
                  >
                    عربي
                  </button>
                  {order.invoiceNumber && (
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      {order.invoiceNumber}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className='flex flex-wrap gap-2'>
              <span className='inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'>
                {tv('orderStatus', order.status)}
              </span>
              <span className='inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200'>
                {t('orderDetail.paymentBadge', { status: tv('paymentStatus', order.paymentStatus) })}
              </span>
              {order.attentionReason && (
                <span className='inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'>
                  {tv('attentionReason', order.attentionReason)}
                </span>
              )}
              {can('orders:write') &&
                (order.allowedNextStatuses?.length ?? 0) > 0 && (
                  <select
                    value=''
                    disabled={updateStatus.isPending}
                    aria-label={t('orderDetail.changeStatusLabel')}
                    onChange={(e) => void onChangeStatus(e.target.value)}
                    className='rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  >
                    <option value=''>
                      {updateStatus.isPending ? t('orderDetail.updating') : t('orderDetail.changeStatusPlaceholder')}
                    </option>
                    {order.allowedNextStatuses?.map((s) => (
                      <option key={s} value={s}>
                        {tv('orderStatus', s)}
                      </option>
                    ))}
                  </select>
                )}
            </div>
          </div>

          <div className='grid gap-6 lg:grid-cols-3'>
            <div className='lg:col-span-2 space-y-6'>
              <ReturnPanel key={order.returnRequest?.status ?? 'none'} order={order} />
              <section className='rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'>
                <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                  {t('orderDetail.items')}
                </h2>
                <ul className='divide-y divide-gray-100 dark:divide-gray-700'>
                  {order.items.map((item, i) => (
                    <li
                      key={`${item.productId}-${i}`}
                      className='flex items-center gap-3 py-3 first:pt-0 last:pb-0'
                    >
                      {item.cover ? (
                        <img
                          src={item.cover}
                          alt={item.title}
                          className='h-14 w-14 shrink-0 rounded-lg bg-gray-100 object-cover'
                        />
                      ) : (
                        <div className='h-14 w-14 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700' />
                      )}
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-medium text-gray-900 dark:text-white'>
                          {item.title}
                        </p>
                        {variantLabel(item.variant, t) && (
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            {variantLabel(item.variant, t)}
                          </p>
                        )}
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          {t('orderDetail.qtyTimesPrice', { qty: item.qty, price: money(item.price) })}
                        </p>
                      </div>
                      <p className='shrink-0 text-sm font-semibold text-gray-900 dark:text-white'>
                        {money(item.price * item.qty)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className='rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'>
                <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                  {t('orderDetail.shippingAddress')}
                </h2>
                <dl className='grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2'>
                  <div className='sm:col-span-2'>
                    <dt className='text-gray-500 dark:text-gray-400'>
                      {t('orderDetail.fulfilment')}
                    </dt>
                    <dd
                      className={
                        isPickup
                          ? 'font-semibold text-amber-700 dark:text-amber-400'
                          : 'font-medium text-gray-900 dark:text-white'
                      }
                    >
                      {fulfilmentLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-gray-500 dark:text-gray-400'>{t('orderDetail.name')}</dt>
                    <dd className='font-medium text-gray-900 dark:text-white'>
                      {order.shippingAddress?.name || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-gray-500 dark:text-gray-400'>{t('orderDetail.phone')}</dt>
                    <dd className='font-medium text-gray-900 dark:text-white' dir='ltr'>
                      {order.shippingAddress?.phone || '—'}
                    </dd>
                  </div>
                  <div className='sm:col-span-2'>
                    <dt className='text-gray-500 dark:text-gray-400'>
                      {t('orderDetail.address')}
                    </dt>
                    <dd className='font-medium text-gray-900 dark:text-white'>
                      {order.shippingAddress?.address || '—'},{' '}
                      {order.shippingAddress?.city || '—'}{' '}
                      {order.shippingAddress?.zip || ''}
                      {order.shippingAddress?.country
                        ? `, ${order.shippingAddress.country}`
                        : ''}
                    </dd>
                  </div>
                  {order.shippingAddress?.notes && (
                    <div className='sm:col-span-2'>
                      <dt className='text-gray-500 dark:text-gray-400'>
                        {t('orderDetail.notes')}
                      </dt>
                      <dd className='font-medium text-gray-900 dark:text-white'>
                        {order.shippingAddress.notes}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            <div className='space-y-6'>
              <section className='rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'>
                <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                  {t('orderDetail.customer')}
                </h2>
                <p className='text-sm font-medium text-gray-900 dark:text-white'>
                  {!order.user && order.guestEmail
                    ? t('orders.guestCustomer', { email: order.guestEmail })
                    : customerLabel(order.user ?? undefined)}
                </p>
                {typeof order.user === 'object' && order.user?.email && (
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    {order.user.email}
                  </p>
                )}
              </section>

              <section className='rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'>
                <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                  {t('orderDetail.totals')}
                </h2>
                <dl className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <dt className='text-gray-500 dark:text-gray-400'>{t('orderDetail.itemsTotal')}</dt>
                    <dd className='text-gray-900 dark:text-white'>
                      {money(order.itemsPrice)}
                    </dd>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className='flex justify-between'>
                      <dt className='text-gray-500 dark:text-gray-400'>
                        {t('orderDetail.discount')}{' '}
                        {order.couponCode ? `(${order.couponCode})` : ''}
                      </dt>
                      <dd className='text-gray-900 dark:text-white'>
                        -{money(order.discountAmount)}
                      </dd>
                    </div>
                  )}
                  <div className='flex justify-between'>
                    <dt className='text-gray-500 dark:text-gray-400'>
                      {t('orderDetail.shipping')}
                    </dt>
                    <dd className='text-gray-900 dark:text-white'>
                      {money(order.shippingPrice)}
                    </dd>
                  </div>
                  <div className='flex justify-between'>
                    <dt className='text-gray-500 dark:text-gray-400'>{t('orderDetail.tax')}</dt>
                    <dd className='text-gray-900 dark:text-white'>
                      {money(order.taxPrice)}
                    </dd>
                  </div>
                  <div className='flex justify-between border-t border-gray-100 pt-2 font-semibold dark:border-gray-700'>
                    <dt className='text-gray-900 dark:text-white'>{t('orderDetail.total')}</dt>
                    <dd className='text-gray-900 dark:text-white'>
                      {money(order.totalPrice)}
                    </dd>
                  </div>
                  {order.refundAmount ? (
                    <div className='flex justify-between text-red-600 dark:text-red-400'>
                      <dt>{t('orderDetail.refunded')}</dt>
                      <dd>-{money(order.refundAmount)}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              {(order.stripeSessionId ||
                order.paymentIntentId ||
                order.refundId) && (
                <section className='rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'>
                  <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                    {t('orderDetail.paymentRefs')}
                  </h2>
                  <dl className='space-y-2 text-xs'>
                    {order.stripeSessionId && (
                      <div>
                        <dt className='text-gray-500 dark:text-gray-400'>
                          {t('orderDetail.checkoutSession')}
                        </dt>
                        <dd className='break-all font-mono text-gray-700 dark:text-gray-300'>
                          {order.stripeSessionId}
                        </dd>
                      </div>
                    )}
                    {order.paymentIntentId && (
                      <div>
                        <dt className='text-gray-500 dark:text-gray-400'>
                          {t('orderDetail.paymentIntent')}
                        </dt>
                        <dd className='break-all font-mono text-gray-700 dark:text-gray-300'>
                          {order.paymentIntentId}
                        </dd>
                      </div>
                    )}
                    {order.refundId && (
                      <div>
                        <dt className='text-gray-500 dark:text-gray-400'>
                          {t('orderDetail.refundId')}
                        </dt>
                        <dd className='break-all font-mono text-gray-700 dark:text-gray-300'>
                          {order.refundId}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              {/* Staff who can write orders always see the editor — tracking
                  has to be addable to an order that has none yet. */}
              {(hasTracking || can('orders:write')) && (
                <section className='rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'>
                  <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                    {t('orderDetail.tracking')}
                  </h2>
                  {!hasTracking && (
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                      {t('orderDetail.noTracking')}
                    </p>
                  )}
                  <dl className='space-y-2 text-sm'>
                    {order.trackingNumber && (
                      <div>
                        <dt className='text-gray-500 dark:text-gray-400'>
                          {t('orderDetail.trackingNumber')}
                        </dt>
                        <dd className='font-mono text-gray-900 dark:text-white'>
                          {order.trackingNumber}
                        </dd>
                      </div>
                    )}
                    {order.trackingCarrier && (
                      <div>
                        <dt className='text-gray-500 dark:text-gray-400'>
                          {t('orderDetail.carrier')}
                        </dt>
                        <dd className='font-medium text-gray-900 dark:text-white'>
                          {order.trackingCarrier}
                        </dd>
                      </div>
                    )}
                    {order.trackingUrl && (
                      <div>
                        <dt className='text-gray-500 dark:text-gray-400'>
                          {t('orderDetail.trackingUrl')}
                        </dt>
                        <dd>
                          <a
                            href={order.trackingUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='font-medium text-blue-600 hover:underline dark:text-blue-400'
                          >
                            {t('orderDetail.viewTracking')}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                  {order.trackingEvents && order.trackingEvents.length > 0 && (
                    <div className='mt-4'>
                      <h3 className='mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400'>
                        {t('orderDetail.trackingEvents')}
                      </h3>
                      <ul className='space-y-2 text-xs'>
                        {order.trackingEvents.map((event, i) => (
                          <li
                            key={i}
                            className='rounded bg-gray-50 p-2 dark:bg-gray-700'
                          >
                            <div className='flex items-center justify-between gap-2'>
                              <span className='font-medium text-gray-900 dark:text-white'>
                                {tv('trackingEvent', event.status)}
                              </span>
                              <span className='text-gray-500 dark:text-gray-400'>
                                {event.timestamp ? formatDateTime(event.timestamp) : '—'}
                              </span>
                            </div>
                            {event.description && (
                              <p className='mt-1 text-gray-600 dark:text-gray-300'>
                                {event.description}
                              </p>
                            )}
                            {event.location && (
                              <p className='mt-1 text-gray-500 dark:text-gray-400'>
                                {event.location}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {can('orders:write') && (
                    <button
                      type='button'
                      onClick={() => setShowTrackingForm(!showTrackingForm)}
                      className='mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400'
                    >
                      <Plus className='h-4 w-4' aria-hidden />
                      {showTrackingForm
                        ? t('common.cancel')
                        : hasTracking
                          ? t('orderDetail.updateTracking')
                          : t('orderDetail.addTracking')}
                    </button>
                  )}
                  {can('orders:write') && showTrackingForm && (
                    <form
                      onSubmit={handleUpdateTracking}
                      className='mt-4 space-y-3'
                    >
                      <div>
                        <label htmlFor='order-tracking-number' className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                          {t('orderDetail.trackingNumber')}
                        </label>
                        <input
                          id='order-tracking-number'
                          type='text'
                          value={trackingForm.trackingNumber}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              trackingNumber: e.target.value,
                            })
                          }
                          className='w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                          placeholder={t('orderDetail.trackingNumberPlaceholder')}
                          dir='ltr'
                        />
                      </div>
                      <div>
                        <label htmlFor='order-carrier' className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                          {t('orderDetail.carrier')}
                        </label>
                        <input
                          id='order-carrier'
                          type='text'
                          value={trackingForm.trackingCarrier}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              trackingCarrier: e.target.value,
                            })
                          }
                          className='w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                          placeholder={t('orderDetail.carrierPlaceholder')}
                        />
                      </div>
                      <div>
                        <label htmlFor='order-tracking-url' className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                          {t('orderDetail.trackingUrl')}
                        </label>
                        <input
                          id='order-tracking-url'
                          type='url'
                          value={trackingForm.trackingUrl}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              trackingUrl: e.target.value,
                            })
                          }
                          className='w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                          placeholder='https://...'
                          dir='ltr'
                        />
                      </div>
                      <div className='border-t border-gray-200 pt-3 dark:border-gray-700'>
                        <label htmlFor='order-add-tracking-event-optional' className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                          {t('orderDetail.addEvent')}
                        </label>
                        <select
                          id='order-add-tracking-event-optional'
                          value={trackingForm.eventStatus}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              eventStatus: e.target.value,
                            })
                          }
                          className='mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                        >
                          <option value=''>{t('orderDetail.selectEventStatus')}</option>
                          {TRACKING_EVENTS.map((value) => (
                            <option key={value} value={value}>
                              {tv('trackingEvent', value)}
                            </option>
                          ))}
                        </select>
                        <input
                          type='text'
                          value={trackingForm.eventDescription}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              eventDescription: e.target.value,
                            })
                          }
                          className='mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                          placeholder={t('orderDetail.eventDescription')}
                        />
                        <input
                          type='text'
                          value={trackingForm.eventLocation}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              eventLocation: e.target.value,
                            })
                          }
                          className='w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                          placeholder={t('orderDetail.eventLocation')}
                        />
                      </div>
                      <button
                        type='submit'
                        disabled={updateTracking.isPending}
                        className='inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        <Package className='h-4 w-4' aria-hidden />
                        {updateTracking.isPending
                          ? t('orderDetail.updating')
                          : t('orderDetail.updateTracking')}
                      </button>
                    </form>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
