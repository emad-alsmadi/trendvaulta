import { useState } from 'react';
import { Ban, CheckCircle2, PackageCheck, RotateCcw, Undo2 } from 'lucide-react';
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
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { Field, Input, Textarea } from '../ui/Field';
import { StatusBadge } from '../ui/StatusBadge';
import { text } from '../ui/styles';

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
  const open =
    rr.status === 'requested' ||
    rr.status === 'approved' ||
    rr.status === 'received';

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
    const value = instructions.trim();
    if (!value || value.includes(ADDRESS_PLACEHOLDER)) {
      toast.error(
        t('returns.replaceAddress', { placeholder: ADDRESS_PLACEHOLDER }),
      );
      return;
    }
    await send(
      { status: 'approved', instructions: value, notes: notes.trim() },
      t('returns.approved'),
    );
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
    await send(
      { status: 'rejected', notes: notes.trim() },
      t('returns.rejected'),
    );
  }

  async function refund() {
    const value = Math.round(Number(amount) * 100) / 100;
    if (!(value > 0) || value > refundable) {
      toast.error(
        t('returns.amountRange', { min: money(0.01), max: money(refundable) }),
      );
      return;
    }
    const ok = await confirm({
      message: t('returns.confirmRefund', { amount: money(value) }),
      danger: true,
      confirmLabel: t('returns.refundButton', { amount: money(value) }),
    });
    if (!ok) return;
    await send(
      { status: 'refunded', refundAmount: value, notes: notes.trim() },
      t('returns.refundIssued'),
    );
  }

  return (
    <Card>
      <CardHeader
        icon={<RotateCcw />}
        title={t('returns.title')}
        description={
          rr.requestedAt
            ? t('returns.requestedAt', { date: formatDateTime(rr.requestedAt) })
            : undefined
        }
        actions={
          <StatusBadge status={rr.status}>
            {tv('returnStage', rr.status)}
          </StatusBadge>
        }
      />

      <dl className='space-y-4 text-sm'>
        <div className='space-y-1'>
          <dt className={text.caption}>{t('returns.customerReason')}</dt>
          <dd
            dir='auto'
            className='whitespace-pre-line text-foreground'
          >
            {rr.reason || '—'}
          </dd>
        </div>
        <div className='space-y-1'>
          <dt className={text.caption}>{t('returns.items')}</dt>
          <dd>
            <ul className='divide-y divide-border rounded-badge border border-border'>
              {rr.items.map((item) => (
                <li
                  key={item.productId}
                  className='flex items-start justify-between gap-3 px-3 py-2'
                >
                  <span className='min-w-0'>
                    <span className='block text-foreground'>{item.title}</span>
                    {item.reason && (
                      <span
                        className='block text-xs text-muted-foreground'
                        dir='auto'
                      >
                        {item.reason}
                      </span>
                    )}
                  </span>
                  <span className='shrink-0 tabular-nums text-muted-foreground'>
                    × {item.qty}
                  </span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
        {rr.status === 'refunded' && (
          <div className='flex items-center gap-2 rounded-badge border border-foreground px-3 py-2 font-medium text-foreground'>
            <CheckCircle2
              className='size-4 shrink-0'
              aria-hidden
            />
            <span>
              {rr.refundedAt
                ? t('returns.refundedOn', {
                    amount: money(rr.refundAmount || 0),
                    date: formatDate(rr.refundedAt),
                  })
                : t('returns.refundedAmount', {
                    amount: money(rr.refundAmount || 0),
                  })}
              {rr.refundId ? ` · ${rr.refundId}` : ''}
            </span>
          </div>
        )}
        {!open && rr.notes && (
          <div className='space-y-1'>
            <dt className={text.caption}>{t('returns.noteToCustomer')}</dt>
            <dd
              dir='auto'
              className='whitespace-pre-line text-foreground'
            >
              {rr.notes}
            </dd>
          </div>
        )}
        {rr.status !== 'requested' && rr.instructions && (
          <div className='space-y-1'>
            <dt className={text.caption}>{t('returns.instructionsSent')}</dt>
            <dd
              dir='auto'
              className='whitespace-pre-line rounded-badge bg-muted/60 p-3 text-foreground/80'
            >
              {rr.instructions}
            </dd>
          </div>
        )}
      </dl>

      {open && canAct && (
        <div className='mt-5 space-y-4 border-t border-border pt-5'>
          {rr.status === 'requested' && (
            <Field label={t('returns.instructionsLabel')}>
              <Textarea
                rows={5}
                maxLength={2000}
                value={instructions}
                dir='auto'
                onChange={(e) => setInstructions(e.target.value)}
              />
            </Field>
          )}
          {rr.status === 'received' && (
            <Field
              label={t('returns.refundAmount')}
              hint={t('returns.refundHint', { max: money(refundable) })}
            >
              <Input
                type='number'
                min={0.01}
                max={refundable}
                step='0.01'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className='tabular-nums'
              />
            </Field>
          )}
          <Field
            label={
              <>
                {t('returns.noteToCustomer')}{' '}
                <span className='font-normal text-muted-foreground'>
                  {rr.status === 'requested'
                    ? t('returns.noteRequired')
                    : t('returns.noteOptional')}
                </span>
              </>
            }
          >
            <Textarea
              rows={2}
              maxLength={500}
              value={notes}
              dir='auto'
              onChange={(e) => setNotes(e.target.value)}
              className='min-h-16'
            />
          </Field>
          <div className='flex flex-wrap justify-end gap-2'>
            <Button
              variant='destructive'
              disabled={busy}
              onClick={() => void reject()}
              icon={<Ban aria-hidden />}
            >
              {t('returns.reject')}
            </Button>
            {rr.status === 'requested' && (
              <Button
                variant='primary'
                loading={busy}
                onClick={() => void approve()}
                icon={<CheckCircle2 aria-hidden />}
              >
                {t('returns.approve')}
              </Button>
            )}
            {rr.status === 'approved' && (
              <Button
                variant='primary'
                loading={busy}
                onClick={() =>
                  void send(
                    { status: 'received', notes: notes.trim() },
                    t('returns.received'),
                  )
                }
                icon={<PackageCheck aria-hidden />}
              >
                {t('returns.markReceived')}
              </Button>
            )}
            {rr.status === 'received' && (
              <Button
                variant='primary'
                loading={busy}
                disabled={refundable <= 0}
                onClick={() => void refund()}
                icon={<Undo2 aria-hidden />}
              >
                {t('returns.refundViaStripe')}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
