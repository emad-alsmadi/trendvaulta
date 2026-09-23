import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
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

const emptyForm: CouponPayload = {
  code: '',
  discountType: 'percentage',
  discountValue: 10,
  expirationDate: '',
  usageLimit: null,
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
      minimumOrderAmount: coupon.minimumOrderAmount,
      isActive: coupon.isActive,
      description: coupon.description || '',
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.discountValue || !form.expirationDate) {
      toast.error('Code, discount value, and expiration date are required.');
      return;
    }

    const payload: CouponPayload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      usageLimit:
        form.usageLimit === null || form.usageLimit === undefined
          ? null
          : Number(form.usageLimit),
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
      toast.error(errorMessage(err, 'Could not save coupon'));
    }
  }

  async function handleDelete(coupon: AdminCoupon) {
    const ok = await confirm({ message: `Deactivate / delete coupon "${coupon.code}"?`, danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(coupon._id);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete coupon'));
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
            Coupons
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Live promo codes from the API. Checkout applies coupons
            server-side.
          </p>
        </div>
        {can('coupons:write') && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add coupon
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
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code or description…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </form>

      {couponsQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">
          Loading coupons…
        </p>
      )}

      {couponsQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(couponsQ.error, 'Failed to load coupons')}
        </div>
      )}

      {!couponsQ.isLoading && !couponsQ.isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider dark:bg-gray-700">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium [&>th]:text-gray-500 dark:[&>th]:text-gray-300">
                  <SortableHeader
                    field="code"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    Code
                  </SortableHeader>
                  <SortableHeader
                    field="discountValue"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    Discount
                  </SortableHeader>
                  <th scope="col">Min order</th>
                  <th scope="col">Usage</th>
                  <SortableHeader
                    field="expirationDate"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    Expires
                  </SortableHeader>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {coupons.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No coupons found.
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr
                      key={coupon._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/60"
                    >
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {coupon.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {coupon.discountType === 'percentage'
                          ? `${coupon.discountValue}%`
                          : `$${Number(coupon.discountValue).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        ${Number(coupon.minimumOrderAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {coupon.usedCount}
                        {coupon.usageLimit != null
                          ? ` / ${coupon.usageLimit}`
                          : ' / ∞'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {toDateInput(coupon.expirationDate) || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            coupon.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {can('coupons:write') && (
                            <button
                              type="button"
                              onClick={() => openEdit(coupon)}
                              className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600"
                              aria-label={`Edit ${coupon.code}`}
                            >
                              <Pencil className="h-4 w-4 text-gray-500" />
                            </button>
                          )}
                          {can('coupons:delete') && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(coupon)}
                              disabled={deleteMut.isPending}
                              className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                              aria-label={`Delete ${coupon.code}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800" role="dialog" aria-modal="true">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editing ? 'Edit coupon' : 'Create coupon'}
              </h2>
              <button
                type="button"
                disabled={saving}
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Code
                </span>
                <input
                  required
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
                    Type
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
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                    Value
                  </span>
                  <input
                    type="number"
                    min={0}
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
                  Expiration date
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
                    Usage limit
                  </span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Unlimited"
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
                    Min order ($)
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
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={!!form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                />
                Active
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Description
                </span>
                <textarea
                  rows={2}
                  value={form.description || ''}
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editing ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
