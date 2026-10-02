import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  CreditCard,
  FileText,
  MapPin,
  Package,
  Pencil,
  Receipt,
  Store,
  Truck,
  User,
  X,
} from 'lucide-react';
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
import { useT } from '../i18n/I18nProvider';
import { orderStatusOutcome } from '../lib/orderStatusOutcome';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Card, CardHeader, KeyValue } from '../components/ui/Card';
import { Field, Input, Select } from '../components/ui/Field';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Thumbnail } from '../components/ui/Table';
import { buttonVariants, text } from '../components/ui/styles';
import { cn } from '../lib/cn';

// Carrier scan statuses staff can add; labels come from tv('trackingEvent').
const TRACKING_EVENTS = [
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'exception',
];

const emptyTracking = {
  trackingNumber: '',
  trackingCarrier: '',
  trackingUrl: '',
  eventStatus: '',
  eventDescription: '',
  eventLocation: '',
};

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
    variant.color
      ? t('orderDetail.variantColor', { value: variant.color })
      : null,
    variant.sku ? t('orderDetail.variantSku', { value: variant.sku }) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** Placeholder in the page's own two-column shape. */
function OrderDetailSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <Skeleton
          variant='custom'
          className='h-8 w-56 rounded-control'
        />
        <Skeleton className='w-40' />
      </div>
      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>
          {[0, 1].map((i) => (
            <Card
              key={i}
              className='space-y-4'
            >
              <Skeleton className='w-24' />
              {[0, 1, 2].map((r) => (
                <div
                  key={r}
                  className='flex items-center gap-3'
                >
                  <Skeleton variant='thumbnail' />
                  <div className='flex-1 space-y-2'>
                    <Skeleton className='w-1/2' />
                    <Skeleton className='w-1/4' />
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </div>
        <div className='space-y-6'>
          {[0, 1].map((i) => (
            <Card
              key={i}
              className='space-y-3'
            >
              <Skeleton className='w-20' />
              <Skeleton />
              <Skeleton className='w-2/3' />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
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
      confirmLabel: refunds
        ? t('orderDetail.changeAndRefund')
        : t('orders.changeStatus'),
      danger: refunds,
    });
    if (!ok) return;
    try {
      const result = await updateStatus.mutateAsync({
        id: order._id,
        status: next,
      });
      // Report what the server actually did — a refund may have needed
      // manual handling rather than being issued.
      const outcome = orderStatusOutcome(result, next, { t, tv });
      toast[outcome.variant](outcome.message);
    } catch (err) {
      toast.error(errorMessage(err, t('orders.updateFailed')));
    }
  }
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackingForm, setTrackingForm] = useState(emptyTracking);

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
      setTrackingForm(emptyTracking);
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

  const setTracking = (patch: Partial<typeof emptyTracking>) =>
    setTrackingForm((f) => ({ ...f, ...patch }));

  return (
    <>
      <Link
        to='/orders'
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          '-ms-3 mb-4 text-muted-foreground hover:text-foreground',
        )}
      >
        <ArrowLeft
          className='rtl:-scale-x-100'
          aria-hidden
        />
        {t('orderDetail.back')}
      </Link>

      {orderQ.isLoading && <OrderDetailSkeleton />}

      {orderQ.isError && (
        <Alert tone='error'>
          {errorMessage(orderQ.error, t('orderDetail.loadFailed'))}
        </Alert>
      )}

      {order && (
        <div className='space-y-6'>
          {/* Header: reference, when, where it stands, what to do next */}
          <header className='flex flex-wrap items-start justify-between gap-4'>
            <div className='min-w-0 space-y-2'>
              <div className='flex items-center gap-1'>
                <h1 className={text.pageTitle}>
                  {t('orderDetail.title', {
                    ref: order._id.slice(-8).toUpperCase(),
                  })}
                </h1>
                <IconButton
                  icon={<Copy aria-hidden />}
                  label={t('orderDetail.copyId')}
                  onClick={() => void copyId(order._id)}
                />
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <StatusBadge status={order.status}>
                  {tv('orderStatus', order.status)}
                </StatusBadge>
                <StatusBadge status={order.paymentStatus}>
                  {t('orderDetail.paymentBadge', {
                    status: tv('paymentStatus', order.paymentStatus),
                  })}
                </StatusBadge>
                {order.attentionReason && (
                  <StatusBadge
                    status={order.attentionReason}
                    tone='attention'
                  >
                    {tv('attentionReason', order.attentionReason)}
                  </StatusBadge>
                )}
                {order.createdAt && (
                  <span className='text-body-sm text-muted-foreground'>
                    {t('orderDetail.placed', {
                      date: formatDateTime(order.createdAt),
                    })}
                  </span>
                )}
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              {hasInvoice && (
                <div className='flex items-center'>
                  <Button
                    onClick={() => void openInvoice('en')}
                    icon={<FileText aria-hidden='true' />}
                    className='rounded-e-none'
                  >
                    {t('orderDetail.invoice')}
                  </Button>
                  <Button
                    lang='ar'
                    onClick={() => void openInvoice('ar')}
                    aria-label={t('orderDetail.invoiceArabic')}
                    className='-ms-px rounded-s-none'
                  >
                    عربي
                  </Button>
                </div>
              )}
              {can('orders:write') &&
                (order.allowedNextStatuses?.length ?? 0) > 0 && (
                  <Select
                    value=''
                    disabled={updateStatus.isPending}
                    aria-label={t('orderDetail.changeStatusLabel')}
                    placeholder={
                      updateStatus.isPending
                        ? t('orderDetail.updating')
                        : t('orderDetail.changeStatusPlaceholder')
                    }
                    onChange={(e) => void onChangeStatus(e.target.value)}
                    wrapperClassName='w-48'
                    className='border-foreground font-medium data-[placeholder]:text-foreground'
                    options={(order.allowedNextStatuses ?? []).map((s) => ({
                      value: s,
                      label: tv('orderStatus', s),
                    }))}
                  />
                )}
            </div>
          </header>
          {order.invoiceNumber && hasInvoice && (
            <p className='-mt-3 flex items-center gap-1.5 text-xs text-muted-foreground'>
              <Receipt
                className='size-3.5'
                aria-hidden
              />
              <span className='font-mono'>{order.invoiceNumber}</span>
            </p>
          )}

          <div className='grid items-start gap-6 lg:grid-cols-3'>
            {/* Main column */}
            <div className='space-y-6 lg:col-span-2'>
              <ReturnPanel
                key={order.returnRequest?.status ?? 'none'}
                order={order}
              />

              <Card padded={false}>
                <div className='p-5 pb-0 sm:p-6 sm:pb-0'>
                  <CardHeader
                    icon={<Package />}
                    title={t('orderDetail.items')}
                  />
                </div>
                <ul className='divide-y divide-border border-t border-border'>
                  {order.items.map((item, i) => (
                    <li
                      key={`${item.productId}-${i}`}
                      className='flex items-center gap-4 px-5 py-3 sm:px-6'
                    >
                      <Thumbnail
                        src={item.cover}
                        alt={item.title}
                        className='size-14'
                      />
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-medium text-foreground'>
                          {item.title}
                        </p>
                        {variantLabel(item.variant, t) && (
                          <p className='text-xs text-muted-foreground'>
                            {variantLabel(item.variant, t)}
                          </p>
                        )}
                        <p className='text-xs tabular-nums text-muted-foreground'>
                          {t('orderDetail.qtyTimesPrice', {
                            qty: item.qty,
                            price: money(item.price),
                          })}
                        </p>
                      </div>
                      <p className='shrink-0 text-sm font-semibold tabular-nums text-foreground'>
                        {money(item.price * item.qty)}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <CardHeader
                  icon={<MapPin />}
                  title={t('orderDetail.shippingAddress')}
                />
                <div
                  className={cn(
                    'mb-4 flex items-center gap-2 rounded-badge border px-3 py-2 text-sm',
                    isPickup
                      ? 'border-2 border-foreground font-semibold text-foreground'
                      : 'border-border bg-muted/60 text-foreground',
                  )}
                >
                  {isPickup ? (
                    <Store
                      className='size-4 shrink-0'
                      aria-hidden
                    />
                  ) : (
                    <Truck
                      className='size-4 shrink-0'
                      aria-hidden
                    />
                  )}
                  <span>
                    <span className='sr-only'>
                      {t('orderDetail.fulfilment')}:{' '}
                    </span>
                    {fulfilmentLabel}
                  </span>
                </div>
                <dl className='grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2'>
                  <div className='space-y-0.5'>
                    <dt className={text.caption}>{t('orderDetail.name')}</dt>
                    <dd className='font-medium text-foreground'>
                      {order.shippingAddress?.name || '—'}
                    </dd>
                  </div>
                  <div className='space-y-0.5'>
                    <dt className={text.caption}>{t('orderDetail.phone')}</dt>
                    <dd
                      className='font-medium text-foreground'
                      dir='ltr'
                    >
                      {order.shippingAddress?.phone || '—'}
                    </dd>
                  </div>
                  <div className='space-y-0.5 sm:col-span-2'>
                    <dt className={text.caption}>
                      {t('orderDetail.address')}
                    </dt>
                    <dd className='font-medium text-foreground'>
                      {order.shippingAddress?.address || '—'},{' '}
                      {order.shippingAddress?.city || '—'}{' '}
                      {order.shippingAddress?.zip || ''}
                      {order.shippingAddress?.country
                        ? `, ${order.shippingAddress.country}`
                        : ''}
                    </dd>
                  </div>
                  {order.shippingAddress?.notes && (
                    <div className='space-y-0.5 sm:col-span-2'>
                      <dt className={text.caption}>
                        {t('orderDetail.notes')}
                      </dt>
                      <dd className='font-medium text-foreground'>
                        {order.shippingAddress.notes}
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>
            </div>

            {/* Sidebar: who, how much, payment, tracking */}
            <div className='space-y-6 lg:sticky lg:top-[5.5rem]'>
              <Card>
                <CardHeader
                  icon={<User />}
                  title={t('orderDetail.customer')}
                />
                <div className='flex items-center gap-3'>
                  <span
                    aria-hidden
                    className='flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold uppercase text-muted-foreground'
                  >
                    {(customerLabel(order.user ?? undefined) || '?').charAt(0)}
                  </span>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium text-foreground'>
                      {!order.user && order.guestEmail
                        ? t('orders.guestCustomer', { email: order.guestEmail })
                        : customerLabel(order.user ?? undefined)}
                    </p>
                    {typeof order.user === 'object' && order.user?.email && (
                      <p
                        className='truncate text-xs text-muted-foreground'
                        dir='ltr'
                      >
                        {order.user.email}
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader
                  icon={<Receipt />}
                  title={t('orderDetail.totals')}
                />
                <dl className='divide-y divide-border'>
                  <KeyValue label={t('orderDetail.itemsTotal')}>
                    {money(order.itemsPrice)}
                  </KeyValue>
                  {order.discountAmount > 0 && (
                    <KeyValue
                      label={
                        <>
                          {t('orderDetail.discount')}{' '}
                          {order.couponCode ? (
                            <span className='font-mono'>
                              ({order.couponCode})
                            </span>
                          ) : null}
                        </>
                      }
                    >
                      −{money(order.discountAmount)}
                    </KeyValue>
                  )}
                  <KeyValue label={t('orderDetail.shipping')}>
                    {money(order.shippingPrice)}
                  </KeyValue>
                  <KeyValue label={t('orderDetail.tax')}>
                    {money(order.taxPrice)}
                  </KeyValue>
                  <div className='flex items-baseline justify-between gap-4 pt-3'>
                    <dt className='text-sm font-semibold text-foreground'>
                      {t('orderDetail.total')}
                    </dt>
                    <dd className='text-section tabular-nums text-foreground'>
                      {money(order.totalPrice)}
                    </dd>
                  </div>
                  {order.refundAmount ? (
                    <KeyValue label={t('orderDetail.refunded')}>
                      −{money(order.refundAmount)}
                    </KeyValue>
                  ) : null}
                </dl>
              </Card>

              {(order.stripeSessionId ||
                order.paymentIntentId ||
                order.refundId) && (
                <Card>
                  <CardHeader
                    icon={<CreditCard />}
                    title={t('orderDetail.paymentRefs')}
                  />
                  <dl className='space-y-3 text-xs'>
                    {(
                      [
                        ['orderDetail.checkoutSession', order.stripeSessionId],
                        ['orderDetail.paymentIntent', order.paymentIntentId],
                        ['orderDetail.refundId', order.refundId],
                      ] as const
                    )
                      .filter(([, value]) => Boolean(value))
                      .map(([label, value]) => (
                        <div
                          key={label}
                          className='space-y-1'
                        >
                          <dt className={text.caption}>{t(label)}</dt>
                          <dd
                            className='break-all rounded-control bg-muted px-2 py-1 font-mono text-foreground/80'
                            dir='ltr'
                          >
                            {value}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </Card>
              )}

              {/* Staff who can write orders always see the editor — tracking
                  has to be addable to an order that has none yet. */}
              {(hasTracking || can('orders:write')) && (
                <Card>
                  <CardHeader
                    icon={<Truck />}
                    title={t('orderDetail.tracking')}
                    actions={
                      can('orders:write') && (
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => setShowTrackingForm(!showTrackingForm)}
                          icon={
                            showTrackingForm ? (
                              <X aria-hidden />
                            ) : (
                              <Pencil aria-hidden />
                            )
                          }
                        >
                          {showTrackingForm
                            ? t('common.cancel')
                            : hasTracking
                              ? t('orderDetail.updateTracking')
                              : t('orderDetail.addTracking')}
                        </Button>
                      )
                    }
                  />
                  {!hasTracking && !showTrackingForm && (
                    <p className={text.secondary}>
                      {t('orderDetail.noTracking')}
                    </p>
                  )}
                  {hasTracking && (
                    <dl className='divide-y divide-border'>
                      {order.trackingNumber && (
                        <KeyValue label={t('orderDetail.trackingNumber')}>
                          <span
                            className='font-mono'
                            dir='ltr'
                          >
                            {order.trackingNumber}
                          </span>
                        </KeyValue>
                      )}
                      {order.trackingCarrier && (
                        <KeyValue label={t('orderDetail.carrier')}>
                          {order.trackingCarrier}
                        </KeyValue>
                      )}
                      {order.trackingUrl && (
                        <KeyValue label={t('orderDetail.trackingUrl')}>
                          <a
                            href={order.trackingUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='font-medium text-foreground underline underline-offset-4'
                          >
                            {t('orderDetail.viewTracking')}
                          </a>
                        </KeyValue>
                      )}
                    </dl>
                  )}
                  {order.trackingEvents && order.trackingEvents.length > 0 && (
                    <div className='mt-4'>
                      <h3 className={cn(text.caption, 'mb-3')}>
                        {t('orderDetail.trackingEvents')}
                      </h3>
                      <ol className='relative space-y-4 border-s border-border ps-5'>
                        {order.trackingEvents.map((event, i) => (
                          <li
                            key={i}
                            className='relative text-xs'
                          >
                            <span
                              aria-hidden
                              className={cn(
                                'absolute -start-[1.6rem] top-1 size-2.5 rounded-full border-2 border-card',
                                i === (order.trackingEvents?.length ?? 0) - 1
                                  ? 'bg-foreground'
                                  : 'bg-border-strong',
                              )}
                            />
                            <div className='flex flex-wrap items-baseline justify-between gap-x-2'>
                              <span className='text-sm font-medium text-foreground'>
                                {tv('trackingEvent', event.status)}
                              </span>
                              <span className='tabular-nums text-muted-foreground'>
                                {event.timestamp
                                  ? formatDateTime(event.timestamp)
                                  : '—'}
                              </span>
                            </div>
                            {event.description && (
                              <p className='mt-0.5 text-foreground/80'>
                                {event.description}
                              </p>
                            )}
                            {event.location && (
                              <p className='mt-0.5 text-muted-foreground'>
                                {event.location}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {can('orders:write') && showTrackingForm && (
                    <form
                      onSubmit={handleUpdateTracking}
                      className='mt-4 space-y-4 border-t border-border pt-4'
                    >
                      <Field label={t('orderDetail.trackingNumber')}>
                        <Input
                          id='order-tracking-number'
                          value={trackingForm.trackingNumber}
                          onChange={(e) =>
                            setTracking({ trackingNumber: e.target.value })
                          }
                          placeholder={t(
                            'orderDetail.trackingNumberPlaceholder',
                          )}
                          dir='ltr'
                          className='font-mono'
                        />
                      </Field>
                      <Field label={t('orderDetail.carrier')}>
                        <Input
                          id='order-carrier'
                          value={trackingForm.trackingCarrier}
                          onChange={(e) =>
                            setTracking({ trackingCarrier: e.target.value })
                          }
                          placeholder={t('orderDetail.carrierPlaceholder')}
                        />
                      </Field>
                      <Field label={t('orderDetail.trackingUrl')}>
                        <Input
                          id='order-tracking-url'
                          type='url'
                          value={trackingForm.trackingUrl}
                          onChange={(e) =>
                            setTracking({ trackingUrl: e.target.value })
                          }
                          placeholder='https://...'
                          dir='ltr'
                        />
                      </Field>
                      <div className='space-y-2 border-t border-border pt-4'>
                        <Field label={t('orderDetail.addEvent')}>
                          <Select
                            id='order-add-tracking-event-optional'
                            value={trackingForm.eventStatus}
                            onChange={(e) =>
                              setTracking({ eventStatus: e.target.value })
                            }
                          >
                            <option value=''>
                              {t('orderDetail.selectEventStatus')}
                            </option>
                            {TRACKING_EVENTS.map((value) => (
                              <option
                                key={value}
                                value={value}
                              >
                                {tv('trackingEvent', value)}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Input
                          value={trackingForm.eventDescription}
                          onChange={(e) =>
                            setTracking({ eventDescription: e.target.value })
                          }
                          aria-label={t('orderDetail.eventDescription')}
                          placeholder={t('orderDetail.eventDescription')}
                        />
                        <Input
                          value={trackingForm.eventLocation}
                          onChange={(e) =>
                            setTracking({ eventLocation: e.target.value })
                          }
                          aria-label={t('orderDetail.eventLocation')}
                          placeholder={t('orderDetail.eventLocation')}
                        />
                      </div>
                      <Button
                        type='submit'
                        variant='primary'
                        className='w-full'
                        loading={updateTracking.isPending}
                        icon={<Package aria-hidden />}
                      >
                        {t('orderDetail.updateTracking')}
                      </Button>
                    </form>
                  )}
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
