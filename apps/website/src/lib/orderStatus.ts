/** Order status presentation shared by the account pages. Labels are message keys, resolved with t() at render. */

export const STATUS_LABELS: Record<string, string> = {
  pending: 'orders.status.pending',
  paid: 'orders.status.paid',
  shipped: 'orders.status.shipped',
  delivered: 'orders.status.delivered',
  canceled: 'orders.status.canceled',
  needs_attention: 'orders.status.needs_attention',
  refunded: 'orders.status.refunded',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'orders.paymentStatus.unpaid',
  pending: 'orders.paymentStatus.pending',
  paid: 'orders.paymentStatus.paid',
  failed: 'orders.paymentStatus.failed',
  refunded: 'orders.paymentStatus.refunded',
};

export const ATTENTION_REASON_LABELS: Record<string, string> = {
  insufficient_stock: 'orders.attentionReason.insufficient_stock',
  paid_after_cancel: 'orders.attentionReason.paid_after_cancel',
  refund_failed: 'orders.attentionReason.refund_failed',
  manual_refund_required: 'orders.attentionReason.manual_refund_required',
};

export function statusBadgeClass(status: string) {
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
