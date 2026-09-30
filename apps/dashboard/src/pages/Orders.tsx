import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import {
  useAdminOrders,
  useUpdateOrderStatusMutation,
} from '../hooks/useAdminOrders';
import {
  errorMessage,
  type AdminOrder,
  type AdminOrdersQuery,
} from '../lib/api';
import { getAuthToken } from '../lib/auth';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useTableQuery } from '../hooks/useTableQuery';
import { SortableHeader } from '../components/ui/SortableHeader';
import { useT } from '../i18n/I18nProvider';
import { orderStatusOutcome } from '../lib/orderStatusOutcome';
import { SearchInput, Select } from '../components/ui/Field';
import { Pagination } from '../components/ui/Pagination';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Table, TableCard, THead, Th, Td } from '../components/ui/Table';
import { cn } from '../lib/cn';

// Filter values are API values; labels come from tv(group, value).
const STATUS_FILTERS = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'canceled',
  'needs_attention',
  'refunded',
];

// Mirrors the paymentStatus values order.controller.js accepts.
const PAYMENT_FILTERS = ['unpaid', 'pending', 'paid', 'failed', 'refunded'];

/** Open return steps first — the ones that need someone to act. */
const RETURN_FILTERS = [
  'requested',
  'approved',
  'received',
  'refunded',
  'rejected',
];

function triggersRefund(order: AdminOrder, next: string) {
  return (
    order.paymentStatus === 'paid' &&
    (next === 'canceled' || next === 'refunded')
  );
}

function customerLabel(
  order: AdminOrder,
  fallback: string,
  guestLabel: (email: string) => string = (email) => email,
) {
  // A guest order (no account) is known by its email
  if (!order.user && order.guestEmail) return guestLabel(order.guestEmail);
  if (order.user && typeof order.user === 'object') {
    return order.user.email || order.user.username || fallback;
  }
  return typeof order.user === 'string' ? order.user : fallback;
}

