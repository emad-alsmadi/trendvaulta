import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, RefreshCw, X } from 'lucide-react';
import {
  useAdminOrders,
  useUpdateOrderStatusMutation,
} from '../hooks/useAdminOrders';
import {
  errorMessage,
  type AdminOrder,
} from '../lib/api';
import { getAuthToken } from '../lib/auth';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useTableQuery } from '../hooks/useTableQuery';
import { SortableHeader } from '../components/ui/SortableHeader';
import { TablePagination } from '../components/ui/TablePagination';

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'refunded', label: 'Refunded' },
];

// Mirrors the paymentStatus values order.controller.js accepts.
const PAYMENT_FILTERS = [
  { value: '', label: 'All payments' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  canceled: 'Canceled',
  needs_attention: 'Needs attention',
  refunded: 'Refunded',
};

const ATTENTION_REASON_LABELS: Record<string, string> = {
  insufficient_stock: 'Insufficient stock after payment',
  paid_after_cancel: 'Paid after cancel',
  refund_failed: 'Refund failed — manual action',
  manual_refund_required: 'Manual refund required',
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] || status;
}

function attentionReasonLabel(reason: string) {
  return ATTENTION_REASON_LABELS[reason] || reason.replace(/_/g, ' ');
}

function triggersRefund(order: AdminOrder, next: string) {
  return (
    order.paymentStatus === 'paid' &&
    (next === 'canceled' || next === 'refunded')
  );
}

function customerLabel(order: AdminOrder) {
  if (order.user && typeof order.user === 'object') {
    return order.user.email || order.user.username || 'Customer';
  }
  return typeof order.user === 'string' ? order.user : 'Customer';
}

function shortId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

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

export default function Orders() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const table = useTableQuery({ limit: 25, sort: 'createdAt', order: 'desc' });
  const { resetPage } = table;
  // Set by the "Order history" link on the Users screen; kept in the URL so
  // the filtered view survives a reload and can be shared.
  const [searchParams, setSearchParams] = useSearchParams();
  const customerId = searchParams.get('user') || '';

  const query = useMemo(
    () => ({
      ...table.params,
      status: statusFilter || undefined,
      paymentStatus: paymentFilter || undefined,
      q: appliedQ || undefined,
      user: customerId || undefined,
    }),
    [table.params, statusFilter, paymentFilter, appliedQ, customerId],
  );

  const ordersQ = useAdminOrders(query);

  function clearCustomer() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('user');
      return next;
    });
    resetPage();
  }
  const updateMut = useUpdateOrderStatusMutation();
  const orders = ordersQ.data?.data || [];
  const meta = ordersQ.data?.meta;
  const hasToken = Boolean(getAuthToken());

  async function onChangeStatus(order: AdminOrder, next: string) {
    if (!next || next === order.status) return;
    const refundNote = triggersRefund(order, next)
      ? ' This order is paid — a Stripe refund will be issued.'
      : '';
    const ok = await confirm({ message: `Change order ${shortId(order._id)} from "${statusLabel(order.status)}" to "${statusLabel(next)}"?${refundNote}`, confirmLabel: 'Change status' });
    if (!ok) return;
    try {
      await updateMut.mutateAsync({ id: order._id, status: next });
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update order'));
    }
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAppliedQ(search.trim());
    resetPage();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Orders
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Live fulfillment from the API. Paid is set by Stripe — not from this
            panel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              resetPage();
            }}
            aria-label="Filter by status"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value || 'all'} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              resetPage();
            }}
            aria-label="Filter by payment status"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            {PAYMENT_FILTERS.map((s) => (
              <option key={s.value || 'all'} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void ordersQ.refetch()}
            disabled={ordersQ.isFetching}
            className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${ordersQ.isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {customerId && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
          <span>
            Orders for{' '}
            <strong>
              {orders[0] ? customerLabel(orders[0]) : 'selected customer'}
            </strong>
            {meta ? ` · ${meta.total}` : ''}
          </span>
          <button
            type="button"
            onClick={clearCustomer}
            aria-label="Show all customers"
            className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={onSearchSubmit} className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order id or customer email…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </form>

      {!hasToken && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Sign in with an admin account that has{' '}
          <code className="font-mono">orders:read</code> /{' '}
          <code className="font-mono">orders:write</code>.{' '}
          <Link to="/login" className="font-semibold underline">
            Go to login
          </Link>
        </div>
      )}

      {ordersQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">Loading orders…</p>
      )}

      {ordersQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(ordersQ.error, 'Failed to load orders')}
          {!hasToken && (
            <>
              {' '}
              <Link to="/login" className="font-semibold underline">
                Sign in
              </Link>
            </>
          )}
        </div>
      )}

      {!ordersQ.isLoading && !ordersQ.isError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider dark:bg-gray-700">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium [&>th]:text-gray-500 dark:[&>th]:text-gray-300">
                  <th scope="col">Order</th>
                  <th scope="col">Customer</th>
                  <SortableHeader
                    field="totalPrice"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    Total
                  </SortableHeader>
                  <SortableHeader
                    field="paymentStatus"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    Payment
                  </SortableHeader>
                  <SortableHeader
                    field="status"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    Status
                  </SortableHeader>
                  <SortableHeader
                    field="createdAt"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    Date
                  </SortableHeader>
                  <th scope="col">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No orders match this filter.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const next = order.allowedNextStatuses || [];
                    return (
                      <tr
                        key={order._id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/60"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900 dark:text-white">
                          <Link to={`/orders/${order._id}`} className='hover:underline'>
                            {shortId(order._id)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {customerLabel(order)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          ${Number(order.totalPrice || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {order.paymentStatus || '—'}
                          {order.paymentStatus === 'refunded' && (
                            <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                              Refunded $
                              {Number(
                                order.refundAmount ?? order.totalPrice ?? 0,
                              ).toFixed(2)}
                              {order.refundedAt
                                ? ` · ${new Date(order.refundedAt).toLocaleDateString()}`
                                : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(order.status)}`}
                          >
                            {statusLabel(order.status)}
                          </span>
                          {order.attentionReason ? (
                            <span className="mt-1 block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              {attentionReasonLabel(order.attentionReason)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {next.length === 0 || !can('orders:write') ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : (
                            <select
                              value=""
                              disabled={updateMut.isPending}
                              aria-label={`Update status for ${order._id}`}
                              onChange={(e) =>
                                void onChangeStatus(order, e.target.value)
                              }
                              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                            >
                              <option value="">Set status…</option>
                              {next.map((s) => (
                                <option key={s} value={s}>
                                  {statusLabel(s)}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <TablePagination
              meta={meta}
              busy={ordersQ.isFetching}
              onPage={table.setPage}
              onLimit={table.setLimit}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
