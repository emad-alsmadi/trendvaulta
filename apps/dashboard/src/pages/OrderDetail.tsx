import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Package, Plus } from 'lucide-react';
import {
  useAdminOrderById,
  useUpdateOrderStatusMutation,
  useUpdateOrderTrackingMutation,
} from '../hooks/useAdminOrders';
import {
  errorMessage,
  type AdminOrderCustomer,
  type OrderTrackingPayload,
} from '../lib/api';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { usePermissions } from '../hooks/usePermissions';
import { useState } from 'react';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  canceled: 'Canceled',
  needs_attention: 'Needs attention',
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

function statusLabel(status?: string) {
  if (!status) return '—';
  return STATUS_LABELS[status] || status;
}

function paymentStatusLabel(status?: string) {
  if (!status) return '—';
  return PAYMENT_STATUS_LABELS[status] || status;
}

function money(n?: number) {
  return `$${(n ?? 0).toFixed(2)}`;
}

function customerLabel(user?: string | AdminOrderCustomer) {
  if (!user) return '—';
  if (typeof user === 'string') return user;
  return user.username || user.email || user._id;
}

function variantLabel(variant?: {
  size?: string;
  color?: string;
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

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const orderQ = useAdminOrderById(id);
  const order = orderQ.data;
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
    const ok = await confirm({
      message: `Change this order from "${statusLabel(order.status)}" to "${statusLabel(next)}"?${
        refunds ? ' This order is paid — a Stripe refund will be issued.' : ''
      }`,
      confirmLabel: refunds ? 'Change and refund' : 'Change status',
      danger: refunds,
    });
    if (!ok) return;
    try {
      await updateStatus.mutateAsync({ id: order._id, status: next });
      toast.success(refunds ? 'Status updated — refund issued' : 'Status updated');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update order'));
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
      toast.success('Tracking updated successfully');
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
      toast.error(errorMessage(err, 'Failed to update tracking'));
    }
  };

  const copyId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy');
    }
  };

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
        <ArrowLeft className='h-4 w-4' />
        Back to orders
      </Link>

      {orderQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          Loading order…
        </p>
      )}

      {orderQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(orderQ.error, 'Failed to load order')}
        </div>
      )}

      {order && (
        <div className='space-y-6'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                  Order {order._id.slice(-8).toUpperCase()}
                </h1>
                <button
                  type='button'
                  onClick={() => void copyId(order._id)}
                  aria-label='Copy full order id'
                  className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700'
                >
                  <Copy className='h-4 w-4' />
                </button>
              </div>
              {order.createdAt && (
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                  Placed {new Date(order.createdAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className='flex flex-wrap gap-2'>
              <span className='inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'>
                {statusLabel(order.status)}
              </span>
              <span className='inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200'>
                Payment: {paymentStatusLabel(order.paymentStatus)}
              </span>
              {order.attentionReason && (
                <span className='inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'>
                  {ATTENTION_REASON_LABELS[order.attentionReason] ||
                    order.attentionReason}
                </span>
              )}
              {can('orders:write') &&
                (order.allowedNextStatuses?.length ?? 0) > 0 && (
                  <select
                    value=''
                    disabled={updateStatus.isPending}
                    aria-label='Change order status'
                    onChange={(e) => void onChangeStatus(e.target.value)}
                    className='rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  >
                    <option value=''>
                      {updateStatus.isPending ? 'Updating…' : 'Change status…'}
                    </option>
                    {order.allowedNextStatuses?.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                )}
            </div>
          </div>

          <div className='grid gap-6 lg:grid-cols-3'>
            <div className='lg:col-span-2 space-y-6'>
              <section className='rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'>
                <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                  Items
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
                        {variantLabel(item.variant) && (
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            {variantLabel(item.variant)}
                          </p>
                        )}
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          Qty {item.qty} × {money(item.price)}
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
                  Shipping address
                </h2>
                <dl className='grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2'>
                  <div>
                    <dt className='text-gray-500 dark:text-gray-400'>Name</dt>
                    <dd className='font-medium text-gray-900 dark:text-white'>
                      {order.shippingAddress?.name || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-gray-500 dark:text-gray-400'>Phone</dt>
                    <dd className='font-medium text-gray-900 dark:text-white'>
                      {order.shippingAddress?.phone || '—'}
                    </dd>
                  </div>
                  <div className='sm:col-span-2'>
                    <dt className='text-gray-500 dark:text-gray-400'>
                      Address
                    </dt>
                    <dd className='font-medium text-gray-900 dark:text-white'>
                      {order.shippingAddress?.address || '—'},{' '}
                      {order.shippingAddress?.city || '—'}{' '}
                      {order.shippingAddress?.zip || ''}
                    </dd>
                  </div>
                  {order.shippingAddress?.notes && (
                    <div className='sm:col-span-2'>
                      <dt className='text-gray-500 dark:text-gray-400'>
                        Notes
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
                  Customer
                </h2>
                <p className='text-sm font-medium text-gray-900 dark:text-white'>
                  {customerLabel(order.user)}
                </p>
                {typeof order.user === 'object' && order.user?.email && (
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    {order.user.email}
                  </p>
                )}
              </section>

              <section className='rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'>
                <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                  Totals
                </h2>
                <dl className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <dt className='text-gray-500 dark:text-gray-400'>Items</dt>
                    <dd className='text-gray-900 dark:text-white'>
                      {money(order.itemsPrice)}
                    </dd>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className='flex justify-between'>
                      <dt className='text-gray-500 dark:text-gray-400'>
                        Discount{' '}
                        {order.couponCode ? `(${order.couponCode})` : ''}
                      </dt>
                      <dd className='text-gray-900 dark:text-white'>
                        -{money(order.discountAmount)}
                      </dd>
                    </div>
                  )}
                  <div className='flex justify-between'>
                    <dt className='text-gray-500 dark:text-gray-400'>
                      Shipping
                    </dt>
                    <dd className='text-gray-900 dark:text-white'>
                      {money(order.shippingPrice)}
                    </dd>
                  </div>
                  <div className='flex justify-between'>
                    <dt className='text-gray-500 dark:text-gray-400'>Tax</dt>
                    <dd className='text-gray-900 dark:text-white'>
                      {money(order.taxPrice)}
                    </dd>
                  </div>
                  <div className='flex justify-between border-t border-gray-100 pt-2 font-semibold dark:border-gray-700'>
                    <dt className='text-gray-900 dark:text-white'>Total</dt>
                    <dd className='text-gray-900 dark:text-white'>
                      {money(order.totalPrice)}
                    </dd>
                  </div>
                  {order.refundAmount ? (
                    <div className='flex justify-between text-red-600 dark:text-red-400'>
                      <dt>Refunded</dt>
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
                    Payment references
                  </h2>
                  <dl className='space-y-2 text-xs'>
                    {order.stripeSessionId && (
                      <div>
                        <dt className='text-gray-500 dark:text-gray-400'>
                          Checkout session
                        </dt>
                        <dd className='break-all font-mono text-gray-700 dark:text-gray-300'>
                          {order.stripeSessionId}
                        </dd>
                      </div>
                    )}
                    {order.paymentIntentId && (
                      <div>
                        <dt className='text-gray-500 dark:text-gray-400'>
                          Payment intent
                        </dt>
                        <dd className='break-all font-mono text-gray-700 dark:text-gray-300'>
                          {order.paymentIntentId}
                        </dd>
                      </div>
                    )}
                    {order.refundId && (
                      <div>
                        <dt className='text-gray-500 dark:text-gray-400'>
                          Refund id
                        </dt>
                        <dd className='break-all font-mono text-gray-700 dark:text-gray-300'>
                          {order.refundId}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              {(order.trackingNumber ||
                order.trackingCarrier ||
                order.trackingUrl ||
                (order.trackingEvents && order.trackingEvents.length > 0)) && (
                <section className='rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'>
                  <h2 className='mb-4 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                    Tracking
                  </h2>
                  <dl className='space-y-2 text-sm'>
                    {order.trackingNumber && (
                      <div>
                        <dt className='text-gray-500 dark:text-gray-400'>
                          Tracking number
                        </dt>
                        <dd className='font-mono text-gray-900 dark:text-white'>
                          {order.trackingNumber}
                        </dd>
                      </div>
                    )}
                    {order.trackingCarrier && (
                      <div>
                        <dt className='text-gray-500 dark:text-gray-400'>
                          Carrier
                        </dt>
                        <dd className='font-medium text-gray-900 dark:text-white'>
                          {order.trackingCarrier}
                        </dd>
                      </div>
                    )}
                    {order.trackingUrl && (
                      <div>
                        <dt className='text-gray-500 dark:text-gray-400'>
                          Tracking URL
                        </dt>
                        <dd>
                          <a
                            href={order.trackingUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='font-medium text-blue-600 hover:underline dark:text-blue-400'
                          >
                            View tracking
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                  {order.trackingEvents && order.trackingEvents.length > 0 && (
                    <div className='mt-4'>
                      <h3 className='mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400'>
                        Tracking events
                      </h3>
                      <ul className='space-y-2 text-xs'>
                        {order.trackingEvents.map((event, i) => (
                          <li
                            key={i}
                            className='rounded bg-gray-50 p-2 dark:bg-gray-700'
                          >
                            <div className='flex items-center justify-between gap-2'>
                              <span className='font-medium text-gray-900 dark:text-white'>
                                {event.status}
                              </span>
                              <span className='text-gray-500 dark:text-gray-400'>
                                {event.timestamp
                                  ? new Date(event.timestamp).toLocaleString()
                                  : '—'}
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
                  <button
                    type='button'
                    onClick={() => setShowTrackingForm(!showTrackingForm)}
                    className='mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400'
                  >
                    <Plus className='h-4 w-4' />
                    {showTrackingForm ? 'Cancel' : 'Update tracking'}
                  </button>
                  {showTrackingForm && (
                    <form
                      onSubmit={handleUpdateTracking}
                      className='mt-4 space-y-3'
                    >
                      <div>
                        <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                          Tracking number
                        </label>
                        <input
                          type='text'
                          value={trackingForm.trackingNumber}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              trackingNumber: e.target.value,
                            })
                          }
                          className='w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                          placeholder='e.g. 1Z999AA10123456784'
                        />
                      </div>
                      <div>
                        <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                          Carrier
                        </label>
                        <input
                          type='text'
                          value={trackingForm.trackingCarrier}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              trackingCarrier: e.target.value,
                            })
                          }
                          className='w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                          placeholder='e.g. FedEx, UPS, DHL'
                        />
                      </div>
                      <div>
                        <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                          Tracking URL
                        </label>
                        <input
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
                        />
                      </div>
                      <div className='border-t border-gray-200 pt-3 dark:border-gray-700'>
                        <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                          Add tracking event (optional)
                        </label>
                        <select
                          value={trackingForm.eventStatus}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              eventStatus: e.target.value,
                            })
                          }
                          className='mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                        >
                          <option value=''>Select status...</option>
                          <option value='picked_up'>Picked up</option>
                          <option value='in_transit'>In transit</option>
                          <option value='out_for_delivery'>
                            Out for delivery
                          </option>
                          <option value='delivered'>Delivered</option>
                          <option value='exception'>Exception</option>
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
                          placeholder='Description (optional)'
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
                          placeholder='Location (optional)'
                        />
                      </div>
                      <button
                        type='submit'
                        disabled={updateTracking.isPending}
                        className='inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        <Package className='h-4 w-4' />
                        {updateTracking.isPending
                          ? 'Updating...'
                          : 'Update tracking'}
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
