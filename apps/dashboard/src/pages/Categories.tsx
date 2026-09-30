import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useAdminCategories,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
} from '../hooks/useAdminCategories';
import { errorMessage, type AdminCategory } from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { ImageUploadField } from '../components/ui/ImageUploadField';
import { FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';

/** Mirrors SLUG_PATTERN in apps/api/models/Category.js. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
};

/** 'Eye Cream' → 'eye-cream' — a suggestion the admin can still edit. */
function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/** What the dialog is doing: editing an existing row, or adding under a parent. */
type DialogState =
  | { mode: 'edit'; category: AdminCategory }
  | { mode: 'create'; parent: AdminCategory };

export default function Categories() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatNumber } = useT();
  const categoriesQ = useAdminCategories();
  const createMut = useCreateCategoryMutation();
  const updateMut = useUpdateCategoryMutation();
  const deleteMut = useDeleteCategoryMutation();

  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  // Until the admin edits the slug by hand, it follows the name.
  const [slugTouched, setSlugTouched] = useState(false);

  const saving = createMut.isPending || updateMut.isPending;
  const canWrite = can('products:write');

  const tree = useMemo(() => {
    const all = categoriesQ.data || [];
    return all
      .filter((c) => !c.parent)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((top) => ({
        top,
        children: all
          .filter((c) => c.parent === top.slug)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      }));
  }, [categoriesQ.data]);

  function openEdit(category: AdminCategory) {
    setDialog({ mode: 'edit', category });
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
  }

  function openCreate(parent: AdminCategory, siblings: AdminCategory[]) {
    setDialog({ mode: 'create', parent });
    setSlugTouched(false);
    // New subcategories go to the end of their list by default.
    const nextOrder = siblings.reduce((max, c) => Math.max(max, c.sortOrder + 1), 0);
    setForm({ ...emptyForm, sortOrder: nextOrder });
  }

  function close() {
    setDialog(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dialog) return;
    const name = form.name.trim();
    if (!name) {
      toast.error(t('categories.nameRequired'));
      return;
    }
    const common = {
      name,
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      sortOrder: Math.trunc(Number(form.sortOrder) || 0),
      isActive: form.isActive,
    };
    try {
      if (dialog.mode === 'edit') {
        await updateMut.mutateAsync({ id: dialog.category._id, payload: common });
        toast.success(t('categories.updated'));
      } else {
        const slug = form.slug.trim();
        if (!SLUG_RE.test(slug)) {
          toast.error(t('categories.slugInvalid'));
          return;
        }
        await createMut.mutateAsync({ ...common, slug, parent: dialog.parent.slug });
        toast.success(t('categories.added'));
      }
      close();
    } catch (err) {
      toast.error(errorMessage(err, t('categories.saveFailed')));
    }
  }

  async function handleDelete(category: AdminCategory) {
    const ok = await confirm({
      message: t('categories.confirmDelete', { name: category.name }),
      danger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(category._id);
      toast.success(t('categories.deleted'));
    } catch (err) {
      toast.error(errorMessage(err, t('categories.deleteFailed')));
    }
  }

  const isEdit = dialog?.mode === 'edit';
  const isTopLevelEdit = dialog?.mode === 'edit' && !dialog.category.parent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('categories.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('categories.subtitle')}
        </p>
      </div>

      {categoriesQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">
          {t('categories.loading')}
        </p>
      )}

      {categoriesQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(categoriesQ.error, t('categories.loadFailed'))}
        </div>
      )}

      {!categoriesQ.isLoading && !categoriesQ.isError && (
        <div className="grid gap-4 lg:grid-cols-2">
          {tree.map(({ top, children }) => (
            <section
              key={top._id}
              className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
                top.isActive ? '' : 'opacity-70'
              }`}
            >
              <header className="mb-3 flex items-start gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
                  {top.imageUrl && (
                    <img src={top.imageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                    {top.name}
                    {!top.isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        <EyeOff className="h-3 w-3" aria-hidden />
                        {t('categories.hidden')}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <code dir="ltr">{top.slug}</code> ·{' '}
                    {t(top.productCount === 1 ? 'categories.productOne' : 'categories.productMany', {
                      count: formatNumber(top.productCount),
                    })}
                  </p>
                </div>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => openEdit(top)}
                    className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label={t('common.editItem', { name: top.name })}
                  >
                    <Pencil className="h-4 w-4 text-gray-500" aria-hidden />
                  </button>
                )}
              </header>

              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {children.length === 0 && (
                  <li className="py-2 text-sm text-gray-500">{t('categories.noSubcategories')}</li>
                )}
                {children.map((child) => (
                  <li key={child._id} className="flex items-center gap-2 py-2 text-sm">
                    <span
                      className={`flex-1 truncate ${
                        child.isActive
                          ? 'text-gray-800 dark:text-gray-200'
                          : 'text-gray-400 line-through'
                      }`}
                    >
                      {child.name}{' '}
                      <code className="text-xs text-gray-400" dir="ltr">{child.slug}</code>
                    </span>
                    <span className="text-xs text-gray-500">{formatNumber(child.productCount)}</span>
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => openEdit(child)}
                        className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label={t('common.editItem', { name: child.name })}
                      >
                        <Pencil className="h-3.5 w-3.5 text-gray-500" aria-hidden />
                      </button>
                    )}
                    {can('products:delete') && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(child)}
                        // In-use subcategories are refused by the API; saying
                        // why up front beats an error after the confirm.
                        disabled={deleteMut.isPending || child.productCount > 0}
                        title={
                          child.productCount > 0
                            ? t('categories.inUse')
                            : t('common.delete')
                        }
                        className="rounded p-1 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-950/40"
                        aria-label={t('common.deleteItem', { name: child.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" aria-hidden />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {canWrite && (
                <button
                  type="button"
                  onClick={() => openCreate(top, children)}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {t('categories.addSubcategory')}
                </button>
              )}
            </section>
          ))}
        </div>
      )}

      {dialog && (
        <FormDialog
          onClose={close}
          title={dialog.mode === 'edit'
            ? t(dialog.category.parent ? 'categories.form.editSubcategory' : 'categories.form.editCategory')
            : t('categories.form.newIn', { parent: dialog.parent.name })}
          busy={saving}
          maxWidthClass="max-w-lg"
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('categories.form.name')}
              </span>
              <input
                required
                maxLength={80}
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    ...(!isEdit && !slugTouched ? { slug: toSlug(name) } : {}),
                  }));
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('categories.form.slug')}
              </span>
              <input
                required
                maxLength={64}
                value={form.slug}
                readOnly={isEdit}
                dir="ltr"
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }));
                }}
                aria-describedby="slug-help"
                className={`w-full rounded-lg border px-3 py-2 font-mono text-sm ${
                  isEdit
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
                    : 'border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                }`}
              />
              <span id="slug-help" className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                {isEdit
                  ? t('categories.form.slugFixed')
                  : t('categories.form.slugNew')}
              </span>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('common.description')}
              </span>
              <textarea
                rows={2}
                maxLength={300}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <ImageUploadField
              label={t('categories.form.image')}
              value={form.imageUrl}
              onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  {t('categories.form.order')}
                </span>
                <input
                  type="number"
                  step={1}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('categories.form.visible')}
                </span>
              </label>
            </div>
            {isTopLevelEdit && !form.isActive && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                {t('categories.form.hideWarning')}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={close}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
              >
                {saving ? t('common.saving') : isEdit ? t('common.save') : t('categories.form.add')}
              </button>
            </div>
          </form>
        </FormDialog>
      )}
    </motion.div>
  );
}
