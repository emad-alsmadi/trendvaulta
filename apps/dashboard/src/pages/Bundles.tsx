import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  useAdminBundles,
  useCreateBundleMutation,
  useDeleteBundleMutation,
  useUpdateBundleMutation,
} from '../hooks/useAdminBundles';
import { errorMessage, type AdminBundle, type BundlePayload } from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useTableQuery } from '../hooks/useTableQuery';
import { SortableHeader } from '../components/ui/SortableHeader';
import { TablePagination } from '../components/ui/TablePagination';
import { FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';

const emptyForm: BundlePayload = {
  primaryProduct: '',
  items: [
    { product: '', quantity: 1 },
    { product: '', quantity: 1 },
  ],
  bundlePrice: 0,
  savings: 0,
  active: true,
};

/** Products are hard-deleted, so a populated primaryProduct can be null. */
function primaryTitle(bundle: AdminBundle, deletedLabel: string) {
  return bundle.primaryProduct?.title || deletedLabel;
}

export default function Bundles() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatCurrency, formatNumber } = useT();
  const titleOf = (b: AdminBundle) => primaryTitle(b, t('bundles.deletedProduct'));
  const table = useTableQuery({ limit: 25, sort: 'createdAt', order: 'desc' });
  const { resetPage } = table;
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const bundlesQ = useAdminBundles({
    ...table.params,
    q: appliedQ || undefined,
  });
  const createMut = useCreateBundleMutation();
  const updateMut = useUpdateBundleMutation();
  const deleteMut = useDeleteBundleMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBundle | null>(null);
  const [form, setForm] = useState<BundlePayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const bundles = bundlesQ.data?.data || [];
  const meta = bundlesQ.data?.meta;

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(bundle: AdminBundle) {
    setEditing(bundle);
    setForm({
      // A deleted product populates as null — leave the field empty so the
      // admin picks a replacement instead of the page crashing.
      primaryProduct: bundle.primaryProduct?._id ?? '',
      // Admin list populates items[].product; the form works with ids.
      items: bundle.items.map((item) => ({
        product:
          typeof item.product === 'string'
            ? item.product
            : (item.product?._id ?? ''),
        quantity: item.quantity,
      })),
      bundlePrice: bundle.bundlePrice,
      savings: bundle.savings,
      active: bundle.active,
    });
    setOpen(true);
  }

  function updateItem(
    index: number,
    field: 'product' | 'quantity',
    value: string | number,
  ) {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm((f) => ({ ...f, items: newItems }));
  }

  function addItem() {
    setForm((f) => ({
      ...f,
      items: [...f.items, { product: '', quantity: 1 }],
    }));
  }

  function removeItem(index: number) {
    if (form.items.length <= 2) return;
    const newItems = form.items.filter((_, i) => i !== index);
    setForm((f) => ({ ...f, items: newItems }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.primaryProduct.trim()) {
      toast.error(t('bundles.primaryRequired'));
      return;
    }
    if (!form.items || form.items.length < 2) {
      toast.error(t('bundles.minItems'));
      return;
    }
    const hasEmptyItem = form.items.some((item) => !item.product.trim());
    if (hasEmptyItem) {
      toast.error(t('bundles.emptyItem'));
      return;
    }

    const payload: BundlePayload = {
      primaryProduct: form.primaryProduct.trim(),
      items: form.items.map((item) => ({
        product: item.product.trim(),
        quantity: Number(item.quantity) || 1,
      })),
      bundlePrice: Number(form.bundlePrice) || 0,
      savings: Number(form.savings) || 0,
      active: !!form.active,
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
      toast.error(errorMessage(err, t('bundles.saveFailed')));
    }
  }

  async function handleDelete(bundle: AdminBundle) {
    const ok = await confirm({ message: t('bundles.confirmDelete', { title: titleOf(bundle) }), danger: true, confirmLabel: t('common.delete') });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(bundle._id);
    } catch (err) {
      toast.error(errorMessage(err, t('bundles.deleteFailed')));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            {t('bundles.title')}
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            {t('bundles.subtitle')}
          </p>
        </div>
        {can('content:write') && (
          <button
            type='button'
            onClick={openCreate}
            className='inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
          >
            <Plus className='me-2 h-5 w-5' aria-hidden />
            {t('bundles.add')}
          </button>
        )}
      </div>

      <form
        className='relative mb-6'
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedQ(search.trim());
          resetPage();
        }}
      >
        <Search className='absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400' aria-hidden />
        <input
          type='search'
          aria-label={t('bundles.searchLabel')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('bundles.searchPlaceholder')}
          className='w-full rounded-lg border border-gray-300 bg-white py-2 ps-10 pe-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        />
      </form>

      {bundlesQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          {t('bundles.loading')}
        </p>
      )}

      {bundlesQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(bundlesQ.error, t('bundles.loadFailed'))}
        </div>
      )}

      {!bundlesQ.isLoading && !bundlesQ.isError && (
        <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[800px]'>
              <thead className='bg-gray-50 text-xs uppercase tracking-wider dark:bg-gray-700'>
                <tr className='[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-medium [&>th]:text-gray-500 dark:[&>th]:text-gray-300'>
                  <th scope='col'>{t('bundles.columns.primary')}</th>
                  <th scope='col'>{t('bundles.columns.items')}</th>
                  <SortableHeader
                    field='bundlePrice'
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    {t('bundles.columns.price')}
                  </SortableHeader>
                  <SortableHeader
                    field='savings'
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    {t('bundles.columns.savings')}
                  </SortableHeader>
                  <th scope='col'>{t('common.status')}</th>
                  <th scope='col'>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {bundles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className='px-4 py-10 text-center text-sm text-gray-500'
                    >
                      {t('bundles.empty')}
                    </td>
                  </tr>
                ) : (
                  bundles.map((bundle) => (
                    <tr
                      key={bundle._id}
                      className='hover:bg-gray-50 dark:hover:bg-gray-700/60'
                    >
                      <td className='px-4 py-3 text-sm text-gray-900 dark:text-white' dir='auto'>
                        {titleOf(bundle)}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 dark:text-gray-400'>
                        {t('bundles.itemCount', { count: formatNumber(bundle.items.length) })}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-900 dark:text-white'>
                        {formatCurrency(bundle.bundlePrice)}
                      </td>
                      <td className='px-4 py-3 text-sm text-green-600 dark:text-green-400'>
                        {formatCurrency(bundle.savings)}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            bundle.active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {bundle.active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex gap-1'>
                          {can('content:write') && (
                            <button
                              type='button'
                              onClick={() => openEdit(bundle)}
                              className='rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600'
                              aria-label={t('common.editItem', { name: titleOf(bundle) })}
                            >
                              <Pencil className='h-4 w-4 text-gray-500' aria-hidden />
                            </button>
                          )}
                          {can('content:delete') && (
                            <button
                              type='button'
                              onClick={() => void handleDelete(bundle)}
                              disabled={deleteMut.isPending}
                              className='rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40'
                              aria-label={t('common.deleteItem', { name: titleOf(bundle) })}
                            >
                              <Trash2 className='h-4 w-4 text-red-500' aria-hidden />
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
            busy={bundlesQ.isFetching}
            onPage={table.setPage}
            onLimit={table.setLimit}
          />
        </div>
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={editing ? t('bundles.form.editTitle') : t('bundles.form.createTitle')}
          busy={saving}
          maxWidthClass='max-w-2xl'
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-3'
          >
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('bundles.form.primaryId')}
              </span>
              <input
                required
                value={form.primaryProduct}
                onChange={(e) =>
                  setForm((f) => ({ ...f, primaryProduct: e.target.value }))
                }
                placeholder={t('bundles.form.productId')}
                dir='ltr'
                className='w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <div>
              <span className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                {t('bundles.form.items')}
              </span>
              {form.items.map((item, index) => (
                <div
                  key={index}
                  className='mb-2 flex gap-2'
                >
                  <input
                    required
                    value={item.product}
                    onChange={(e) =>
                      updateItem(index, 'product', e.target.value)
                    }
                    placeholder={t('bundles.form.productId')}
                    aria-label={t('bundles.form.itemProduct', { n: index + 1 })}
                    dir='ltr'
                    className='flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  />
                  <input
                    type='number'
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, 'quantity', e.target.value)
                    }
                    placeholder={t('bundles.form.qty')}
                    aria-label={t('bundles.form.itemQty', { n: index + 1 })}
                    className='w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  />
                  {form.items.length > 2 && (
                    <button
                      type='button'
                      onClick={() => removeItem(index)}
                      aria-label={t('bundles.form.removeItem', { n: index + 1 })}
                      className='rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400'
                    >
                      {t('bundles.form.remove')}
                    </button>
                  )}
                </div>
              ))}
              <button
                type='button'
                onClick={addItem}
                className='mt-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
              >
                {t('bundles.form.addItem')}
              </button>
            </div>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('bundles.form.price')}
              </span>
              <input
                required
                type='number'
                step='0.01'
                min={0}
                value={form.bundlePrice}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    bundlePrice: Number(e.target.value),
                  }))
                }
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('bundles.form.savings')}
              </span>
              <input
                required
                type='number'
                step='0.01'
                min={0}
                value={form.savings}
                onChange={(e) =>
                  setForm((f) => ({ ...f, savings: Number(e.target.value) }))
                }
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300'>
              <input
                type='checkbox'
                checked={!!form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              {t('common.active')}
            </label>
            <div className='flex justify-end gap-2 pt-2'>
              <button
                type='button'
                disabled={saving}
                onClick={() => setOpen(false)}
                className='rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              >
                {t('common.cancel')}
              </button>
              <button
                type='submit'
                disabled={saving}
                className='rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60'
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
