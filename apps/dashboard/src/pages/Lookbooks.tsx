import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
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
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';

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
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tv, formatNumber } = useT();
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
      toast.error(t('lookbooks.required'));
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
      toast.error(errorMessage(err, t('lookbooks.saveFailed')));
    }
  }

  async function handleDelete(lookbook: AdminLookbook) {
    const ok = await confirm({ message: t('lookbooks.confirmDeactivate', { title: lookbook.title }), danger: true, confirmLabel: t('lookbooks.deactivate') });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(lookbook._id);
    } catch (err) {
      toast.error(errorMessage(err, t('lookbooks.deleteFailed')));
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
            {t('lookbooks.title')}
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            {t('lookbooks.subtitle')}
          </p>
        </div>
        {can('content:write') && (
          <button
            type='button'
            onClick={openCreate}
            className='inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
          >
            <Plus className='me-2 h-5 w-5' aria-hidden />
            {t('lookbooks.add')}
          </button>
        )}
      </div>

      <div className='relative mb-6'>
        <Search className='absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400' aria-hidden />
        <input
          type='search'
          aria-label={t('lookbooks.searchLabel')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('lookbooks.searchPlaceholder')}
          className='w-full rounded-lg border border-gray-300 bg-white py-2 ps-10 pe-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        />
      </div>

      {lookbooksQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          {t('lookbooks.loading')}
        </p>
      )}

      {lookbooksQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(lookbooksQ.error, t('lookbooks.loadFailed'))}
        </div>
      )}

      {!lookbooksQ.isLoading && !lookbooksQ.isError && (
        <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[800px]'>
              <thead className='bg-gray-50 dark:bg-gray-700'>
                <tr>
                  {[
                    t('lookbooks.columns.id'),
                    t('lookbooks.columns.eyebrow'),
                    t('lookbooks.columns.title'),
                    t('lookbooks.columns.tone'),
                    t('lookbooks.columns.order'),
                    t('common.status'),
                    t('common.actions'),
                  ].map((h) => (
                    <th
                      key={h}
                      className='px-4 py-3 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300'
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
                      {t('lookbooks.empty')}
                    </td>
                  </tr>
                ) : (
                  filtered.map((lookbook) => (
                    <tr
                      key={lookbook._id}
                      className='hover:bg-gray-50 dark:hover:bg-gray-700/60'
                    >
                      <td className='px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400' dir='ltr'>
                        {lookbook.id}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 dark:text-gray-400' dir='auto'>
                        {lookbook.eyebrow || '—'}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-900 dark:text-white' dir='auto'>
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
                          {tv('lookbookTone', lookbook.tone)}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 dark:text-gray-400'>
                        {formatNumber(lookbook.sortOrder)}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            lookbook.active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {lookbook.active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex gap-1'>
                          {can('content:write') && (
                            <button
                              type='button'
                              onClick={() => openEdit(lookbook)}
                              className='rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600'
                              aria-label={t('common.editItem', { name: lookbook.title })}
                            >
                              <Pencil className='h-4 w-4 text-gray-500' aria-hidden />
                            </button>
                          )}
                          {can('content:delete') && (
                            <button
                              type='button'
                              onClick={() => void handleDelete(lookbook)}
                              disabled={deleteMut.isPending}
                              className='rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40'
                              aria-label={t('common.deleteItem', { name: lookbook.title })}
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
          {lookbooksQ.data?.meta && (
            <p className='border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700'>
              {t('lookbooks.showing', {
                shown: formatNumber(filtered.length),
                total: formatNumber(lookbooksQ.data.meta.total),
              })}
            </p>
          )}
        </div>
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={editing ? t('lookbooks.form.editTitle') : t('lookbooks.form.createTitle')}
          busy={saving}
          maxWidthClass='max-w-2xl'
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-3'
          >
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('lookbooks.form.id')}
              </span>
              <input
                required
                value={form.id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, id: e.target.value }))
                }
                placeholder='look-morning'
                dir='ltr'
                className='w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('lookbooks.form.eyebrow')}
              </span>
              <input
                value={form.eyebrow || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, eyebrow: e.target.value }))
                }
                placeholder={t('lookbooks.form.eyebrowPlaceholder')}
                dir='auto'
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('lookbooks.form.title')}
              </span>
              <input
                required
                value={form.title}
                dir='auto'
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('lookbooks.form.body')}
              </span>
              <textarea
                required
                value={form.body}
                dir='auto'
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                rows={3}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('lookbooks.form.ctaLabel')}
              </span>
              <input
                value={form.ctaLabel || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ctaLabel: e.target.value }))
                }
                placeholder={t('lookbooks.form.ctaLabelPlaceholder')}
                dir='auto'
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('lookbooks.form.ctaHref')}
              </span>
              <input
                required
                value={form.ctaHref}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ctaHref: e.target.value }))
                }
                placeholder='/products?category=beauty'
                dir='ltr'
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('lookbooks.form.imageUrl')}
              </span>
              <input
                required
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageUrl: e.target.value }))
                }
                placeholder='/images/1.webp'
                dir='ltr'
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('lookbooks.form.tone')}
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
                    {tv('lookbookTone', tone)}
                  </option>
                ))}
              </select>
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('lookbooks.form.sortOrder')}
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
