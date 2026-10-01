import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2 } from 'lucide-react';
// @ts-ignore
import { DataTable } from 'primereact/datatable';
// @ts-ignore
import { Column } from 'primereact/column';
// @ts-ignore
import { InputText } from 'primereact/inputtext';
// @ts-ignore
import { Button } from 'primereact/button';
// @ts-ignore
import { Dialog } from 'primereact/dialog';
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

// @ts-ignore - PrimeReact types are bundled
const ColumnWrapper = Column as any;
// @ts-ignore - PrimeReact types are bundled
const DataTableWrapper = DataTable as any;
// @ts-ignore - PrimeReact types are bundled
const InputTextWrapper = InputText as any;
// @ts-ignore - PrimeReact types are bundled
const DialogWrapper = Dialog as any;

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        title={t('coupons.title')}
        description={t('coupons.subtitle')}
        actions={
          can('coupons:write') && (
            <Button
              onClick={openCreate}
              icon={
                <Plus
                  className='icon-sm'
                  aria-hidden
                />
              }
              label={t('coupons.add')}
            />
          )
        }
      />

      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end'>
        <InputTextWrapper
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          placeholder={t('coupons.searchPlaceholder')}
          className='w-full sm:w-64'
        />
        <Button
          label={t('coupons.searchLabel')}
          onClick={() => {
            setAppliedQ(search.trim());
            resetPage();
          }}
          className='w-full sm:w-auto'
        />
        {appliedQ && (
          <Button
            label='Clear'
            onClick={() => {
              setSearch('');
              setAppliedQ('');
              resetPage();
            }}
            severity='secondary'
            className='w-full sm:w-auto'
          />
        )}
      </div>

      {couponsQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          {t('coupons.loading')}
        </p>
      )}

      {couponsQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(couponsQ.error, t('coupons.loadFailed'))}
        </div>
      )}

      {!couponsQ.isLoading && !couponsQ.isError && (
        <div className='rounded-xl border border-gray-200 bg-card shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <DataTableWrapper
            value={coupons}
            paginator
            rows={25}
            totalRecords={meta?.total}
            lazy
            onPage={table.setPage}
            first={(meta?.page ? meta.page - 1 : 0) * 25}
            loading={couponsQ.isFetching}
            emptyMessage={t('coupons.empty')}
            sortField={table.sort}
            sortOrder={table.order === 'asc' ? 1 : -1}
            onSort={table.toggleSort}
            className='p-datatable-sm'
          >
            <ColumnWrapper
              field='code'
              header={t('coupons.columns.code')}
              sortable
              body={(coupon: any) => (
                <span
                  className='font-mono text-sm font-semibold text-foreground'
                  dir='ltr'
                >
                  {coupon.code}
                </span>
              )}
            />
            <ColumnWrapper
              field='discountValue'
              header={t('coupons.columns.discount')}
              sortable
              body={(coupon: any) =>
                coupon.discountType === 'percentage'
                  ? `${formatNumber(coupon.discountValue)}%`
                  : formatCurrency(Number(coupon.discountValue))
              }
            />
            <ColumnWrapper
              field='minimumOrderAmount'
              header={t('coupons.columns.minOrder')}
              body={(coupon: any) =>
                formatCurrency(Number(coupon.minimumOrderAmount || 0))
              }
            />
            <ColumnWrapper
              header={t('coupons.columns.usage')}
              body={(coupon: any) => (
                <span className='text-sm text-muted-foreground'>
                  {formatNumber(coupon.usedCount)}
                  {coupon.usageLimit != null
                    ? ` / ${formatNumber(coupon.usageLimit)}`
                    : ' / ∞'}
                </span>
              )}
            />
            <ColumnWrapper
              field='expirationDate'
              header={t('coupons.columns.expires')}
              sortable
              body={(coupon: any) =>
                toDateInput(coupon.expirationDate)
                  ? formatDate(`${toDateInput(coupon.expirationDate)}T00:00:00`)
                  : '—'
              }
            />
            <ColumnWrapper
              field='isActive'
              header={t('common.status')}
              body={(coupon: any) => (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    coupon.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {coupon.isActive ? t('common.active') : t('common.inactive')}
                </span>
              )}
            />
            <ColumnWrapper
              header={t('common.actions')}
              body={(coupon: any) => (
                <div className='flex gap-1'>
                  {can('coupons:write') && (
                    <button
                      type='button'
                      onClick={() => openEdit(coupon)}
                      className='rounded p-1.5 hover:bg-accent transition-colors duration-200'
                      aria-label={t('common.editItem', { name: coupon.code })}
                    >
                      <Pencil
                        className='icon-sm text-muted-foreground'
                        aria-hidden
                      />
                    </button>
                  )}
                  {can('coupons:delete') && (
                    <button
                      type='button'
                      onClick={() => void handleDelete(coupon)}
                      disabled={deleteMut.isPending}
                      className='rounded p-1.5 hover:bg-destructive/10 transition-colors duration-200'
                      aria-label={t('common.deleteItem', { name: coupon.code })}
                    >
                      <Trash2
                        className='icon-sm text-muted-foreground hover:text-destructive'
                        aria-hidden
                      />
                    </button>
                  )}
                </div>
              )}
            />
          </DataTableWrapper>
        </div>
      )}

      {open && (
        <DialogWrapper
          visible={open}
          onHide={() => setOpen(false)}
          header={
            editing
              ? t('coupons.form.editTitle')
              : t('coupons.form.createTitle')
          }
          modal
          className='w-full max-w-lg'
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-3'
          >
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('coupons.form.code')}
              </span>
              <input
                required
                dir='ltr'
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                className='w-full rounded-lg border border-gray-300 px-3 py-2 font-mono uppercase dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <div className='grid grid-cols-2 gap-3'>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  {t('coupons.form.type')}
                </span>
                <select
                  value={form.discountType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      discountType: e.target.value as DiscountType,
                    }))
                  }
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                >
                  <option value='percentage'>
                    {t('coupons.form.percentage')}
                  </option>
                  <option value='fixed'>{t('coupons.form.fixed')}</option>
                </select>
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  {t('coupons.form.value')}
                </span>
                <input
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
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
            </div>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('coupons.form.expiration')}
              </span>
              <input
                type='date'
                required
                value={form.expirationDate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    expirationDate: e.target.value,
                  }))
                }
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <div className='grid grid-cols-2 gap-3'>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  {t('coupons.form.usageLimit')}
                </span>
                <input
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
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  {t('coupons.form.minOrder')}
                </span>
                <input
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
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
            </div>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('coupons.form.perCustomer')}
              </span>
              <input
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
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
              <span className='mt-1 block text-xs text-gray-500 dark:text-gray-400'>
                {t('coupons.form.perCustomerHint')}
              </span>
            </label>
            <label className='flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300'>
              <input
                type='checkbox'
                checked={!!form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              {t('common.active')}
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('common.description')}
              </span>
              <textarea
                rows={2}
                value={form.description || ''}
                dir='auto'
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <div className='flex justify-end gap-2 pt-2'>
              <Button
                type='button'
                disabled={saving}
                onClick={() => setOpen(false)}
                severity='secondary'
                label={t('common.cancel')}
              />
              <Button
                type='submit'
                disabled={saving}
                label={
                  saving
                    ? t('common.saving')
                    : editing
                      ? t('common.save')
                      : t('common.create')
                }
              />
            </div>
          </form>
        </DialogWrapper>
      )}
    </motion.div>
  );
}
