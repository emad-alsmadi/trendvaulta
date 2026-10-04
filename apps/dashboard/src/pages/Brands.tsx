import { useState } from 'react';
import { Plus, Pencil, Star, Tag, Trash2 } from 'lucide-react';
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
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import {
  DataTable,
  RowActions,
  type DataTableColumn,
} from '../components/ui/DataTable';
import { FilterBar, FilterBarItem } from '../components/ui/FilterBar';
import { Field, Input, Select, Switch, Textarea } from '../components/ui/Field';
import { FormDialog, FormDialogFooter } from '../components/ui/FormDialog';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';

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

  const table = useTableQuery({ limit: 25, sort: 'name', order: 'asc' });
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
  const filtered =
    Boolean(appliedQ) || table.sort !== 'name' || table.order !== 'asc';

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

  const columns: DataTableColumn<AdminBrand>[] = [
    {
      key: 'name',
      header: t('brands.columns.name'),
      sortable: true,
      cell: (brand) => (
        <div className='flex items-center gap-3'>
          <span className='flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-muted text-sm font-semibold uppercase text-muted-foreground'>
            {brand.logo ? (
              <img
                src={brand.logo}
                alt=''
                loading='lazy'
                className='size-full object-cover'
              />
            ) : (
              brand.name.charAt(0)
            )}
          </span>
          <div className='min-w-0'>
            <p className='flex items-center gap-1.5 font-medium text-foreground'>
              <span className='truncate'>{brand.name}</span>
              {brand.featured && (
                <Star
                  className='size-3.5 shrink-0 fill-current'
                  aria-label={t('brands.featured')}
                />
              )}
            </p>
            <p
              className='truncate text-xs text-muted-foreground'
              dir='ltr'
            >
              {brand.slug}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'country',
      header: t('brands.columns.country'),
      cell: (brand) =>
        brand.country || <span className='text-muted-foreground'>—</span>,
    },
    {
      key: 'website',
      header: t('brands.columns.website'),
      className: 'max-w-[16rem]',
      cell: (brand) =>
        brand.website ? (
          <span
            className='block truncate text-muted-foreground'
            dir='ltr'
          >
            {brand.website}
          </span>
        ) : (
          <span className='text-muted-foreground'>{t('brands.noWebsite')}</span>
        ),
    },
    {
      key: 'status',
      header: t('brands.columns.status'),
      cell: (brand) => (
        <div className='flex flex-wrap items-center gap-1.5'>
          <StatusBadge status={brand.isActive === false ? 'inactive' : 'active'}>
            {brand.isActive === false ? t('brands.inactive') : t('brands.active')}
          </StatusBadge>
          {brand.featured && <Badge plain>{t('brands.featured')}</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      actions: true,
      cell: (brand) => (
        <RowActions>
          {can('brands:write') && (
            <IconButton
              icon={<Pencil aria-hidden />}
              label={t('common.editItem', { name: brand.name })}
              onClick={() => openEdit(brand)}
            />
          )}
          {can('brands:delete') && (
            <IconButton
              icon={<Trash2 aria-hidden />}
              label={t('common.deactivateItem', { name: brand.name })}
              onClick={() => void handleDelete(brand)}
              disabled={deleteMut.isPending}
            />
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('brands.title')}
        description={t('brands.subtitle')}
        actions={
          can('brands:write') && (
            <Button
              variant='primary'
              onClick={openCreate}
              icon={<Plus aria-hidden />}
            >
              {t('brands.add')}
            </Button>
          )
        }
      />

      {brandsQ.isError ? (
        <Alert tone='error'>
          {errorMessage(brandsQ.error, t('brands.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('brands.title')}
          data={brands}
          columns={columns}
          getKey={(brand) => brand._id}
          loading={brandsQ.isLoading}
          fetching={brandsQ.isFetching}
          sort={table.sort}
          order={table.order}
          onSort={table.toggleSort}
          meta={meta}
          onPage={table.setPage}
          onLimit={table.setLimit}
          emptyIcon={<Tag aria-hidden />}
          emptyTitle={t('brands.empty')}
          emptyAction={
            !filtered &&
            can('brands:write') && (
              <Button
                variant='primary'
                size='sm'
                onClick={openCreate}
                icon={<Plus aria-hidden />}
              >
                {t('brands.add')}
              </Button>
            )
          }
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                onSubmit: () => {
                  setAppliedQ(search.trim());
                  resetPage();
                },
                placeholder: t('brands.searchPlaceholder'),
                label: t('brands.searchLabel'),
                submitLabel: t('common.search'),
              }}
              canClear={filtered}
              onClear={() => {
                setSearch('');
                setAppliedQ('');
                table.setSort('name', 'asc');
              }}
            >
              <FilterBarItem>
                <Select
                  aria-label={t('brands.sortLabel')}
                  value={`${table.sort}:${table.order}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split(':');
                    table.setSort(field, order as SortOrder);
                  }}
                >
                  <option value='name:asc'>{t('brands.sortNameAsc')}</option>
                  <option value='name:desc'>{t('brands.sortNameDesc')}</option>
                  <option value='createdAt:desc'>{t('brands.sortNewest')}</option>
                  <option value='createdAt:asc'>{t('brands.sortOldest')}</option>
                </Select>
              </FilterBarItem>
            </FilterBar>
          }
        />
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={
            editing ? t('brands.form.editTitle') : t('brands.form.createTitle')
          }
          busy={saving}
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-4'
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field
                label={t('brands.form.name')}
                required
              >
                <Input
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
                />
              </Field>
              <Field
                label={t('brands.form.slug')}
                required
              >
                <Input
                  required
                  value={form.slug}
                  dir='ltr'
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                />
              </Field>
              <Field label={t('brands.form.country')}>
                <Input
                  value={form.country}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, country: e.target.value }))
                  }
                />
              </Field>
              <Field label={t('brands.form.website')}>
                <Input
                  value={form.website}
                  dir='ltr'
                  placeholder='https://'
                  onChange={(e) =>
                    setForm((f) => ({ ...f, website: e.target.value }))
                  }
                />
              </Field>
            </div>
            <ImageUploadField
              label={t('brands.form.logo')}
              value={form.logo ?? ''}
              onChange={(url) => setForm((f) => ({ ...f, logo: url }))}
            />
            <Field label={t('common.description')}>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
              />
            </Field>
            <div className='flex flex-wrap gap-x-8 gap-y-2'>
              <Switch
                checked={form.isActive ?? true}
                onCheckedChange={(isActive) =>
                  setForm((f) => ({ ...f, isActive }))
                }
                label={t('common.active')}
              />
              <Switch
                checked={form.featured ?? false}
                onCheckedChange={(featured) =>
                  setForm((f) => ({ ...f, featured }))
                }
                label={t('brands.form.featured')}
              />
            </div>
            <FormDialogFooter>
              <Button
                variant='ghost'
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type='submit'
                variant='primary'
                loading={saving}
              >
                {editing ? t('common.save') : t('common.create')}
              </Button>
            </FormDialogFooter>
          </form>
        </FormDialog>
      )}
    </>
  );
}
