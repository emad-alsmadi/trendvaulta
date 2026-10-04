import { useMemo, useState } from 'react';
import { EyeOff, FolderTree, ImageOff, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { FormActions, FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, Input, Switch, Textarea } from '../components/ui/Field';
import { Badge } from '../components/ui/StatusBadge';
import { cn } from '../lib/cn';
import { hintClass, labelClass } from '../components/ui/styles';

/** Mirrors SLUG_PATTERN in apps/api/models/Category.js. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  translations: { ar: { name: string; description: string } };
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  translations: { ar: { name: '', description: '' } },
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
          .sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          ),
      }));
  }, [categoriesQ.data]);

  function openEdit(category: AdminCategory) {
    setDialog({ mode: 'edit', category });
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      translations: {
        ar: {
          name: category.translations?.ar?.name || '',
          description: category.translations?.ar?.description || '',
        },
      },
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
  }

  function openCreate(parent: AdminCategory, siblings: AdminCategory[]) {
    setDialog({ mode: 'create', parent });
    setSlugTouched(false);
    // New subcategories go to the end of their list by default.
    const nextOrder = siblings.reduce(
      (max, c) => Math.max(max, c.sortOrder + 1),
      0,
    );
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
      translations: {
        ar: {
          name: form.translations.ar.name.trim(),
          description: form.translations.ar.description.trim(),
        },
      },
      sortOrder: Math.trunc(Number(form.sortOrder) || 0),
      isActive: form.isActive,
    };
    try {
      if (dialog.mode === 'edit') {
        await updateMut.mutateAsync({
          id: dialog.category._id,
          payload: common,
        });
        toast.success(t('categories.updated'));
      } else {
        const slug = form.slug.trim();
        if (!SLUG_RE.test(slug)) {
          toast.error(t('categories.slugInvalid'));
          return;
        }
        await createMut.mutateAsync({
          ...common,
          slug,
          parent: dialog.parent.slug,
        });
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
    <>
      <PageHeader
        title={t('categories.title')}
        description={t('categories.subtitle')}
      />

      {categoriesQ.isError ? (
        <Alert tone='error'>
          {errorMessage(categoriesQ.error, t('categories.loadFailed'))}
        </Alert>
      ) : categoriesQ.isLoading ? (
        <div className='grid gap-4 lg:grid-cols-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className='mb-4 flex items-center gap-3'>
                <Skeleton
                  variant='custom'
                  className='size-14 rounded-control'
                />
                <div className='flex-1 space-y-2'>
                  <Skeleton className='w-1/3' />
                  <Skeleton className='w-1/4' />
                </div>
              </div>
              <div className='space-y-3'>
                <Skeleton />
                <Skeleton className='w-5/6' />
                <Skeleton className='w-2/3' />
              </div>
            </Card>
          ))}
        </div>
      ) : tree.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<FolderTree aria-hidden />}
            title={t('categories.noSubcategories')}
          />
        </Card>
      ) : (
        <div className='grid gap-4 lg:grid-cols-2'>
          {tree.map(({ top, children }) => (
            <Card
              key={top._id}
              padded={false}
              className='flex flex-col overflow-hidden'
            >
              <header className='flex items-start gap-4 border-b border-border p-5'>
                <div
                  className={cn(
                    'flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-muted text-muted-foreground',
                    !top.isActive && 'opacity-60 grayscale',
                  )}
                >
                  {top.imageUrl ? (
                    <img
                      src={top.imageUrl}
                      alt=''
                      className='size-full object-cover'
                    />
                  ) : (
                    <ImageOff
                      className='size-5'
                      aria-hidden
                    />
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  <h2 className='flex flex-wrap items-center gap-2 text-section text-foreground'>
                    {top.name}
                    {!top.isActive && (
                      <Badge tone='ended'>
                        <EyeOff
                          className='me-1 inline size-3 align-[-1px]'
                          aria-hidden
                        />
                        {t('categories.hidden')}
                      </Badge>
                    )}
                  </h2>
                  <p className='mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground'>
                    <code dir='ltr'>{top.slug}</code>
                    <span aria-hidden>·</span>
                    <span className='tabular-nums'>
                      {t(
                        top.productCount === 1
                          ? 'categories.productOne'
                          : 'categories.productMany',
                        { count: formatNumber(top.productCount) },
                      )}
                    </span>
                  </p>
                </div>
                {canWrite && (
                  <IconButton
                    icon={<Pencil aria-hidden />}
                    label={t('common.editItem', { name: top.name })}
                    onClick={() => openEdit(top)}
                  />
                )}
              </header>

              <ul className='flex-1 divide-y divide-border'>
                {children.length === 0 && (
                  <li className='px-5 py-6 text-center text-body-sm text-muted-foreground'>
                    {t('categories.noSubcategories')}
                  </li>
                )}
                {children.map((child) => (
                  <li
                    key={child._id}
                    className='group flex items-center gap-3 px-5 py-2 transition-colors hover:bg-muted/50'
                  >
                    <div className='min-w-0 flex-1'>
                      <p
                        className={cn(
                          'truncate text-sm',
                          child.isActive
                            ? 'text-foreground'
                            : 'text-muted-foreground line-through',
                        )}
                      >
                        {child.name}
                      </p>
                      <code
                        className='text-xs text-muted-foreground'
                        dir='ltr'
                      >
                        {child.slug}
                      </code>
                    </div>
                    <span className='rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground'>
                      {formatNumber(child.productCount)}
                    </span>
                    <div className='flex items-center gap-0.5'>
                      {canWrite && (
                        <IconButton
                          icon={<Pencil aria-hidden />}
                          label={t('common.editItem', { name: child.name })}
                          onClick={() => openEdit(child)}
                        />
                      )}
                      {can('products:delete') && (
                        <IconButton
                          icon={<Trash2 aria-hidden />}
                          // In-use subcategories are refused by the API; saying
                          // why up front beats an error after the confirm.
                          label={
                            child.productCount > 0
                              ? t('categories.inUse')
                              : t('common.deleteItem', { name: child.name })
                          }
                          onClick={() => void handleDelete(child)}
                          disabled={
                            deleteMut.isPending || child.productCount > 0
                          }
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {canWrite && (
                <div className='border-t border-border px-5 py-3'>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={() => openCreate(top, children)}
                    icon={<Plus aria-hidden />}
                  >
                    {t('categories.addSubcategory')}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {dialog && (
        <FormDialog
          onClose={close}
          title={
            dialog.mode === 'edit'
              ? t(
                  dialog.category.parent
                    ? 'categories.form.editSubcategory'
                    : 'categories.form.editCategory',
                )
              : t('categories.form.newIn', { parent: dialog.parent.name })
          }
          busy={saving}
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-4'
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field
                label={t('categories.form.name')}
                required
              >
                <Input
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
                />
              </Field>
              <Field
                label={t('categories.form.slug')}
                required
                hint={
                  isEdit
                    ? t('categories.form.slugFixed')
                    : t('categories.form.slugNew')
                }
              >
                <Input
                  required
                  maxLength={64}
                  value={form.slug}
                  readOnly={isEdit}
                  dir='ltr'
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((f) => ({
                      ...f,
                      slug: e.target.value.toLowerCase(),
                    }));
                  }}
                  className={cn(
                    'font-mono',
                    isEdit && 'cursor-not-allowed text-muted-foreground',
                  )}
                />
              </Field>
            </div>
            <Field label={t('common.description')}>
              <Textarea
                rows={2}
                maxLength={300}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className='min-h-16'
              />
            </Field>
            <ImageUploadField
              label={t('categories.form.image')}
              value={form.imageUrl}
              onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
            />

            <fieldset className='space-y-3 border-t border-border pt-4'>
              <div className='space-y-1'>
                <legend className={labelClass}>{t('categories.form.arabicLegend')}</legend>
                <p className={hintClass}>{t('categories.form.arabicHint')}</p>
              </div>
              <Field label={t('categories.form.nameAr')}>
                <Input
                  value={form.translations.ar.name}
                  dir='rtl'
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      translations: {
                        ar: { ...f.translations.ar, name: e.target.value },
                      },
                    }))
                  }
                />
              </Field>
              <Field label={t('categories.form.descriptionAr')}>
                <Textarea
                  rows={2}
                  maxLength={300}
                  value={form.translations.ar.description}
                  dir='rtl'
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      translations: {
                        ar: { ...f.translations.ar, description: e.target.value },
                      },
                    }))
                  }
                  className='min-h-16'
                />
              </Field>
            </fieldset>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field label={t('categories.form.order')}>
                <Input
                  type='number'
                  step={1}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                />
              </Field>
              <div className='flex items-end pb-1'>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(isActive) =>
                    setForm((f) => ({ ...f, isActive }))
                  }
                  label={t('categories.form.visible')}
                />
              </div>
            </div>
            {isTopLevelEdit && !form.isActive && (
              <Alert tone='warning'>{t('categories.form.hideWarning')}</Alert>
            )}
            <FormActions
              onCancel={close}
              saving={saving}
              submitLabel={
                isEdit ? t('common.save') : t('categories.form.add')
              }
            />
          </form>
        </FormDialog>
      )}
    </>
  );
}
