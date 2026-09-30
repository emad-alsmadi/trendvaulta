import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  useAdminHelpTopics,
  useCreateHelpTopicMutation,
  useDeleteHelpTopicMutation,
  useUpdateHelpTopicMutation,
} from '../hooks/useAdminHelpTopics';
import {
  errorMessage,
  type AdminHelpTopic,
  type HelpTopicPayload,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';

const emptyForm: HelpTopicPayload = {
  id: '',
  title: '',
  href: '',
  description: '',
  icon: '',
  active: true,
  sortOrder: 0,
};

export default function HelpTopics() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatNumber } = useT();
  const helpTopicsQ = useAdminHelpTopics({ limit: 100 });
  const createMut = useCreateHelpTopicMutation();
  const updateMut = useUpdateHelpTopicMutation();
  const deleteMut = useDeleteHelpTopicMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminHelpTopic | null>(null);
  const [form, setForm] = useState<HelpTopicPayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = helpTopicsQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (topic) =>
        topic.title.toLowerCase().includes(q) ||
        (topic.description || '').toLowerCase().includes(q) ||
        topic.id.toLowerCase().includes(q) ||
        topic.href.toLowerCase().includes(q),
    );
  }, [helpTopicsQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(topic: AdminHelpTopic) {
    setEditing(topic);
    setForm({
      id: topic.id,
      title: topic.title,
      href: topic.href,
      description: topic.description || '',
      icon: topic.icon || '',
      active: topic.active,
      sortOrder: topic.sortOrder ?? 0,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.id.trim() || !form.title.trim() || !form.href.trim()) {
      toast.error(t('helpTopics.required'));
      return;
    }

    const payload: HelpTopicPayload = {
      ...form,
      id: form.id.trim(),
      title: form.title.trim(),
      href: form.href.trim(),
      description: (form.description || '').trim(),
      icon: (form.icon || '').trim(),
      sortOrder: Number(form.sortOrder || 0),
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
      toast.error(errorMessage(err, t('helpTopics.saveFailed')));
    }
  }

  async function handleDelete(topic: AdminHelpTopic) {
    const ok = await confirm({ message: t('helpTopics.confirmDelete', { title: topic.title }), danger: true, confirmLabel: t('common.delete') });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(topic._id);
    } catch (err) {
      toast.error(errorMessage(err, t('helpTopics.deleteFailed')));
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
            {t('helpTopics.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('helpTopics.subtitle')}
          </p>
        </div>
        {can('content:write') && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            <Plus className="me-2 h-5 w-5" aria-hidden />
            {t('helpTopics.add')}
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          type="search"
          aria-label={t('helpTopics.searchLabel')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('helpTopics.searchPlaceholder')}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 ps-10 pe-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {helpTopicsQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">
          {t('helpTopics.loading')}
        </p>
      )}

      {helpTopicsQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(helpTopicsQ.error, t('helpTopics.loadFailed'))}
        </div>
      )}

      {!helpTopicsQ.isLoading && !helpTopicsQ.isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {[
                    t('helpTopics.columns.id'),
                    t('helpTopics.columns.title'),
                    t('helpTopics.columns.href'),
                    t('helpTopics.columns.icon'),
                    t('helpTopics.columns.order'),
                    t('common.status'),
                    t('common.actions'),
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                      {t('helpTopics.empty')}
                    </td>
                  </tr>
                ) : (
                  filtered.map((topic) => (
                    <tr
                      key={topic._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/60"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400" dir="ltr">
                        {topic.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white" dir="auto">
                          {topic.title}
                        </div>
                        {topic.description ? (
                          <div className="text-xs text-gray-500 dark:text-gray-400" dir="auto">
                            {topic.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400" dir="ltr">
                        {topic.href}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {topic.icon || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatNumber(topic.sortOrder ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            topic.active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {topic.active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {can('content:write') && (
                            <button
                              type="button"
                              onClick={() => openEdit(topic)}
                              className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600"
                              aria-label={t('common.editItem', { name: topic.title })}
                            >
                              <Pencil className="h-4 w-4 text-gray-500" aria-hidden />
                            </button>
                          )}
                          {can('content:delete') && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(topic)}
                              disabled={deleteMut.isPending}
                              className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                              aria-label={t('common.deleteItem', { name: topic.title })}
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
          {helpTopicsQ.data?.meta && (
            <p className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700">
              {t('helpTopics.showing', {
                shown: formatNumber(filtered.length),
                total: formatNumber(helpTopicsQ.data.meta.total),
              })}
            </p>
          )}
        </div>
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={editing ? t('helpTopics.form.editTitle') : t('helpTopics.form.createTitle')}
          busy={saving}
          maxWidthClass="max-w-lg"
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('helpTopics.form.id')}
              </span>
              <input
                required
                value={form.id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, id: e.target.value }))
                }
                placeholder="shipping"
                dir="ltr"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('helpTopics.form.title')}
              </span>
              <input
                required
                value={form.title}
                dir="auto"
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('common.description')}
              </span>
              <input
                value={form.description || ''}
                dir="auto"
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('helpTopics.form.href')}
              </span>
              <input
                required
                value={form.href}
                onChange={(e) =>
                  setForm((f) => ({ ...f, href: e.target.value }))
                }
                placeholder="/shipping"
                dir="ltr"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('helpTopics.form.icon')}
              </span>
              <input
                value={form.icon || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, icon: e.target.value }))
                }
                placeholder="truck"
                dir="ltr"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('helpTopics.form.sortOrder')}
              </span>
              <input
                type="number"
                value={form.sortOrder ?? 0}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sortOrder: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={!!form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              {t('common.active')}
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
