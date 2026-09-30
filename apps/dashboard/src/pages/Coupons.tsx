import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
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
import { SortableHeader } from '../components/ui/SortableHeader';
import { TablePagination } from '../components/ui/TablePagination';
import { FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';

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
    if (form.discountType === 'percentage' && Number(form.discountValue) > 100) {
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
    const ok = await confirm({ message: t('coupons.confirmDelete', { code: coupon.code }), danger: true, confirmLabel: t('common.delete') });
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('coupons.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('coupons.subtitle')}
          </p>
        </div>
        {can('coupons:write') && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            <Plus className="me-2 h-5 w-5" aria-hidden />
            {t('coupons.add')}
          </button>
        )}
      </div>

      <form
        className="relative mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedQ(search.trim());
          resetPage();
        }}
      >
        <Search className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          type="search"
          aria-label={t('coupons.searchLabel')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('coupons.searchPlaceholder')}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 ps-10 pe-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </form>

      {couponsQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">
          {t('coupons.loading')}
        </p>
      )}

      {couponsQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(couponsQ.error, t('coupons.loadFailed'))}
        </div>
      )}

      {!couponsQ.isLoading && !couponsQ.isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider dark:bg-gray-700">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-medium [&>th]:text-gray-500 dark:[&>th]:text-gray-300">
                  <SortableHeader
                    field="code"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    {t('coupons.columns.code')}
                  </SortableHeader>
                  <SortableHeader
                    field="discountValue"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    {t('coupons.columns.discount')}
                  </SortableHeader>
                  <th scope="col">{t('coupons.columns.minOrder')}</th>
                  <th scope="col">{t('coupons.columns.usage')}</th>
                  <SortableHeader
                    field="expirationDate"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    {t('coupons.columns.expires')}
                  </SortableHeader>
                  <th scope="col">{t('common.status')}</th>
                  <th scope="col">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {coupons.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      {t('coupons.empty')}
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr
                      key={coupon._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/60"
                    >
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900 dark:text-white" dir="ltr">
                        {coupon.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {coupon.discountType === 'percentage'
                          ? `${formatNumber(coupon.discountValue)}%`
                          : formatCurrency(Number(coupon.discountValue))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(Number(coupon.minimumOrderAmount || 0))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatNumber(coupon.usedCount)}
                        {coupon.usageLimit != null
                          ? ` / ${formatNumber(coupon.usageLimit)}`
                          : ' / ∞'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {toDateInput(coupon.expirationDate)
                          ? formatDate(`${toDateInput(coupon.expirationDate)}T00:00:00`)
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            coupon.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {coupon.isActive ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {can('coupons:write') && (
                            <button
                              type="button"
                              onClick={() => openEdit(coupon)}
                              className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600"
                              aria-label={t('common.editItem', { name: coupon.code })}
                            >
                              <Pencil className="h-4 w-4 text-gray-500" aria-hidden />
                            </button>
                          )}
                          {can('coupons:delete') && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(coupon)}
                              disabled={deleteMut.isPending}
                              className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                              aria-label={t('common.deleteItem', { name: coupon.code })}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" aria-hidden />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            meta={meta}
            busy={couponsQ.isFetching}
            onPage={table.setPage}
            onLimit={table.setLimit}
          />
        </div>
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={editing ? t('coupons.form.editTitle') : t('coupons.form.createTitle')}
          busy={saving}
          maxWidthClass="max-w-lg"
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('coupons.form.code')}
              </span>
              <input
                required
                dir="ltr"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono uppercase dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  <option value="percentage">{t('coupons.form.percentage')}</option>
                  <option value="fixed">{t('coupons.form.fixed')}</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  {t('coupons.form.value')}
                </span>
                <input
                  type="number"
                  min={0}
                  max={form.discountType === 'percentage' ? 100 : undefined}
                  step="0.01"
                  required
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      discountValue: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('coupons.form.expiration')}
              </span>
              <input
                type="date"
                required
                value={form.expirationDate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    expirationDate: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  {t('coupons.form.usageLimit')}
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  placeholder={t('common.unlimited')}
                  value={form.usageLimit ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      usageLimit:
                        e.target.value === ''
                          ? null
                          : Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  {t('coupons.form.minOrder')}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.minimumOrderAmount ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      minimumOrderAmount: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('coupons.form.perCustomer')}
              </span>
              <input
                type="number"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                {t('coupons.form.perCustomerHint')}
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={!!form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              {t('common.active')}
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('common.description')}
              </span>
              <textarea
                rows={2}
                value={form.description || ''}
                dir="auto"
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
              >
                {saving ? t('common.saving') : editing ? t('common.save') : t('common.create')}
              </button>
            </div>
          </form>
        </FormDialog>
      )}
    </motion.div>
  );
}
