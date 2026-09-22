import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import {
  useAdminStorefrontModules,
  useCreateStorefrontModuleMutation,
  useDeleteStorefrontModuleMutation,
  useUpdateStorefrontModuleMutation,
} from '../hooks/useAdminStorefrontModules';
import {
  errorMessage,
  type AdminStorefrontModule,
  type StorefrontModulePayload,
  type StorefrontModuleType,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';

const MODULE_TYPES: StorefrontModuleType[] = [
  'hero_carousel',
  'trust_strip',
  'featured_brands',
  'bestsellers',
  'new_arrivals',
  'deals_rail',
  'lookbooks',
  'testimonials',
  'categories',
  'why_choose_us',
];

const emptyForm: StorefrontModulePayload = {
  key: '',
  type: 'hero_carousel',
  title: '',
  active: true,
  sortOrder: 0,
  slides: [],
  trustItems: [],
  limit: 8,
  items: [],
};

export default function StorefrontModules() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const modulesQ = useAdminStorefrontModules({ limit: 100 });
  const createMut = useCreateStorefrontModuleMutation();
  const updateMut = useUpdateStorefrontModuleMutation();
  const deleteMut = useDeleteStorefrontModuleMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminStorefrontModule | null>(null);
  const [form, setForm] = useState<StorefrontModulePayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = modulesQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.key.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q) ||
        (m.title || '').toLowerCase().includes(q),
    );
  }, [modulesQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(module: AdminStorefrontModule) {
    setEditing(module);
    setForm({
      key: module.key,
      type: module.type,
      title: module.title || '',
      active: module.active,
      sortOrder: module.sortOrder,
      config: module.config || {},
      slides: module.slides || [],
      trustItems: module.trustItems || [],
      limit: module.limit || 8,
      items: module.items || [],
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.key.trim() || !form.type) {
      toast.error('Key and type are required.');
      return;
    }

    const payload: StorefrontModulePayload = {
      ...form,
      key: form.key.trim(),
      title: (form.title || '').trim(),
      active: !!form.active,
      sortOrder: Number(form.sortOrder || 0),
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
      toast.error(errorMessage(err, 'Could not save module'));
    }
  }

  async function handleDelete(module: AdminStorefrontModule) {
    const ok = await confirm({ message: `Deactivate module "${module.key}" (${module.type})?`, danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(module._id);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete module'));
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
            Storefront Modules
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            Homepage sections and content blocks.
          </p>
        </div>
        {can('content:write') && (
          <button
            type='button'
            onClick={openCreate}
            className='inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
          >
            <Plus className='mr-2 h-5 w-5' />
            Add module
          </button>
        )}
      </div>

      <div className='relative mb-6'>
        <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400' />
        <input
          type='search'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search by key, type, or title…'
          className='w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        />
      </div>

      {modulesQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          Loading modules…
        </p>
      )}

      {modulesQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(modulesQ.error, 'Failed to load modules')}
        </div>
      )}

      {!modulesQ.isLoading && !modulesQ.isError && (
        <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[800px]'>
              <thead className='bg-gray-50 dark:bg-gray-700'>
                <tr>
                  {['Key', 'Type', 'Title', 'Order', 'Status', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300'
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className='px-4 py-10 text-center text-sm text-gray-500'
                    >
                      No modules found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((module) => (
                    <tr
                      key={module._id}
                      className='hover:bg-gray-50 dark:hover:bg-gray-700/60'
                    >
                      <td className='px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400'>
                        {module.key}
                      </td>
                      <td className='px-4 py-3'>
                        <span className='inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                          {module.type}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-900 dark:text-white'>
                        {module.title || '—'}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 dark:text-gray-400'>
                        {module.sortOrder}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            module.active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {module.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex gap-1'>
                          {can('content:write') && (
                            <button
                              type='button'
                              onClick={() => openEdit(module)}
                              className='rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600'
                              aria-label={`Edit ${module.key}`}
                            >
                              <Pencil className='h-4 w-4 text-gray-500' />
                            </button>
                          )}
                          {can('content:delete') && (
                            <button
                              type='button'
                              onClick={() => void handleDelete(module)}
                              disabled={deleteMut.isPending}
                              className='rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40'
                              aria-label={`Delete ${module.key}`}
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
          {modulesQ.data?.meta && (
            <p className='border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700'>
              Showing {filtered.length} of {modulesQ.data.meta.total} modules
            </p>
          )}
        </div>
      )}

      {open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800' role='dialog' aria-modal='true'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                {editing ? 'Edit module' : 'Create module'}
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
                  Key
                </span>
                <input
                  required
                  value={form.key}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, key: e.target.value }))
                  }
                  placeholder='hero'
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Type
                </span>
                <select
                  required
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as StorefrontModuleType,
                    }))
                  }
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                >
                  {MODULE_TYPES.map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Title
                </span>
                <input
                  value={form.title || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Sort order
                </span>
                <input
                  type='number'
                  value={form.sortOrder ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value),
                    }))
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
