import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useUpdateReturnMutation } from '../../hooks/useAdminOrders';
import {
  errorMessage,
  type AdminOrderDetail,
  type ReturnUpdatePayload,
} from '../../lib/api';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../ui/Toast';
import { useConfirm } from '../ui/ConfirmDialog';
import { useT } from '../../i18n/I18nProvider';

const STATUS_CLASS: Record<string, string> = {
  requested: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  received: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  refunded: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  rejected: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

/** Must be replaced before approving — see approve(). */
const ADDRESS_PLACEHOLDER = '[RETURN ADDRESS]';

/**
 * Sent to the customer, not shown to staff — so it stays in the store's
 * customer-facing language rather than following the dashboard's locale.
 */
function defaultInstructions(orderRef: string) {
  return [
    'Please pack the items securely, in their original packaging if you still have it.',
    `Write your order number (#${orderRef}) on a note inside the parcel.`,
    `Send it to: ${ADDRESS_PLACEHOLDER}`,
    'Keep your shipping receipt. We will refund you once the parcel arrives and is checked.',
  ].join('\n');
}

/**
 * Suggested refund: the returned items at the price paid, capped at what is
 * still refundable. Shipping, tax and coupon discounts are not apportioned —
 * staff adjust the amount when those should be included.
 */
function suggestedRefund(order: AdminOrderDetail, refundable: number) {
  const unitPrice = new Map<string, { total: number; qty: number }>();
  for (const line of order.items) {
    const entry = unitPrice.get(line.productId) || { total: 0, qty: 0 };
    entry.total += line.price * line.qty;
    entry.qty += line.qty;
    unitPrice.set(line.productId, entry);
  }
  const itemsValue = (order.returnRequest?.items || []).reduce((sum, item) => {
    const entry = unitPrice.get(item.productId);
    return entry && entry.qty ? sum + (entry.total / entry.qty) * item.qty : sum;
  }, 0);
  return Math.min(Math.round(itemsValue * 100) / 100, refundable);
}

/**
 * The return (RMA) on an order and the staff actions for its next step:
 * approve with instructions → mark received → refund via Stripe, or reject.
 */
export function ReturnPanel({ order }: { order: AdminOrderDetail }) {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const updateReturn = useUpdateReturnMutation();
  const { t, tv, formatCurrency, formatDate, formatDateTime } = useT();
  const money = formatCurrency;

  const rr = order.returnRequest;
  const orderRef = order._id.slice(-8).toUpperCase();
  const refundable =
    Math.round(((order.totalPrice || 0) - (order.refundAmount || 0)) * 100) / 100;

  const [instructions, setInstructions] = useState(
    () => rr?.instructions || defaultInstructions(orderRef),
  );
  const [notes, setNotes] = useState(rr?.notes || '');
  const [amount, setAmount] = useState(() =>
    order.returnRequest ? String(suggestedRefund(order, refundable)) : '',
  );

  if (!rr || rr.status === 'none') return null;

  const busy = updateReturn.isPending;
  const canAct = can('orders:write');
  const open = rr.status === 'requested' || rr.status === 'approved' || rr.status === 'received';

  async function send(payload: ReturnUpdatePayload, success: string) {
    try {
      await updateReturn.mutateAsync({ id: order._id, payload });
      // The API's message is English-only; the caller passes translated copy.
      toast.success(success);
    } catch (err) {
      toast.error(errorMessage(err, t('returns.updateFailed')));
    }
  }

  async function approve() {
    const text = instructions.trim();
    if (!text || text.includes(ADDRESS_PLACEHOLDER)) {
      toast.error(t('returns.replaceAddress', { placeholder: ADDRESS_PLACEHOLDER }));
      return;
    }
    await send({ status: 'approved', instructions: text, notes: notes.trim() }, t('returns.approved'));
  }

  async function reject() {
    if (!notes.trim()) {
      toast.error(t('returns.rejectNoteRequired'));
      return;
    }
    const ok = await confirm({
      message: t('returns.confirmReject'),
      danger: true,
      confirmLabel: t('returns.reject'),
    });
    if (!ok) return;
    await send({ status: 'rejected', notes: notes.trim() }, t('returns.rejected'));
  }

  async function refund() {
    const value = Math.round(Number(amount) * 100) / 100;
    if (!(value > 0) || value > refundable) {
      toast.error(t('returns.amountRange', { min: money(0.01), max: money(refundable) }));
      return;
    }
    const ok = await confirm({
      message: t('returns.confirmRefund', { amount: money(value) }),
      danger: true,
      confirmLabel: t('returns.refundButton', { amount: money(value) }),
    });
    if (!ok) return;
    await send({ status: 'refunded', refundAmount: value, notes: notes.trim() }, t('returns.refundIssued'));
  }

  const field =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white';

  return (
    <section className='rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <h2 className='flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
          <RotateCcw className='h-4 w-4' aria-hidden />
          {t('returns.title')}
        </h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[rr.status] || ''}`}>
          {tv('returnStage', rr.status)}
        </span>
      </div>

      <dl className='space-y-3 text-sm'>
        <div>
          <dt className='text-gray-500 dark:text-gray-400'>{t('returns.customerReason')}</dt>
          <dd dir='auto' className='whitespace-pre-line text-gray-900 dark:text-white'>{rr.reason || '—'}</dd>
        </div>
        <div>
          <dt className='text-gray-500 dark:text-gray-400'>{t('returns.items')}</dt>
          <dd>
            <ul className='mt-1 space-y-1'>
              {rr.items.map((item) => (
                <li key={item.productId} className='text-gray-900 dark:text-white'>
                  {item.title} × {item.qty}
                  {item.reason && (
                    <span className='block text-xs text-gray-500'>{item.reason}</span>
                  )}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        {rr.requestedAt && (
          <div className='text-xs text-gray-500'>
            {t('returns.requestedAt', { date: formatDateTime(rr.requestedAt) })}
          </div>
        )}
        {rr.status === 'refunded' && (
          <div className='font-medium text-green-700 dark:text-green-300'>
            {rr.refundedAt
              ? t('returns.refundedOn', {
                  amount: money(rr.refundAmount || 0),
                  date: formatDate(rr.refundedAt),
                })
              : t('returns.refundedAmount', { amount: money(rr.refundAmount || 0) })}
            {rr.refundId ? ` · ${rr.refundId}` : ''}
          </div>
        )}
        {!open && rr.notes && (
          <div>
            <dt className='text-gray-500 dark:text-gray-400'>{t('returns.noteToCustomer')}</dt>
            <dd dir='auto' className='whitespace-pre-line text-gray-900 dark:text-white'>{rr.notes}</dd>
          </div>
        )}
        {rr.status !== 'requested' && rr.instructions && (
          <div>
            <dt className='text-gray-500 dark:text-gray-400'>{t('returns.instructionsSent')}</dt>
            <dd dir='auto' className='whitespace-pre-line text-gray-700 dark:text-gray-300'>{rr.instructions}</dd>
          </div>
        )}
      </dl>

      {open && canAct && (
        <div className='mt-5 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-700'>
          {rr.status === 'requested' && (
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('returns.instructionsLabel')}
              </span>
              <textarea
                rows={5}
                maxLength={2000}
                value={instructions}
                dir='auto'
                onChange={(e) => setInstructions(e.target.value)}
                className={field}
              />
            </label>
          )}
          {rr.status === 'received' && (
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('returns.refundAmount')}
              </span>
              <input
                type='number'
                min={0.01}
                max={refundable}
                step='0.01'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={field}
              />
              <span className='mt-1 block text-xs text-gray-500 dark:text-gray-400'>
                {t('returns.refundHint', { max: money(refundable) })}
              </span>
            </label>
          )}
          <label className='block text-sm'>
            <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
              {t('returns.noteToCustomer')}{' '}
              {rr.status === 'requested' ? t('returns.noteRequired') : t('returns.noteOptional')}
            </span>
            <textarea
              rows={2}
              maxLength={500}
              value={notes}
              dir='auto'
              onChange={(e) => setNotes(e.target.value)}
              className={field}
            />
          </label>
          <div className='flex flex-wrap justify-end gap-2'>
            <button
              type='button'
              disabled={busy}
              onClick={() => void reject()}
              className='rounded-lg px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40'
            >
              {t('returns.reject')}
            </button>
            {rr.status === 'requested' && (
              <button
                type='button'
                disabled={busy}
                onClick={() => void approve()}
                className='rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60'
              >
                {busy ? t('returns.saving') : t('returns.approve')}
              </button>
            )}
            {rr.status === 'approved' && (
              <button
                type='button'
                disabled={busy}
                onClick={() => void send({ status: 'received', notes: notes.trim() }, t('returns.received'))}
                className='rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60'
              >
                {busy ? t('returns.saving') : t('returns.markReceived')}
              </button>
            )}
            {rr.status === 'received' && (
              <button
                type='button'
                disabled={busy || refundable <= 0}
                onClick={() => void refund()}
                className='rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60'
              >
                {busy ? t('returns.refunding') : t('returns.refundViaStripe')}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
