import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
// @ts-ignore
import { DataTable } from 'primereact/datatable';
// @ts-ignore
import { Column } from 'primereact/column';
// @ts-ignore
import { InputText } from 'primereact/inputtext';
// @ts-ignore
import { Dropdown } from 'primereact/dropdown';
// @ts-ignore
import { Button } from 'primereact/button';
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
import { StatusBadge } from '../components/ui/StatusBadge';
import { cn } from '../lib/cn';

// @ts-ignore - PrimeReact types are bundled
const ColumnWrapper = Column as any;
// @ts-ignore - PrimeReact types are bundled
const DropdownWrapper = Dropdown as any;
// @ts-ignore - PrimeReact types are bundled
const DataTableWrapper = DataTable as any;
// @ts-ignore - PrimeReact types are bundled
const InputTextWrapper = InputText as any;

// Filter values are API values; labels come from tv(group, value).
const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Canceled', value: 'canceled' },
  { label: 'Needs Attention', value: 'needs_attention' },
  { label: 'Refunded', value: 'refunded' },
];

// Mirrors the paymentStatus values order.controller.js accepts.
const PAYMENT_OPTIONS = [
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Failed', value: 'failed' },
  { label: 'Refunded', value: 'refunded' },
];

/** Open return steps first — the ones that need someone to act. */
const RETURN_OPTIONS = [
  { label: 'Requested', value: 'requested' },
  { label: 'Approved', value: 'approved' },
  { label: 'Received', value: 'received' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Rejected', value: 'rejected' },
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

      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end'>
        <div className='flex-1'>
          <InputTextWrapper
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            placeholder={t('orders.searchPlaceholder')}
            className='w-full'
          />
        </div>
        <DropdownWrapper
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(e: any) => {
            setStatusFilter(e.value || '');
            resetPage();
          }}
          placeholder={t('orders.filterStatus')}
          className='w-full sm:w-40'
          showClear
        />
        <DropdownWrapper
          value={paymentFilter}
          options={PAYMENT_OPTIONS}
          onChange={(e: any) => {
            setPaymentFilter(e.value || '');
            resetPage();
          }}
          placeholder={t('orders.filterPayment')}
          className='w-full sm:w-40'
          showClear
        />
        <DropdownWrapper
          value={returnFilter}
          options={RETURN_OPTIONS}
          onChange={(e: any) => {
            setReturnFilter(e.value || '');
            resetPage();
          }}
          placeholder={t('orders.filterReturn')}
          className='w-full sm:w-40'
          showClear
        />
        <Button
          label={t('orders.searchLabel')}
          onClick={onSearchSubmit}
          className='w-full sm:w-auto'
        />
        {(appliedQ || statusFilter || paymentFilter || returnFilter) && (
          <Button
            label='Clear'
            onClick={() => {
              setSearch('');
              setAppliedQ('');
              setStatusFilter('');
              setPaymentFilter('');
              setReturnFilter('');
              resetPage();
            }}
            severity='secondary'
            className='w-full sm:w-auto'
          />
        )}
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
        <div className='rounded-xl border border-gray-200 bg-card shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <DataTableWrapper
            value={orders}
            paginator
            rows={25}
            totalRecords={meta?.total}
            lazy
            onPage={table.setPage}
            first={(meta?.page ? meta.page - 1 : 0) * 25}
            loading={ordersQ.isFetching}
            emptyMessage={t('orders.empty')}
            sortField={table.sort}
            sortOrder={table.order === 'asc' ? 1 : -1}
            onSort={table.toggleSort}
            className='p-datatable-sm'
          >
            <ColumnWrapper
              field='_id'
              header={t('orders.columns.order')}
              body={(order: any) => (
                <Link
                  to={`/orders/${order._id}`}
                  className='font-mono text-xs font-semibold text-foreground hover:underline'
                  dir='ltr'
                >
                  {shortId(order._id)}
                </Link>
              )}
            />
            <ColumnWrapper
              header={t('orders.columns.customer')}
              body={(order: any) =>
                customerLabel(order, customerFallback, (email: any) =>
                  t('orders.guestCustomer', { email }),
                )
              }
            />
            <ColumnWrapper
              field='totalPrice'
              header={t('orders.columns.total')}
              sortable
              body={(order: any) =>
                formatCurrency(Number(order.totalPrice || 0))
              }
            />
            <ColumnWrapper
              field='paymentStatus'
              header={t('orders.columns.payment')}
              sortable
              body={(order: any) => (
                <div className='flex flex-col'>
                  <span className='text-sm text-foreground'>
                    {tv('paymentStatus', order.paymentStatus)}
                  </span>
                  {order.paymentStatus === 'refunded' && (
                    <span className='mt-1 text-xs text-muted-foreground'>
                      {t('orders.refundedAmount', {
                        amount: formatCurrency(
                          Number(order.refundAmount ?? order.totalPrice ?? 0),
                        ),
                      })}
                      {order.refundedAt
                        ? ` · ${formatDate(order.refundedAt)}`
                        : ''}
                    </span>
                  )}
                </div>
              )}
            />
            <ColumnWrapper
              field='status'
              header={t('orders.columns.status')}
              sortable
              body={(order: any) => (
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
              )}
            />
            <ColumnWrapper
              field='createdAt'
              header={t('orders.columns.date')}
              sortable
              body={(order: any) =>
                order.createdAt ? formatDate(order.createdAt) : '—'
              }
            />
            <ColumnWrapper
              header={t('orders.columns.nextAction')}
              body={(order: any) => {
                const next = order.allowedNextStatuses || [];
                return next.length === 0 || !can('orders:write') ? (
                  <span className='text-xs text-muted-foreground'>—</span>
                ) : (
                  <DropdownWrapper
                    value=''
                    options={next.map((s: any) => ({
                      label: tv('orderStatus', s),
                      value: s,
                    }))}
                    onChange={(e: any) => void onChangeStatus(order, e.value)}
                    placeholder={t('orders.setStatus')}
                    className='w-32'
                    disabled={updateMut.isPending}
                  />
                );
              }}
            />
          </DataTableWrapper>
        </div>
      )}
    </motion.div>
  );
}