function shortId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export default function Orders() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tv, formatCurrency, formatDate, formatNumber } = useT();
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [returnFilter, setReturnFilter] = useState('');
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
      returnStatus: (returnFilter ||
        undefined) as AdminOrdersQuery['returnStatus'],
    }),
    [
      table.params,
      statusFilter,
      paymentFilter,
      appliedQ,
      customerId,
      returnFilter,
    ],
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
  const customerFallback = t('orders.customerFallback');

  async function onChangeStatus(order: AdminOrder, next: string) {
    if (!next || next === order.status) return;
    const question = t('orders.confirmChange', {
      id: shortId(order._id),
      from: tv('orderStatus', order.status),
      to: tv('orderStatus', next),
    });
    const refundNote = triggersRefund(order, next)
      ? ` ${t('orders.refundNote')}`
      : '';
    const ok = await confirm({
      message: `${question}${refundNote}`,
      confirmLabel: t('orders.changeStatus'),
    });
    if (!ok) return;
    try {
      const result = await updateMut.mutateAsync({
        id: order._id,
        status: next,
      });
      const outcome = orderStatusOutcome(result, next, { t, tv });
      toast[outcome.variant](outcome.message);
    } catch (err) {
      toast.error(errorMessage(err, t('orders.updateFailed')));
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
      <PageHeader
        title={t('orders.title')}
        description={t('orders.subtitle')}
        actions={
          <Button
            variant='secondary'
            onClick={() => void ordersQ.refetch()}
            disabled={ordersQ.isFetching}
            icon={
              <RefreshCw
                className={cn(ordersQ.isFetching && 'animate-spin')}
                aria-hidden
              />
            }
          >
            {t('orders.refresh')}
          </Button>
        }
      />

      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <div className='flex flex-1 flex-col gap-3 sm:flex-row'>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              resetPage();
            }}
            aria-label={t('orders.filterStatus')}
            className='w-full sm:w-48'
          >
            <option value=''>{t('orders.allStatuses')}</option>
            {STATUS_FILTERS.map((s) => (
              <option
                key={s}
                value={s}
              >
                {tv('orderStatus', s)}
              </option>
            ))}
          </Select>
          <Select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              resetPage();
            }}
            aria-label={t('orders.filterPayment')}
            className='w-full sm:w-48'
          >
            <option value=''>{t('orders.allPayments')}</option>
            {PAYMENT_FILTERS.map((s) => (
              <option
                key={s}
                value={s}
              >
                {tv('paymentStatus', s)}
              </option>
            ))}
          </Select>
          <Select
            value={returnFilter}
            onChange={(e) => {
              setReturnFilter(e.target.value);
              resetPage();
            }}
            aria-label={t('orders.filterReturn')}
            className='w-full sm:w-48'
          >
            <option value=''>{t('orders.allReturns')}</option>
            {RETURN_FILTERS.map((s) => (
              <option
                key={s}
                value={s}
              >
                {tv('returnStatus', s)}
              </option>
            ))}
          </Select>
        </div>
        <form
          onSubmit={onSearchSubmit}
          className='flex-1'
        >
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('orders.searchPlaceholder')}
            aria-label={t('orders.searchLabel')}
            className='w-full'
          />
        </form>
      </div>

      {customerId && (
        <div className='mb-4 inline-flex items-center gap-2 rounded-badge bg-accent px-3 py-1.5 text-sm text-foreground'>
          <span>
            {t('orders.ordersFor')}{' '}
            <strong dir='auto'>
              {orders[0]
                ? customerLabel(orders[0], customerFallback)
                : t('orders.selectedCustomer')}
            </strong>
            {meta ? ` · ${formatNumber(meta.total)}` : ''}
          </span>
          <button
            type='button'
            onClick={clearCustomer}
            aria-label={t('orders.showAllCustomers')}
            className='rounded p-0.5 hover:bg-accent-foreground transition-colors duration-200'
          >
            <X
              className='size-3.5'
              aria-hidden
            />
          </button>
        </div>
      )}

      {!hasToken && (
        <div className='mb-4 rounded-card border border-border bg-accent px-4 py-3 text-sm text-foreground'>
          {t('orders.signInHint', {
            read: 'orders:read',
            write: 'orders:write',
          })}{' '}
          <Link
            to='/login'
            className='font-semibold underline'
          >
            {t('orders.goToLogin')}
          </Link>
        </div>
      )}

      {ordersQ.isLoading && (
        <p className='py-10 text-center text-sm text-muted-foreground'>
          {t('orders.loading')}
        </p>
      )}

      {ordersQ.isError && (
        <div className='rounded-card border border-destructive bg-destructive/10 px-4 py-6 text-sm text-foreground'>
          {errorMessage(ordersQ.error, t('orders.loadFailed'))}
          {!hasToken && (
            <>
              {' '}
              <Link
                to='/login'
                className='font-semibold underline'
              >
                {t('orders.signIn')}
              </Link>
            </>
          )}
        </div>
      )}

      {!ordersQ.isLoading && !ordersQ.isError && (
        <TableCard
          toolbar={
            <div className='flex items-center justify-between'>
              <p className='text-sm text-muted-foreground'>
                {meta &&
                  t('common.showing', {
                    from: (meta.page - 1) * meta.limit + 1,
                    to: Math.min(meta.page * meta.limit, meta.total),
                    total: meta.total,
                  })}
              </p>
            </div>
          }
          footer={
            meta && (
              <Pagination
                currentPage={meta.page}
                totalPages={Math.ceil(meta.total / meta.limit)}
                onPageChange={table.setPage}
                disabled={ordersQ.isFetching}
              />
            )
          }
        >
          <Table>
            <THead>
              <tr>
                <Th>{t('orders.columns.order')}</Th>
                <Th>{t('orders.columns.customer')}</Th>
                <SortableHeader
                  field='totalPrice'
                  active={table.sort}
                  order={table.order}
                  onSort={table.toggleSort}
                >
                  {t('orders.columns.total')}
                </SortableHeader>
                <SortableHeader
                  field='paymentStatus'
                  active={table.sort}
                  order={table.order}
                  onSort={table.toggleSort}
                >
                  {t('orders.columns.payment')}
                </SortableHeader>
                <SortableHeader
                  field='status'
                  active={table.sort}
                  order={table.order}
                  onSort={table.toggleSort}
                >
                  {t('orders.columns.status')}
                </SortableHeader>
                <SortableHeader
                  field='createdAt'
                  active={table.sort}
                  order={table.order}
                  onSort={table.toggleSort}
                >
                  {t('orders.columns.date')}
                </SortableHeader>
                <Th>{t('orders.columns.nextAction')}</Th>
              </tr>
            </THead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <Td
                    colSpan={7}
                    className='text-center'
                  >
                    {t('orders.empty')}
                  </Td>
                </tr>
              ) : (
                orders.map((order, index) => {
                  const next = order.allowedNextStatuses || [];
                  return (
                    <motion.tr
                      key={order._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Td>
                        <Link
                          to={`/orders/${order._id}`}
                          className='font-mono text-xs font-semibold text-foreground hover:underline'
                          dir='ltr'
                        >
                          {shortId(order._id)}
                        </Link>
                      </Td>
                      <Td dir='auto'>
                        {customerLabel(order, customerFallback, (email) =>
                          t('orders.guestCustomer', { email }),
                        )}
                      </Td>
                      <Td numeric>
                        {formatCurrency(Number(order.totalPrice || 0))}
                      </Td>
                      <Td>
                        <div className='flex flex-col'>
                          <span className='text-sm text-foreground'>
                            {tv('paymentStatus', order.paymentStatus)}
                          </span>
                          {order.paymentStatus === 'refunded' && (
                            <span className='mt-1 text-xs text-muted-foreground'>
                              {t('orders.refundedAmount', {
                                amount: formatCurrency(
                                  Number(
                                    order.refundAmount ?? order.totalPrice ?? 0,
                                  ),
                                ),
                              })}
                              {order.refundedAt
                                ? ` · ${formatDate(order.refundedAt)}`
                                : ''}
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <div className='flex flex-col gap-1'>
                          <StatusBadge status={order.status}>
                            {tv('orderStatus', order.status)}
                          </StatusBadge>
                          {order.attentionReason && (
                            <StatusBadge status={order.attentionReason}>
                              {tv('attentionReason', order.attentionReason)}
                            </StatusBadge>
                          )}
                          {order.returnRequest &&
                            order.returnRequest.status !== 'none' && (
                              <StatusBadge status={order.returnRequest.status}>
                                {tv('returnStatus', order.returnRequest.status)}
                              </StatusBadge>
                            )}
                        </div>
                      </Td>
                      <Td>
                        {order.createdAt ? formatDate(order.createdAt) : '—'}
                      </Td>
                      <Td actions>
                        {next.length === 0 || !can('orders:write') ? (
                          <span className='text-xs text-muted-foreground'>
                            —
                          </span>
                        ) : (
                          <Select
                            value=''
                            disabled={updateMut.isPending}
                            aria-label={t('orders.updateStatusFor', {
                              id: order._id,
                            })}
                            onChange={(e) =>
                              void onChangeStatus(order, e.target.value)
                            }
                            className='w-32'
                          >
                            <option value=''>{t('orders.setStatus')}</option>
                            {next.map((s) => (
                              <option
                                key={s}
                                value={s}
                              >
                                {tv('orderStatus', s)}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableCard>
      )}
    </motion.div>
  );
}
