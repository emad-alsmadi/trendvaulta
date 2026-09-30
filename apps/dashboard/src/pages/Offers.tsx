import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  useAdminOffers,
  useCreateOfferMutation,
  useDeleteOfferMutation,
  useUpdateOfferMutation,
} from '../hooks/useAdminOffers';
import {
  errorMessage,
  type AdminOffer,
  type OfferPayload,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';

const emptyForm: OfferPayload = {
  title: '',
  href: '',
  subtitle: '',
  badge: '',
  imageUrl: '',
  endsAt: '',
  active: true,
  sortOrder: 0,
};

function toDateInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function Offers() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatDate, formatNumber } = useT();
  const offersQ = useAdminOffers({ limit: 100 });
  const createMut = useCreateOfferMutation();
  const updateMut = useUpdateOfferMutation();
  const deleteMut = useDeleteOfferMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminOffer | null>(null);
  const [form, setForm] = useState<OfferPayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = offersQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        (o.subtitle || '').toLowerCase().includes(q) ||
        (o.badge || '').toLowerCase().includes(q) ||
        o.href.toLowerCase().includes(q),
    );
  }, [offersQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(offer: AdminOffer) {
    setEditing(offer);
    setForm({
      title: offer.title,
      href: offer.href,
      subtitle: offer.subtitle || '',
      badge: offer.badge || '',
      imageUrl: offer.imageUrl || '',
      endsAt: toDateInput(offer.endsAt),
      active: offer.active,
      sortOrder: offer.sortOrder ?? 0,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.href.trim()) {
      toast.error(t('offers.required'));
      return;
    }

    const payload: OfferPayload = {
      ...form,
      title: form.title.trim(),
      href: form.href.trim(),
      subtitle: (form.subtitle || '').trim(),
      badge: (form.badge || '').trim(),
      imageUrl: (form.imageUrl || '').trim(),
      endsAt: form.endsAt ? form.endsAt : null,
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
      toast.error(errorMessage(err, t('offers.saveFailed')));
    }
  }

  async function handleDelete(offer: AdminOffer) {
    const ok = await confirm({ message: t('offers.confirmDelete', { title: offer.title }), danger: true, confirmLabel: t('common.delete') });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(offer._id);
    } catch (err) {
      toast.error(errorMessage(err, t('offers.deleteFailed')));
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
            {t('offers.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('offers.subtitle')}
          </p>
        </div>
        {can('offers:write') && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            <Plus className="me-2 h-5 w-5" aria-hidden />
            {t('offers.add')}
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          type="search"
          aria-label={t('offers.searchLabel')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('offers.searchPlaceholder')}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 ps-10 pe-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {offersQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">
          {t('offers.loading')}
        </p>
      )}

      {offersQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(offersQ.error, t('offers.loadFailed'))}
        </div>
      )}

      {!offersQ.isLoading && !offersQ.isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {[
                    t('offers.columns.title'),
                    t('offers.columns.badge'),
                    t('offers.columns.href'),
                    t('offers.columns.ends'),
                    t('offers.columns.order'),
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
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      {t('offers.empty')}
                    </td>
                  </tr>
                ) : (
                  filtered.map((offer) => (
                    <tr
                      key={offer._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/60"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white" dir="auto">
                          {offer.title}
                        </div>
                        {offer.subtitle ? (
                          <div className="text-xs text-gray-500 dark:text-gray-400" dir="auto">
                            {offer.subtitle}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300" dir="auto">
                        {offer.badge || '—'}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400" dir="ltr">
                        {offer.href}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {toDateInput(offer.endsAt)
                          ? formatDate(`${toDateInput(offer.endsAt)}T00:00:00`)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatNumber(offer.sortOrder ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            offer.active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {offer.active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {can('offers:write') && (
                            <button
                              type="button"
                              onClick={() => openEdit(offer)}
                              className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600"
                              aria-label={t('common.editItem', { name: offer.title })}
                            >
                              <Pencil className="h-4 w-4 text-gray-500" aria-hidden />
                            </button>
                          )}
                          {can('offers:delete') && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(offer)}
                              disabled={deleteMut.isPending}
                              className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                              aria-label={t('common.deleteItem', { name: offer.title })}
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
          {offersQ.data?.meta && (
            <p className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700">
              {t('offers.showing', {
                shown: formatNumber(filtered.length),
                total: formatNumber(offersQ.data.meta.total),
              })}
            </p>
          )}
        </div>
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={editing ? t('offers.form.editTitle') : t('offers.form.createTitle')}
          busy={saving}
          maxWidthClass="max-w-lg"
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('offers.form.title')}
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
                {t('offers.form.subtitle')}
              </span>
              <input
                value={form.subtitle || ''}
                dir="auto"
                onChange={(e) =>
                  setForm((f) => ({ ...f, subtitle: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  {t('offers.form.badge')}
                </span>
                <input
                  value={form.badge || ''}
                  dir="auto"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, badge: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  {t('offers.form.sortOrder')}
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
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('offers.form.href')}
              </span>
              <input
                required
                value={form.href}
                onChange={(e) =>
                  setForm((f) => ({ ...f, href: e.target.value }))
                }
                placeholder="/products?deal=…"
                dir="ltr"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('offers.form.imageUrl')}
              </span>
              <input
                value={form.imageUrl || ''}
                dir="ltr"
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageUrl: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('offers.form.endsAt')}
              </span>
              <input
                type="date"
                value={form.endsAt || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endsAt: e.target.value }))
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
