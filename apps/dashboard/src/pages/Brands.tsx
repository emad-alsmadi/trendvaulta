import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2 } from 'lucide-react';
// @ts-ignore
import { DataTable } from 'primereact/datatable';
// @ts-ignore
import { Column } from 'primereact/column';
// @ts-ignore
import { InputText } from 'primereact/inputtext';
// @ts-ignore
import { Dropdown } from 'primereact/dropdown';
// @ts-ignore
import { Button } from 'primereact/button';
// @ts-ignore
import { Dialog } from 'primereact/dialog';
import {
  useAdminBrands,
  useCreateBrandMutation,
  useDeleteBrandMutation,
  useUpdateBrandMutation,
} from '../hooks/useAdminCatalog';
import {
  errorMessage,
  type AdminBrand,
  type BrandFormPayload,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useTableQuery, type SortOrder } from '../hooks/useTableQuery';
import { ImageUploadField } from '../components/ui/ImageUploadField';
import { useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';

// @ts-ignore - PrimeReact types are bundled
const ColumnWrapper = Column as any;
// @ts-ignore - PrimeReact types are bundled
const DropdownWrapper = Dropdown as any;
// @ts-ignore - PrimeReact types are bundled
const DataTableWrapper = DataTable as any;
// @ts-ignore - PrimeReact types are bundled
const InputTextWrapper = InputText as any;
// @ts-ignore - PrimeReact types are bundled
const DialogWrapper = Dialog as any;

const emptyForm: BrandFormPayload = {
  name: '',
  slug: '',
  description: '',
  logo: '',
  website: '',
  country: '',
  isActive: true,
  featured: false,
};

/** Backend Joi uses `Joi.string()` for optional fields, which rejects ''. */
function toBrandPayload(form: BrandFormPayload): BrandFormPayload {
  const payload: BrandFormPayload = {
    name: form.name.trim(),
    slug: form.slug.trim(),
  };
  if (form.description?.trim()) payload.description = form.description.trim();
  if (form.logo?.trim()) payload.logo = form.logo.trim();
  if (form.website?.trim()) payload.website = form.website.trim();
  if (form.country?.trim()) payload.country = form.country.trim();
  payload.isActive = form.isActive ?? true;
  payload.featured = form.featured ?? false;
  return payload;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function Brands() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useT();
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBrand | null>(null);
  const [form, setForm] = useState<BrandFormPayload>(emptyForm);

  const table = useTableQuery({ limit: 24, sort: 'name', order: 'asc' });
  const { resetPage } = table;

  const brandsQ = useAdminBrands({
    ...table.params,
    q: appliedQ || undefined,
  });
  const createMut = useCreateBrandMutation();
  const updateMut = useUpdateBrandMutation();
  const deleteMut = useDeleteBrandMutation();

  const saving = createMut.isPending || updateMut.isPending;

  const brands = brandsQ.data?.data || [];
  const meta = brandsQ.data?.meta;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(brand: AdminBrand) {
    setEditing(brand);
    setForm({
      name: brand.name,
      slug: brand.slug,
      description: brand.description || '',
      logo: brand.logo || '',
      website: brand.website || '',
      country: brand.country || '',
      isActive: brand.isActive ?? true,
      featured: brand.featured ?? false,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error(t('brands.required'));
      return;
    }
    const payload = toBrandPayload(form);
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing._id, payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err, t('brands.saveFailed')));
    }
  }

  async function handleDelete(brand: AdminBrand) {
    // The API deactivates (products keep their brand), so no product check
    // is needed any more.
    const ok = await confirm({
      message: t('brands.confirmDeactivate', { name: brand.name }),
      danger: true,
      confirmLabel: t('brands.deactivate'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(brand._id);
    } catch (err) {
      toast.error(errorMessage(err, t('brands.deactivateFailed')));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        title={t('brands.title')}
        description={t('brands.subtitle')}
        actions={
          can('brands:write') && (
            <Button
              onClick={openCreate}
              label={t('brands.add')}
              icon={<Plus className='icon-sm' aria-hidden />}
            />
          )
        }
      />

      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end'>
        <InputTextWrapper
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          placeholder={t('brands.searchPlaceholder')}
          className='w-full sm:w-64'
        />
        <DropdownWrapper
          value={`${table.sort}:${table.order}`}
          options={[
            { label: t('brands.sortNameAsc'), value: 'name:asc' },
            { label: t('brands.sortNameDesc'), value: 'name:desc' },
            { label: t('brands.sortNewest'), value: 'createdAt:desc' },
            { label: t('brands.sortOldest'), value: 'createdAt:asc' },
          ]}
          onChange={(e) => {
            const [field, order] = e.value.split(':');
            table.setSort(field, order as SortOrder);
          }}
          placeholder={t('brands.sortLabel')}
          className='w-full sm:w-48'
        />
        <Button
          label={t('brands.searchLabel')}
          onClick={() => {
            setAppliedQ(search.trim());
            resetPage();
          }}
          className='w-full sm:w-auto'
        />
        {(appliedQ || table.sort !== 'name' || table.order !== 'asc') && (
          <Button
            label='Clear'
            onClick={() => {
              setSearch('');
              setAppliedQ('');
              table.setSort('name', 'asc');
              resetPage();
            }}
            severity='secondary'
            className='w-full sm:w-auto'
          />
        )}
      </div>

      {brandsQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          {t('brands.loading')}
        </p>
      )}
      {brandsQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(brandsQ.error, t('brands.loadFailed'))}
        </div>
      )}

      {!brandsQ.isLoading && !brandsQ.isError && (
        <div className='rounded-xl border border-gray-200 bg-card shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <DataTableWrapper
            value={brands}
            paginator
            rows={24}
            totalRecords={meta?.total}
            lazy
            onPage={table.setPage}
            first={(meta?.page ? meta.page - 1 : 0) * 24}
            loading={brandsQ.isFetching}
            emptyMessage={t('brands.empty')}
            sortField={table.sort}
            sortOrder={table.order === 'asc' ? 1 : -1}
            onSort={table.toggleSort}
            className='p-datatable-sm'
          >
            <ColumnWrapper
              header={t('brands.columns.logo')}
              body={(brand: any) => (
                <div className='h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-gradient-to-br from-purple-400 to-cyan-500'>
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt=''
                      className='h-full w-full object-cover'
                    />
                  ) : (
                    <span className='flex h-full w-full items-center justify-center text-xl font-bold text-white'>
                      {brand.name.charAt(0)}
                    </span>
                  )}
                </div>
              )}
            />
            <ColumnWrapper
              field='name'
              header={t('brands.columns.name')}
              sortable
              body={(brand: any) => (
                <div className='flex flex-wrap items-center gap-1.5'>
                  <span className='font-semibold text-foreground'>
                    {brand.name}
                  </span>
                  {brand.isActive === false && (
                    <span className='rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-300'>
                      {t('common.inactive')}
                    </span>
                  )}
                  {brand.featured && (
                    <span className='rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'>
                      {t('brands.featured')}
                    </span>
                  )}
                </div>
              )}
            />
            <ColumnWrapper
              field='slug'
              header={t('brands.columns.slug')}
              sortable
              body={(brand: any) => (
                <span
                  className='text-xs text-muted-foreground'
                  dir='ltr'
                >
                  {brand.slug}
                </span>
              )}
            />
            <ColumnWrapper
              field='country'
              header={t('brands.columns.country')}
              body={(brand: any) => brand.country || '—'}
            />
            <ColumnWrapper
              field='website'
              header={t('brands.columns.website')}
              body={(brand: any) => (
                <span
                  className='truncate text-sm text-muted-foreground'
                  dir={brand.website ? 'ltr' : undefined}
                >
                  {brand.website || t('brands.noWebsite')}
                </span>
              )}
            />
            <ColumnWrapper
              header={t('common.actions')}
              body={(brand: any) => (
                <div className='flex gap-1'>
                  {can('brands:write') && (
                    <button
                      type='button'
                      onClick={() => openEdit(brand)}
                      className='rounded p-1.5 hover:bg-accent transition-colors duration-200'
                      aria-label={t('common.editItem', { name: brand.name })}
                    >
                      <Pencil
                        className='icon-sm text-muted-foreground'
                        aria-hidden
                      />
                    </button>
                  )}
                  {can('brands:delete') && (
                    <button
                      type='button'
                      onClick={() => void handleDelete(brand)}
                      disabled={deleteMut.isPending}
                      className='rounded p-1.5 hover:bg-destructive/10 transition-colors duration-200'
                      aria-label={t('common.deleteItem', { name: brand.name })}
                    >
                      <Trash2
                        className='icon-sm text-muted-foreground hover:text-destructive'
                        aria-hidden
                      />
                    </button>
                  )}
                </div>
              )}
            />
          </DataTableWrapper>
        </div>
      )}

      {!brandsQ.isLoading && !brandsQ.isError && (
        <DataTableWrapper
          value={brands}
          paginator
          rows={table.params.limit}
          totalRecords={meta?.total}
          lazy
          onPage={table.setPage}
          first={(meta?.page ? meta.page - 1 : 0) * table.params.limit}
          loading={brandsQ.isFetching}
          emptyMessage={t('brands.empty')}
          sortField={table.sort}
          sortOrder={table.order === 'asc' ? 1 : -1}
          onSort={table.toggleSort}
          className='p-datatable-sm'
        >
          <Column
            field='name'
            header={t('brands.columns.name')}
            sortable
          />
          <Column
            field='slug'
            header={t('brands.columns.slug')}
          />
          <Column
            field='isActive'
            header={t('brands.columns.status')}
            body={(brand: any) => (
              <span className={brand.isActive ? 'text-green-600' : 'text-gray-500'}>
                {brand.isActive ? t('brands.active') : t('brands.inactive')}
              </span>
            )}
          />
          <Column
            field='featured'
            header={t('brands.columns.featured')}
            body={(brand: any) => (
              <span className={brand.featured ? 'text-yellow-600' : 'text-gray-500'}>
                {brand.featured ? '★' : '—'}
              </span>
            )}
          />
          <Column
            header={t('brands.columns.actions')}
            body={(brand: any) => (
              <div className='flex gap-2'>
                {can('brands:write') && (
                  <Button
                    size='small'
                    icon={<Pencil className='icon-sm' />}
                    onClick={() => openEdit(brand)}
                    label={t('brands.edit')}
                  />
                )}
                {can('brands:delete') && (
                  <Button
                    size='small'
                    severity='danger'
                    icon={<Trash2 className='icon-sm' />}
                    onClick={() => void handleDelete(brand)}
                    label={t('brands.delete')}
                  />
                )}
              </div>
            )}
          />
        </DataTableWrapper>
      )}

      <DialogWrapper
        visible={open}
        onHide={() => setOpen(false)}
        header={
          editing ? t('brands.form.editTitle') : t('brands.form.createTitle')
        }
        modal
        className='w-full max-w-lg'
      >
          <form
            onSubmit={handleSubmit}
            className='space-y-3'
          >
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('brands.form.name')}
              </span>
              <input
                required
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: editing ? f.slug : slugify(name),
                  }));
                }}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('brands.form.slug')}
              </span>
              <input
                required
                value={form.slug}
                dir='ltr'
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('brands.form.country')}
              </span>
              <input
                value={form.country}
                onChange={(e) =>
                  setForm((f) => ({ ...f, country: e.target.value }))
                }
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('brands.form.website')}
              </span>
              <input
                value={form.website}
                dir='ltr'
                onChange={(e) =>
                  setForm((f) => ({ ...f, website: e.target.value }))
                }
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <ImageUploadField
              label={t('brands.form.logo')}
              value={form.logo ?? ''}
              onChange={(url) => setForm((f) => ({ ...f, logo: url }))}
            />
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('common.description')}
              </span>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <div className='flex flex-wrap gap-4'>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={form.isActive ?? true}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className='h-4 w-4 rounded border-gray-300'
                />
                <span className='text-gray-700 dark:text-gray-300'>
                  {t('common.active')}
                </span>
              </label>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={form.featured ?? false}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, featured: e.target.checked }))
                  }
                  className='h-4 w-4 rounded border-gray-300'
                />
                <span className='text-gray-700 dark:text-gray-300'>
                  {t('brands.form.featured')}
                </span>
              </label>
            </div>
            <div className='flex justify-end gap-2 pt-2'>
              <Button
                type='button'
                disabled={saving}
                onClick={() => setOpen(false)}
                severity='secondary'
                label={t('common.cancel')}
              />
              <Button
                type='submit'
                disabled={saving}
                label={
                  saving
                    ? t('common.saving')
                    : editing
                      ? t('common.save')
                      : t('common.create')
                }
              />
            </div>
            </form>
          </DialogWrapper>
      )}
    </motion.div>
  );
}
