import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import {
  useAdminTestimonials,
  useCreateTestimonialMutation,
  useDeleteTestimonialMutation,
  useUpdateTestimonialMutation,
} from '../hooks/useAdminTestimonials';
import {
  errorMessage,
  type AdminTestimonial,
  type TestimonialPayload,
} from '../lib/api';

const emptyForm: TestimonialPayload = {
  id: '',
  name: '',
  role: '',
  quote: '',
  rating: 5,
  active: true,
  sortOrder: 0,
};

export default function Testimonials() {
  const testimonialsQ = useAdminTestimonials({ limit: 100 });
  const createMut = useCreateTestimonialMutation();
  const updateMut = useUpdateTestimonialMutation();
  const deleteMut = useDeleteTestimonialMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTestimonial | null>(null);
  const [form, setForm] = useState<TestimonialPayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = testimonialsQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.role || '').toLowerCase().includes(q),
    );
  }, [testimonialsQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(testimonial: AdminTestimonial) {
    setEditing(testimonial);
    setForm({
      id: testimonial.id,
      name: testimonial.name,
      role: testimonial.role || '',
      quote: testimonial.quote,
      rating: testimonial.rating,
      active: testimonial.active,
      sortOrder: testimonial.sortOrder,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.id.trim() || !form.name.trim() || !form.quote.trim()) {
      window.alert('ID, name, and quote are required.');
      return;
    }

    const payload: TestimonialPayload = {
      ...form,
      id: form.id.trim(),
      name: form.name.trim(),
      role: (form.role || '').trim(),
      quote: form.quote.trim(),
      rating: Number(form.rating) || 5,
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
      window.alert(errorMessage(err, 'Could not save testimonial'));
    }
  }

  async function handleDelete(testimonial: AdminTestimonial) {
    const ok = window.confirm(
      `Deactivate testimonial from "${testimonial.name}"?`,
    );
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(testimonial._id);
    } catch (err) {
      window.alert(errorMessage(err, 'Could not delete testimonial'));
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
            Testimonials
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            Customer reviews and feedback for the storefront.
          </p>
        </div>
        <button
          type='button'
          onClick={openCreate}
          className='inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
        >
          <Plus className='mr-2 h-5 w-5' />
          Add testimonial
        </button>
      </div>

      <div className='relative mb-6'>
        <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400' />
        <input
          type='search'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search by ID, name, or role…'
          className='w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        />
      </div>

      {testimonialsQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          Loading testimonials…
        </p>
      )}

      {testimonialsQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(testimonialsQ.error, 'Failed to load testimonials')}
        </div>
      )}

      {!testimonialsQ.isLoading && !testimonialsQ.isError && (
        <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[800px]'>
              <thead className='bg-gray-50 dark:bg-gray-700'>
                <tr>
                  {[
                    'ID',
                    'Name',
                    'Role',
                    'Rating',
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
                      No testimonials found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((testimonial) => (
                    <tr
                      key={testimonial._id}
                      className='hover:bg-gray-50 dark:hover:bg-gray-700/60'
                    >
                      <td className='px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400'>
                        {testimonial.id}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-900 dark:text-white'>
                        {testimonial.name}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 dark:text-gray-400'>
                        {testimonial.role || '—'}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-1'>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={`h-4 w-4 ${
                                i < testimonial.rating
                                  ? 'text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 dark:text-gray-400'>
                        {testimonial.sortOrder}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            testimonial.active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {testimonial.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex gap-1'>
                          <button
                            type='button'
                            onClick={() => openEdit(testimonial)}
                            className='rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600'
                            aria-label={`Edit ${testimonial.id}`}
                          >
                            <Pencil className='h-4 w-4 text-gray-500' />
                          </button>
                          <button
                            type='button'
                            onClick={() => void handleDelete(testimonial)}
                            className='rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40'
                            aria-label={`Delete ${testimonial.id}`}
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
          {testimonialsQ.data?.meta && (
            <p className='border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700'>
              Showing {filtered.length} of {testimonialsQ.data.meta.total}{' '}
              testimonials
            </p>
          )}
        </div>
      )}

      {open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                {editing ? 'Edit testimonial' : 'Create testimonial'}
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
                  placeholder='sara'
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Name
                </span>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Role
                </span>
                <input
                  value={form.role || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value }))
                  }
                  placeholder='Beauty enthusiast'
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Quote
                </span>
                <textarea
                  required
                  value={form.quote}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quote: e.target.value }))
                  }
                  rows={3}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                />
              </label>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Rating (1-5)
                </span>
                <input
                  type='number'
                  min={1}
                  max={5}
                  value={form.rating}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, rating: Number(e.target.value) }))
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
