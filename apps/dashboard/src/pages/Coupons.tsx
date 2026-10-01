import { useState } from 'react';
import { Plus, Pencil, TicketPercent, Trash2 } from 'lucide-react';
import {
  useAdminCoupons,
  useCreateCouponMutation,
  useDeleteCouponMutation,
  useUpdateCouponMutation,
} from '../hooks/useAdminCoupons';
import {
  errorMessage,
  type AdminCoupon,
  type CouponPayload,
  type DiscountType,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useTableQuery } from '../hooks/useTableQuery';
import { useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import {
  DataTable,
  RowActions,
  type DataTableColumn,
} from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { Field, Input, Select, Switch, Textarea } from '../components/ui/Field';
import { FormActions, FormDialog } from '../components/ui/FormDialog';
import { StatusBadge } from '../components/ui/StatusBadge';

const emptyForm: CouponPayload = {
  code: '',
  discountType: 'percentage',
  discountValue: 10,
  expirationDate: '',
  usageLimit: null,
  perCustomerLimit: null,
  minimumOrderAmount: 0,
  isActive: true,
  description: '',
};

function toDateInput(value: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function Coupons() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatCurrency, formatDate, formatNumber } = useT();
  const table = useTableQuery({ limit: 25, sort: 'createdAt', order: 'desc' });
  const { resetPage } = table;

  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const couponsQ = useAdminCoupons({
    ...table.params,
    q: appliedQ || undefined,
  });
  const createMut = useCreateCouponMutation();
  const updateMut = useUpdateCouponMutation();
  const deleteMut = useDeleteCouponMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<CouponPayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const coupons = couponsQ.data?.data || [];
  const meta = couponsQ.data?.meta;

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(coupon: AdminCoupon) {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      expirationDate: toDateInput(coupon.expirationDate),
      usageLimit: coupon.usageLimit,
      perCustomerLimit: coupon.perCustomerLimit ?? null,
      minimumOrderAmount: coupon.minimumOrderAmount,
      isActive: coupon.isActive,
      description: coupon.description || '',
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.discountValue || !form.expirationDate) {
      toast.error(t('coupons.required'));
      return;
    }
    if (
      form.discountType === 'percentage' &&
      Number(form.discountValue) > 100
    ) {
      toast.error(t('coupons.percentTooHigh'));
      return;
    }

    const payload: CouponPayload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      usageLimit:
        form.usageLimit === null || form.usageLimit === undefined
          ? null
          : Number(form.usageLimit),
      perCustomerLimit:
        form.perCustomerLimit === null || form.perCustomerLimit === undefined
          ? null
          : Number(form.perCustomerLimit),
      minimumOrderAmount: Number(form.minimumOrderAmount || 0),
      discountValue: Number(form.discountValue),
    };

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing._id, payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err, t('coupons.saveFailed')));
    }
  }

  async function handleDelete(coupon: AdminCoupon) {
    const ok = await confirm({
      message: t('coupons.confirmDelete', { code: coupon.code }),
      danger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(coupon._id);
    } catch (err) {
      toast.error(errorMessage(err, t('coupons.deleteFailed')));
    }
  }

  const columns: DataTableColumn<AdminCoupon>[] = [
    {
      key: 'code',
      header: t('coupons.columns.code'),
      sortable: true,
      cell: (coupon) => (
        <div className='min-w-0'>
          <span
            className='inline-block rounded-control border border-dashed border-border-strong bg-muted px-2 py-0.5 font-mono text-body-sm font-semibold text-foreground'
            dir='ltr'
          >
            {coupon.code}
          </span>
          {coupon.description && (
            <p
              className='mt-1 max-w-[18rem] truncate text-xs text-muted-foreground'
              dir='auto'
            >
              {coupon.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'discountValue',
      header: t('coupons.columns.discount'),
      sortable: true,
      numeric: true,
      className: 'font-medium',
      cell: (coupon) =>
        coupon.discountType === 'percentage'
          ? `${formatNumber(coupon.discountValue)}%`
          : formatCurrency(Number(coupon.discountValue)),
    },
    {
      key: 'minimumOrderAmount',
      header: t('coupons.columns.minOrder'),
      numeric: true,
      cell: (coupon) => formatCurrency(Number(coupon.minimumOrderAmount || 0)),
    },
    {
      key: 'usage',
      header: t('coupons.columns.usage'),
      numeric: true,
      className: 'text-muted-foreground',
      cell: (coupon) => (
        <>
          <span className='text-foreground'>
            {formatNumber(coupon.usedCount)}
          </span>
          {coupon.usageLimit != null
            ? ` / ${formatNumber(coupon.usageLimit)}`
            : ' / ∞'}
        </>
      ),
    },
    {
      key: 'expirationDate',
      header: t('coupons.columns.expires'),
      sortable: true,
      className: 'whitespace-nowrap',
      cell: (coupon) =>
        toDateInput(coupon.expirationDate)
          ? formatDate(`${toDateInput(coupon.expirationDate)}T00:00:00`)
          : '—',
    },
    {
      key: 'isActive',
      header: t('common.status'),
      cell: (coupon) => (
        <StatusBadge status={coupon.isActive ? 'active' : 'inactive'}>
          {coupon.isActive ? t('common.active') : t('common.inactive')}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      actions: true,
      cell: (coupon) => (
        <RowActions>
          {can('coupons:write') && (
            <IconButton
              icon={<Pencil aria-hidden />}
              label={t('common.editItem', { name: coupon.code })}
              onClick={() => openEdit(coupon)}
            />
          )}
          {can('coupons:delete') && (
            <IconButton
              icon={<Trash2 aria-hidden />}
              label={t('common.deleteItem', { name: coupon.code })}
              onClick={() => void handleDelete(coupon)}
              disabled={deleteMut.isPending}
            />
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('coupons.title')}
        description={t('coupons.subtitle')}
        actions={
          can('coupons:write') && (
            <Button
              variant='primary'
              onClick={openCreate}
              icon={<Plus aria-hidden />}
            >
              {t('coupons.add')}
            </Button>
          )
        }
      />

      {couponsQ.isError ? (
        <Alert tone='error'>
          {errorMessage(couponsQ.error, t('coupons.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('coupons.title')}
          data={coupons}
          columns={columns}
          getKey={(coupon) => coupon._id}
          loading={couponsQ.isLoading}
          fetching={couponsQ.isFetching}
          sort={table.sort}
          order={table.order}
          onSort={table.toggleSort}
          meta={meta}
          onPage={table.setPage}
          onLimit={table.setLimit}
          emptyIcon={<TicketPercent aria-hidden />}
          emptyTitle={t('coupons.empty')}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                onSubmit: () => {
                  setAppliedQ(search.trim());
                  resetPage();
                },
                placeholder: t('coupons.searchPlaceholder'),
                label: t('coupons.searchLabel'),
                submitLabel: t('common.search'),
              }}
              canClear={Boolean(appliedQ)}
              onClear={() => {
                setSearch('');
                setAppliedQ('');
                resetPage();
              }}
            />
          }
        />
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={
            editing
              ? t('coupons.form.editTitle')
              : t('coupons.form.createTitle')
          }
          busy={saving}
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-4'
          >
            <Field
              label={t('coupons.form.code')}
              required
            >
              <Input
                required
                dir='ltr'
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                className='font-mono uppercase'
              />
            </Field>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field label={t('coupons.form.type')}>
                <Select
                  value={form.discountType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      discountType: e.target.value as DiscountType,
                    }))
                  }
                >
                  <option value='percentage'>
                    {t('coupons.form.percentage')}
                  </option>
                  <option value='fixed'>{t('coupons.form.fixed')}</option>
                </Select>
              </Field>
              <Field
                label={t('coupons.form.value')}
                required
              >
                <Input
                  type='number'
                  min={0}
                  max={form.discountType === 'percentage' ? 100 : undefined}
                  step='0.01'
                  required
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      discountValue: Number(e.target.value),
                    }))
                  }
                />
              </Field>
              <Field
                label={t('coupons.form.expiration')}
                required
              >
                <Input
                  type='date'
                  required
                  value={form.expirationDate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      expirationDate: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label={t('coupons.form.minOrder')}>
                <Input
                  type='number'
                  min={0}
                  step='0.01'
                  value={form.minimumOrderAmount ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      minimumOrderAmount: Number(e.target.value),
                    }))
                  }
                />
              </Field>
              <Field label={t('coupons.form.usageLimit')}>
                <Input
                  type='number'
                  min={1}
                  step={1}
                  placeholder={t('common.unlimited')}
                  value={form.usageLimit ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      usageLimit:
                        e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
              </Field>
              <Field
                label={t('coupons.form.perCustomer')}
                hint={t('coupons.form.perCustomerHint')}
              >
                <Input
                  type='number'
                  min={1}
                  step={1}
                  placeholder={t('common.unlimited')}
                  value={form.perCustomerLimit ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      perCustomerLimit:
                        e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
              </Field>
            </div>
            <Field label={t('common.description')}>
              <Textarea
                rows={2}
                value={form.description || ''}
                dir='auto'
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className='min-h-16'
              />
            </Field>
            <Switch
              checked={!!form.isActive}
              onCheckedChange={(isActive) =>
                setForm((f) => ({ ...f, isActive }))
              }
              label={t('common.active')}
            />
            <FormActions
              onCancel={() => setOpen(false)}
              saving={saving}
              submitLabel={editing ? t('common.save') : t('common.create')}
            />
          </form>
        </FormDialog>
      )}
    </>
  );
}
