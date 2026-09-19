import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import {
  useAdminLookbooks,
  useCreateLookbookMutation,
  useDeleteLookbookMutation,
  useUpdateLookbookMutation,
} from '../hooks/useAdminLookbooks';
import {
  errorMessage,
  type AdminLookbook,
  type LookbookPayload,
  type LookbookTone,
} from '../lib/api';

const TONES: LookbookTone[] = ['rose', 'stone', 'teal'];

const emptyForm: LookbookPayload = {
  id: '',
  eyebrow: '',
  title: '',
  body: '',
  ctaLabel: '',
  ctaHref: '',
  imageUrl: '',
  tone: 'stone',
  active: true,
  sortOrder: 0,
};

export default function Lookbooks() {
  const lookbooksQ = useAdminLookbooks({ limit: 100 });
  const createMut = useCreateLookbookMutation();
  const updateMut = useUpdateLookbookMutation();
  const deleteMut = useDeleteLookbookMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLookbook | null>(null);
  const [form, setForm] = useState<LookbookPayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = lookbooksQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (l) =>
        l.id.toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q) ||
        (l.eyebrow || '').toLowerCase().includes(q),
    );
  }, [lookbooksQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(lookbook: AdminLookbook) {
    setEditing(lookbook);
    setForm({
      id: lookbook.id,
      eyebrow: lookbook.eyebrow || '',
      title: lookbook.title,
      body: lookbook.body,
      ctaLabel: lookbook.ctaLabel || '',
      ctaHref: lookbook.ctaHref,
      imageUrl: lookbook.imageUrl,
      tone: lookbook.tone,
      active: lookbook.active,
      sortOrder: lookbook.sortOrder,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.id.trim() ||
      !form.title.trim() ||
      !form.body.trim() ||
      !form.ctaHref.trim() ||
      !form.imageUrl.trim()
    ) {
      window.alert('ID, title, body, CTA href, and image URL are required.');
      return;
    }

    const payload: LookbookPayload = {
      ...form,
      id: form.id.trim(),
      eyebrow: (form.eyebrow || '').trim(),
      title: form.title.trim(),
      body: form.body.trim(),
      ctaLabel: (form.ctaLabel || '').trim(),
      ctaHref: form.ctaHref.trim(),
      imageUrl: form.imageUrl.trim(),
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
      window.alert(errorMessage(err, 'Could not save lookbook'));
    }
  }

  async function handleDelete(lookbook: AdminLookbook) {
    const ok = window.confirm(`Deactivate lookbook "${lookbook.title}"?`);
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(lookbook._id);
    } catch (err) {
      window.alert(errorMessage(err, 'Could not delete lookbook'));
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
            Lookbooks
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            Editorial content modules for the storefront.
          </p>
        </div>
        <button
          type='button'
          onClick={openCreate}
          className='inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
        >
          <Plus className='mr-2 h-5 w-5' />
          Add lookbook
        </button>
      </div>

      <div className='relative mb-6'>
        <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400' />
        <input
          type='search'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search by ID, title, or eyebrow…'
          className='w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        />
      </div>

      {lookbooksQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          Loading lookbooks…
        </p>
      )}

      {lookbooksQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(lookbooksQ.error, 'Failed to load lookbooks')}
        </div>
      )}

      {!lookbooksQ.isLoading && !lookbooksQ.isError && (
        <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[800px]'>
              <thead className='bg-gray-50 dark:bg-gray-700'>
                <tr>
                  {[
                    'ID',
                    'Eyebrow',
                    'Title',
                    'Tone',
                    'Order',
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
                      colSpan={7}
                      className='px-4 py-10 text-center text-sm text-gray-500'
                    >
                      No lookbooks found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((lookbook) => (
                    <tr
                      key={lookbook._id}
                      className='hover:bg-gray-50 dark:hover:bg-gray-700/60'
                    >
                      <td className='px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400'>
                        {lookbook.id}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 dark:text-gray-400'>
                        {lookbook.eyebrow || '—'}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-900 dark:text-white'>
                        {lookbook.title}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            lookbook.tone === 'rose'
                              ? 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
                              : lookbook.tone === 'teal'
                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
                                : 'bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-200'
                          }`}
                        >
                          {lookbook.tone}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 dark:text-gray-400'>
                        {lookbook.sortOrder}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            lookbook.active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {lookbook.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex gap-1'>
                          <button
                            type='button'
                            onClick={() => openEdit(lookbook)}
                            className='rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600'
                            aria-label={`Edit ${lookbook.id}`}
                          >
                            <Pencil className='h-4 w-4 text-gray-500' />
                          </button>
                          <button
                            type='button'
                            onClick={() => void handleDelete(lookbook)}
                            className='rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40'
                            aria-label={`Delete ${lookbook.id}`}
                          >
                            <Trash2 className='h-4 w-4 text-red-500' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {lookbooksQ.data?.meta && (
            <p className='border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700'>
              Showing {filtered.length} of {lookbooksQ.data.meta.total}{' '}
              lookbooks
            </p>
          )}
        </div>
      )}

      {open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                {editing ? 'Edit lookbook' : 'Create lookbook'}
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
                  ID
                </span>
                <input
                  required
                  value={form.id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, id: e.target.value }))
                  }
                  placeholder='look-morning'
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Eyebrow
                </span>
                <input
                  value={form.eyebrow || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, eyebrow: e.target.value }))
                  }
                  placeholder='Beauty edit'
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Title
                </span>
                <input
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Body
                </span>
                <textarea
                  required
                  value={form.body}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, body: e.target.value }))
                  }
                  rows={3}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  CTA Label
                </span>
                <input
                  value={form.ctaLabel || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaLabel: e.target.value }))
                  }
                  placeholder='Shop now'
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  CTA Href
                </span>
                <input
                  required
                  value={form.ctaHref}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaHref: e.target.value }))
                  }
                  placeholder='/products?category=beauty'
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Image URL
                </span>
                <input
                  required
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, imageUrl: e.target.value }))
                  }
                  placeholder='/images/1.webp'
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Tone
                </span>
                <select
                  value={form.tone}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      tone: e.target.value as LookbookTone,
                    }))
                  }
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                >
                  {TONES.map((tone) => (
                    <option
                      key={tone}
                      value={tone}
                    >
                      {tone}
                    </option>
                  ))}
                </select>
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
