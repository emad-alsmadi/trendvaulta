'use client';

import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useRequestReturnMutation } from '@/hooks/orders/ordersQuery';
import { getUserFacingErrorMessage } from '@/lib/userFacingError';
import { useTranslation } from '@/contexts/TranslationContext';
import { intlLocale } from '@/lib/locale';
import type { Order, ReturnStatus } from '@/types';

function formatDay(value: string | undefined, localeTag: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(localeTag, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** What each step means for the customer, in their words (message keys). */
const STEP_COPY: Record<Exclude<ReturnStatus, 'none'>, { title: string; body: string }> = {
  requested: {
    title: 'returns.steps.requested.title',
    body: 'returns.steps.requested.body',
  },
  approved: {
    title: 'returns.steps.approved.title',
    body: 'returns.steps.approved.body',
  },
  received: {
    title: 'returns.steps.received.title',
    body: 'returns.steps.received.body',
  },
  refunded: {
    title: 'returns.steps.refunded.title',
    body: 'returns.steps.refunded.body',
  },
  rejected: {
    title: 'returns.steps.rejected.title',
    body: 'returns.steps.rejected.body',
  },
};

const STEPS: Exclude<ReturnStatus, 'none' | 'rejected'>[] = [
  'requested',
  'approved',
  'received',
  'refunded',
];

/** Message keys for the progress labels. */
const STEP_LABELS: Record<(typeof STEPS)[number], string> = {
  requested: 'returns.stepLabels.requested',
  approved: 'returns.stepLabels.approved',
  received: 'returns.stepLabels.received',
  refunded: 'returns.stepLabels.refunded',
};

/**
 * Return request form (delivered orders inside the window) or, once a
 * return exists, where it stands and what the customer should do next.
 */
export function OrderReturnSection({ order }: { order: Order }) {
  const rr = order.returnRequest;
  if (rr && rr.status !== 'none') return <ReturnStatusCard order={order} />;
  if (order.canReturn) return <ReturnRequestForm order={order} />;
  return null;
}

function ReturnStatusCard({ order }: { order: Order }) {
  const { t, formatPrice, locale } = useTranslation();
  const rr = order.returnRequest!;
  const status = rr.status as Exclude<ReturnStatus, 'none'>;
  const copy = STEP_COPY[status];
  const reached = STEPS.indexOf(status as (typeof STEPS)[number]);
  const returnedItems = rr.items.map((item) => `${item.title} × ${item.qty}`).join(', ');

  return (
    <section
      aria-labelledby='return-status-title'
      className='rounded-2xl border border-white/30 bg-white/35 p-5 shadow-sm backdrop-blur-xl'
    >
      <h2
        id='return-status-title'
        className='mb-1 flex items-center gap-2 text-lg font-bold text-indigo-950'
      >
        <RotateCcw className='h-5 w-5' aria-hidden />
        {t(copy.title)}
      </h2>
      <p className='text-sm text-indigo-950/70'>
        {status === 'refunded' && rr.refundAmount
          ? t('returns.steps.refunded.bodyWithAmount', { amount: formatPrice(rr.refundAmount) })
          : t(copy.body)}
      </p>

      {status !== 'rejected' && (
        <ol className='mt-4 grid grid-cols-4 gap-2' aria-label={t('returns.progressLabel')}>
          {STEPS.map((step, i) => (
            <li key={step} className='text-center'>
              <span
                className={`mx-auto mb-1 block h-1.5 rounded-full ${
                  i <= reached ? 'bg-indigo-600' : 'bg-indigo-950/10'
                }`}
                aria-hidden
              />
              <span
                className={`text-[11px] font-medium ${
                  i <= reached ? 'text-indigo-950' : 'text-indigo-950/40'
                }`}
                aria-current={i === reached ? 'step' : undefined}
              >
                {t(STEP_LABELS[step])}
              </span>
            </li>
          ))}
        </ol>
      )}

      {rr.instructions && status === 'approved' && (
        <div className='mt-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4'>
          <p className='text-sm font-semibold text-indigo-950'>{t('returns.howToSendBack')}</p>
          <p className='mt-1 whitespace-pre-line text-sm text-indigo-950/80'>
            {rr.instructions}
          </p>
        </div>
      )}

      {rr.notes && (
        <div className='mt-4'>
          <p className='text-sm font-semibold text-indigo-950'>{t('returns.teamMessage')}</p>
          <p className='mt-1 whitespace-pre-line text-sm text-indigo-950/80'>{rr.notes}</p>
        </div>
      )}

      <div className='mt-4 text-xs text-indigo-950/60'>
        {rr.requestedAt
          ? t('returns.itemsSummaryRequested', {
              items: returnedItems,
              date: formatDay(rr.requestedAt, intlLocale(locale)),
            })
          : t('returns.itemsSummary', { items: returnedItems })}
      </div>
    </section>
  );
}

function ReturnRequestForm({ order }: { order: Order }) {
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const requestReturn = useRequestReturnMutation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  // One row per product: a product bought in two variants is two order
  // lines but one return line (the API compares totals per product).
  const products = useMemo(() => {
    const byId = new Map<string, { productId: string; title: string; max: number }>();
    for (const line of order.items) {
      const id = String(line.productId);
      const entry = byId.get(id) || { productId: id, title: line.title, max: 0 };
      entry.max += line.qty;
      byId.set(id, entry);
    }
    return [...byId.values()];
  }, [order.items]);

  const [qty, setQty] = useState<Record<string, number>>({});
  const selected = products.filter((p) => (qty[p.productId] || 0) > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length === 0) {
      toast(t('returns.toast.chooseItem'), { variant: 'error' });
      return;
    }
    if (!reason.trim()) {
      toast(t('returns.toast.reasonRequired'), { variant: 'error' });
      return;
    }
    try {
      await requestReturn.mutateAsync({
        id: order._id,
        payload: {
          reason: reason.trim(),
          items: selected.map((p) => ({ productId: p.productId, qty: qty[p.productId] })),
        },
      });
      toast(t('returns.toast.requested'), { variant: 'success' });
    } catch (err) {
      toast(getUserFacingErrorMessage(err, t('returns.toast.requestFailed'), t), {
        variant: 'error',
      });
    }
  };

  return (
    <section
      aria-labelledby='return-form-title'
      className='rounded-2xl border border-white/30 bg-white/35 p-5 shadow-sm backdrop-blur-xl'
    >
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 id='return-form-title' className='text-lg font-bold text-indigo-950'>
            {t('returns.formTitle')}
          </h2>
          {order.returnWindowEndsAt && (
            <p className='text-sm text-indigo-950/70'>
              {t('returns.windowOpenUntil', {
                date: formatDay(order.returnWindowEndsAt, intlLocale(locale)),
              })}
            </p>
          )}
        </div>
        {!open && (
          <Button type='button' variant='outline' size='sm' onClick={() => setOpen(true)}>
            {t('returns.requestReturn')}
          </Button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className='mt-4 space-y-4'>
          <fieldset>
            <legend className='mb-2 text-sm font-semibold text-indigo-950'>
              {t('returns.whichItems')}
            </legend>
            <ul className='space-y-2'>
              {products.map((p) => {
                const value = qty[p.productId] || 0;
                return (
                  <li
                    key={p.productId}
                    className='flex items-center justify-between gap-3 rounded-xl bg-white/50 px-3 py-2'
                  >
                    <label className='flex min-w-0 flex-1 items-center gap-2 text-sm text-indigo-950'>
                      <input
                        type='checkbox'
                        checked={value > 0}
                        onChange={(e) =>
                          setQty((q) => ({ ...q, [p.productId]: e.target.checked ? p.max : 0 }))
                        }
                        className='h-4 w-4 rounded border-indigo-300'
                      />
                      <span className='truncate'>{p.title}</span>
                    </label>
                    {p.max > 1 && value > 0 && (
                      <select
                        value={value}
                        onChange={(e) =>
                          setQty((q) => ({ ...q, [p.productId]: Number(e.target.value) }))
                        }
                        aria-label={t('returns.qtyAriaLabel', { title: p.title })}
                        className='rounded-lg border border-indigo-200 bg-white px-2 py-1 text-sm'
                      >
                        {Array.from({ length: p.max }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {t('returns.qtyOfMax', { n, max: p.max })}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <label className='block text-sm'>
            <span className='mb-1 block font-semibold text-indigo-950'>{t('returns.reasonLabel')}</span>
            <textarea
              required
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('returns.reasonPlaceholder')}
              className='w-full rounded-xl border border-indigo-200 bg-white/80 px-3 py-2 text-sm text-indigo-950'
            />
          </label>

          <p className='text-xs text-indigo-950/60'>
            {t('returns.reviewNote')}
          </p>

          <div className='flex flex-wrap gap-2'>
            <Button type='submit' size='sm' disabled={requestReturn.isPending}>
              {requestReturn.isPending ? t('returns.sending') : t('returns.sendRequest')}
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              disabled={requestReturn.isPending}
              onClick={() => setOpen(false)}
            >
              {t('returns.notNow')}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
