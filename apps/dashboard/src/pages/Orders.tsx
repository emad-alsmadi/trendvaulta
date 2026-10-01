import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, ShoppingCart } from 'lucide-react';
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
import { useT } from '../i18n/I18nProvider';
import { orderStatusOutcome } from '../lib/orderStatusOutcome';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { FilterBar, FilterBarItem } from '../components/ui/FilterBar';
import { Select } from '../components/ui/Field';
import { StatusBadge, Tag } from '../components/ui/StatusBadge';
import { cn } from '../lib/cn';

// Filter values are API values; labels come from tv(group, value).
const STATUS_OPTIONS = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'canceled',
  'needs_attention',
  'refunded',
];

// Mirrors the paymentStatus values order.controller.js accepts.
const PAYMENT_OPTIONS = ['unpaid', 'pending', 'paid', 'failed', 'refunded'];

/** Open return steps first — the ones that need someone to act. */
const RETURN_OPTIONS = [
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

  function onSearchSubmit() {
    setAppliedQ(search.trim());
    resetPage();
  }

  const columns: DataTableColumn<AdminOrder>[] = [
    {
      key: '_id',
      header: t('orders.columns.order'),
      cell: (order) => (
        <Link
          to={`/orders/${order._id}`}
          className='rounded font-mono text-body-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          dir='ltr'
        >
          #{shortId(order._id)}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: t('orders.columns.customer'),
      className: 'max-w-[16rem]',
      cell: (order) => (
        <span
          className='block truncate'
          dir='auto'
        >
          {customerLabel(order, customerFallback, (email: string) =>
            t('orders.guestCustomer', { email }),
          )}
        </span>
      ),
    },
    {
      key: 'totalPrice',
      header: t('orders.columns.total'),
      sortable: true,
      numeric: true,
      className: 'font-medium',
      cell: (order) => formatCurrency(Number(order.totalPrice || 0)),
    },
    {
      key: 'paymentStatus',
      header: t('orders.columns.payment'),
      sortable: true,
      cell: (order) => (
        <div className='flex flex-col items-start gap-1'>
          <StatusBadge status={order.paymentStatus}>
            {tv('paymentStatus', order.paymentStatus)}
          </StatusBadge>
          {order.paymentStatus === 'refunded' && (
            <span className='text-xs text-muted-foreground'>
              {t('orders.refundedAmount', {
                amount: formatCurrency(
                  Number(order.refundAmount ?? order.totalPrice ?? 0),
                ),
              })}
              {order.refundedAt ? ` · ${formatDate(order.refundedAt)}` : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('orders.columns.status'),
      sortable: true,
      cell: (order) => (
        <div className='flex flex-col items-start gap-1'>
          <StatusBadge status={order.status}>
            {tv('orderStatus', order.status)}
          </StatusBadge>
          {order.attentionReason && (
            <StatusBadge
              status={order.attentionReason}
              tone='attention'
            >
              {tv('attentionReason', order.attentionReason)}
            </StatusBadge>
          )}
          {order.returnRequest && order.returnRequest.status !== 'none' && (
            <StatusBadge status={order.returnRequest.status}>
              {tv('returnStatus', order.returnRequest.status)}
            </StatusBadge>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: t('orders.columns.date'),
      sortable: true,
      className: 'whitespace-nowrap text-muted-foreground',
      cell: (order) => (order.createdAt ? formatDate(order.createdAt) : '—'),
    },
    {
      key: 'nextAction',
      header: t('orders.columns.nextAction'),
      cell: (order) => {
        const next = order.allowedNextStatuses || [];
        return next.length === 0 || !can('orders:write') ? (
          <span className='text-muted-foreground'>—</span>
        ) : (
          <Select
            size='sm'
            value=''
            placeholder={t('orders.setStatus')}
            aria-label={t('orders.updateStatusFor', {
              id: shortId(order._id),
            })}
            onChange={(e) => void onChangeStatus(order, e.target.value)}
            disabled={updateMut.isPending}
            wrapperClassName='w-36'
            options={next.map((s: string) => ({
              value: s,
              label: tv('orderStatus', s),
            }))}
          />
        );
      },
    },
  ];

  const hasFilters = Boolean(
    appliedQ || statusFilter || paymentFilter || returnFilter,
  );

  return (
    <>
      <PageHeader
        title={t('orders.title')}
        description={t('orders.subtitle')}
        actions={
          <Button
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

      {!hasToken && (
        <Alert
          tone='warning'
          className='mb-4'
          action={
            <Link
              to='/login'
              className='text-sm font-semibold underline underline-offset-4'
            >
              {t('orders.goToLogin')}
            </Link>
          }
        >
          {t('orders.signInHint', {
            read: 'orders:read',
            write: 'orders:write',
          })}
        </Alert>
      )}

      {ordersQ.isError ? (
        <Alert tone='error'>
          {errorMessage(ordersQ.error, t('orders.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('orders.title')}
          data={orders}
          columns={columns}
          getKey={(order) => order._id}
          loading={ordersQ.isLoading}
          fetching={ordersQ.isFetching}
          sort={table.sort}
          order={table.order}
          onSort={table.toggleSort}
          meta={meta}
          onPage={table.setPage}
          onLimit={table.setLimit}
          minWidthClass='min-w-[960px]'
          emptyIcon={<ShoppingCart aria-hidden />}
          emptyTitle={t('orders.empty')}
          toolbar={
            <div className='space-y-3'>
              <FilterBar
                search={{
                  value: search,
                  onChange: setSearch,
                  onSubmit: onSearchSubmit,
                  placeholder: t('orders.searchPlaceholder'),
                  label: t('orders.searchLabel'),
                  submitLabel: t('common.search'),
                }}
                canClear={hasFilters}
                onClear={() => {
                  setSearch('');
                  setAppliedQ('');
                  setStatusFilter('');
                  setPaymentFilter('');
                  setReturnFilter('');
                  resetPage();
                }}
              >
                <FilterBarItem className='sm:w-40'>
                  <Select
                    aria-label={t('orders.filterStatus')}
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      resetPage();
                    }}
                  >
                    <option value=''>{t('orders.allStatuses')}</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option
                        key={s}
                        value={s}
                      >
                        {tv('orderStatus', s)}
                      </option>
                    ))}
                  </Select>
                </FilterBarItem>
                <FilterBarItem className='sm:w-40'>
                  <Select
                    aria-label={t('orders.filterPayment')}
                    value={paymentFilter}
                    onChange={(e) => {
                      setPaymentFilter(e.target.value);
                      resetPage();
                    }}
                  >
                    <option value=''>{t('orders.allPayments')}</option>
                    {PAYMENT_OPTIONS.map((s) => (
                      <option
                        key={s}
                        value={s}
                      >
                        {tv('paymentStatus', s)}
                      </option>
                    ))}
                  </Select>
                </FilterBarItem>
                <FilterBarItem className='sm:w-40'>
                  <Select
                    aria-label={t('orders.filterReturn')}
                    value={returnFilter}
                    onChange={(e) => {
                      setReturnFilter(e.target.value);
                      resetPage();
                    }}
                  >
                    <option value=''>{t('orders.allReturns')}</option>
                    {RETURN_OPTIONS.map((s) => (
                      <option
                        key={s}
                        value={s}
                      >
                        {tv('returnStage', s)}
                      </option>
                    ))}
                  </Select>
                </FilterBarItem>
              </FilterBar>
              {customerId && (
                <div className='flex flex-wrap items-center gap-2 text-body-sm text-muted-foreground'>
                  {t('orders.ordersFor')}
                  <Tag
                    onRemove={clearCustomer}
                    removeLabel={t('orders.showAllCustomers')}
                  >
                    <span dir='auto'>
                      {orders[0]
                        ? customerLabel(orders[0], customerFallback)
                        : t('orders.selectedCustomer')}
                    </span>
                    {meta ? ` · ${formatNumber(meta.total)}` : ''}
                  </Tag>
                </div>
              )}
            </div>
          }
        />
      )}
    </>
  );
}
