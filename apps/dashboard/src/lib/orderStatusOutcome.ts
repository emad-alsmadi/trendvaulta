import type { AdminOrderStatusResult } from './api';
import type { useT } from '../i18n/I18nProvider';

type I18n = ReturnType<typeof useT>;

/**
 * Toast for a PATCH /orders/:id/status result. The API's own `message` is
 * English-only, so the same outcome is rebuilt from its flags in the reader's
 * language. Shared by the Orders list and the order page.
 */
export function orderStatusOutcome(
  result: AdminOrderStatusResult,
  next: string,
  { t, tv }: Pick<I18n, 't' | 'tv'>,
): { variant: 'success' | 'error'; message: string } {
  if (result.attentionReason === 'manual_refund_required') {
    return { variant: 'error', message: t('orders.manualRefund') };
  }
  if (result.refunded && result.stockRestored) {
    return { variant: 'success', message: t('orders.outcome.refundedRestocked') };
  }
  if (result.refunded) {
    return { variant: 'success', message: t('orders.outcome.refunded') };
  }
  if (result.stockRestored && next === 'canceled') {
    return { variant: 'success', message: t('orders.outcome.canceledRestocked') };
  }
  return {
    variant: 'success',
    message: t('orders.outcome.updatedTo', { status: tv('orderStatus', next) }),
  };
}
