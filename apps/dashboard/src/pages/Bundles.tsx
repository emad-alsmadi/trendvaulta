import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
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

export default function Bundles() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const bundlesQ = useAdminBundles({ limit: 100 });
  const createMut = useCreateBundleMutation();
  const updateMut = useUpdateBundleMutation();
  const deleteMut = useDeleteBundleMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBundle | null>(null);
  const [form, setForm] = useState<BundlePayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = bundlesQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (b) =>
        b.primaryProduct.title.toLowerCase().includes(q) ||
        b.primaryProduct._id.toLowerCase().includes(q),
    );
  }, [bundlesQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(bundle: AdminBundle) {
    setEditing(bundle);
    setForm({
      primaryProduct: bundle.primaryProduct._id,
      // Admin list populates items[].product; the form works with ids.
      items: bundle.items.map((item) => ({
        product:
          typeof item.product === 'string' ? item.product : item.product._id,
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
      toast.error('Primary product is required.');
      return;
    }
    if (!form.items || form.items.length < 2) {
      toast.error('At least 2 items are required.');
      return;
    }
    const hasEmptyItem = form.items.some((item) => !item.product.trim());
    if (hasEmptyItem) {
      toast.error('All items must have a product selected.');
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
      toast.error(errorMessage(err, 'Could not save bundle'));
    }
  }

  async function handleDelete(bundle: AdminBundle) {
    const ok = await confirm({ message: `Deactivate bundle for "${bundle.primaryProduct.title}"?`, danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(bundle._id);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete bundle'));
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
            Bundles
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            Frequently bought together product bundles.
          </p>
        </div>
        {can('content:write') && (
          <button
            type='button'
            onClick={openCreate}
            className='inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
          >
            <Plus className='mr-2 h-5 w-5' />
            Add bundle
          </button>
        )}
      </div>

      <div className='relative mb-6'>
        <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400' />
        <input
          type='search'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search by primary product…'
          className='w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        />
      </div>

      {bundlesQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          Loading bundles…
        </p>
      )}

      {bundlesQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(bundlesQ.error, 'Failed to load bundles')}
        </div>
      )}

      {!bundlesQ.isLoading && !bundlesQ.isError && (
        <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[800px]'>
              <thead className='bg-gray-50 dark:bg-gray-700'>
                <tr>
                  {[
                    'Primary Product',
                    'Items',
                    'Bundle Price',
                    'Savings',
                    'Status',
                    'Actions',
                  ].map((h) => (
                    <th
                      key={h}
                      className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300'
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className='px-4 py-10 text-center text-sm text-gray-500'
                    >
                      No bundles found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((bundle) => (
                    <tr
                      key={bundle._id}
                      className='hover:bg-gray-50 dark:hover:bg-gray-700/60'
                    >
                      <td className='px-4 py-3 text-sm text-gray-900 dark:text-white'>
                        {bundle.primaryProduct.title}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 dark:text-gray-400'>
                        {bundle.items.length} items
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-900 dark:text-white'>
                        ${bundle.bundlePrice.toFixed(2)}
                      </td>
                      <td className='px-4 py-3 text-sm text-green-600 dark:text-green-400'>
                        ${bundle.savings.toFixed(2)}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            bundle.active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {bundle.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex gap-1'>
                          {can('content:write') && (
                            <button
                              type='button'
                              onClick={() => openEdit(bundle)}
                              className='rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600'
                              aria-label={`Edit ${bundle.primaryProduct.title}`}
                            >
                              <Pencil className='h-4 w-4 text-gray-500' />
                            </button>
                          )}
                          {can('content:delete') && (
                            <button
                              type='button'
                              onClick={() => void handleDelete(bundle)}
                              disabled={deleteMut.isPending}
                              className='rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40'
                              aria-label={`Delete ${bundle.primaryProduct.title}`}
                            >
                              <Trash2 className='h-4 w-4 text-red-500' />
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
          {bundlesQ.data?.meta && (
            <p className='border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700'>
              Showing {filtered.length} of {bundlesQ.data.meta.total} bundles
            </p>
          )}
        </div>
      )}

      {open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800' role='dialog' aria-modal='true'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                {editing ? 'Edit bundle' : 'Create bundle'}
              </h2>
              <button
                type='button'
                disabled={saving}
                onClick={() => setOpen(false)}
                className='rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className='space-y-3'
            >
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Primary Product ID
                </span>
                <input
                  required
                  value={form.primaryProduct}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, primaryProduct: e.target.value }))
                  }
                  placeholder='Product ID'
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <div>
                <span className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Bundle Items (at least 2)
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
                      placeholder='Product ID'
                      className='flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                    />
                    <input
                      type='number'
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, 'quantity', e.target.value)
                      }
                      placeholder='Qty'
                      className='w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                    />
                    {form.items.length > 2 && (
                      <button
                        type='button'
                        onClick={() => removeItem(index)}
                        className='rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400'
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type='button'
                  onClick={addItem}
                  className='mt-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                >
                  + Add item
                </button>
              </div>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Bundle Price
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
                  Savings
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
                Active
              </label>
              <div className='flex justify-end gap-2 pt-2'>
                <button
                  type='button'
                  disabled={saving}
                  onClick={() => setOpen(false)}
                  className='rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={saving}
                  className='rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60'
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
