import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import {
  useAdminContent,
  useCreateContentMutation,
  useDeleteContentMutation,
  useUpdateContentMutation,
} from '../hooks/useAdminContent';
import {
  errorMessage,
  type AdminContent,
  type ContentPayload,
  type ContentType,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';

const CONTENT_TYPES: ContentType[] = ['SHIPPING', 'RETURNS', 'PRIVACY', 'TERMS', 'STOREFRONT_TRUST'];

const emptyForm: ContentPayload = {
  type: 'SHIPPING',
  title: '',
  body: '',
  active: true,
};

export default function Content() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const contentQ = useAdminContent({ limit: 100 });
  const createMut = useCreateContentMutation();
  const updateMut = useUpdateContentMutation();
  const deleteMut = useDeleteContentMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminContent | null>(null);
  const [form, setForm] = useState<ContentPayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = contentQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.type.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.body.toLowerCase().includes(q),
    );
  }, [contentQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(content: AdminContent) {
    setEditing(content);
    setForm({
      type: content.type,
      title: content.title,
      body: content.body,
      active: content.active,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type || !form.title.trim() || !form.body.trim()) {
      toast.error('Type, title, and body are required.');
      return;
    }

    const payload: ContentPayload = {
      type: form.type,
      title: form.title.trim(),
      body: form.body.trim(),
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
      toast.error(errorMessage(err, 'Could not save content'));
    }
  }

  async function handleDelete(content: AdminContent) {
    const ok = await confirm({ message: `Deactivate / delete content "${content.title}" (${content.type})?`, danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(content._id);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete content'));
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
            Content
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Shipping, returns, privacy, and policy content for the storefront.
          </p>
        </div>
        {can('content:write') && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add content
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by type, title, or body…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {contentQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">
          Loading content…
        </p>
      )}

      {contentQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(contentQ.error, 'Failed to load content')}
        </div>
      )}

      {!contentQ.isLoading && !contentQ.isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['Type', 'Title', 'Body preview', 'Status', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                      No content found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((content) => (
                    <tr
                      key={content._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/60"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {content.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {content.title}
                        </div>
                      </td>
                      <td className="max-w-[300px] truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {content.body}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            content.active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {content.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {can('content:write') && (
                            <button
                              type="button"
                              onClick={() => openEdit(content)}
                              className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600"
                              aria-label={`Edit ${content.title}`}
                            >
                              <Pencil className="h-4 w-4 text-gray-500" />
                            </button>
                          )}
                          {can('content:delete') && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(content)}
                              disabled={deleteMut.isPending}
                              className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                              aria-label={`Delete ${content.title}`}
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
          {contentQ.data?.meta && (
            <p className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700">
              Showing {filtered.length} of {contentQ.data.meta.total} content items
            </p>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800" role='dialog' aria-modal='true'>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editing ? 'Edit content' : 'Create content'}
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
                  Type
                </span>
                <select
                  required
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value as ContentType }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  {CONTENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Title
                </span>
                <input
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Body
                </span>
                <textarea
                  required
                  value={form.body}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, body: e.target.value }))
                  }
                  rows={10}
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
                Active
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
