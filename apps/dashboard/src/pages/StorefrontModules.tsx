import { useMemo, useState } from 'react';
import { Layers, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  useAdminStorefrontModules,
  useCreateStorefrontModuleMutation,
  useDeleteStorefrontModuleMutation,
  useUpdateStorefrontModuleMutation,
} from '../hooks/useAdminStorefrontModules';
import {
  errorMessage,
  type AdminStorefrontModule,
  type StorefrontModulePayload,
  type StorefrontModuleType,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { HeroSlidesEditor } from '../components/storefront/HeroSlidesEditor';
import { validateHeroSlides } from '../lib/heroSlides';
import { FormActions, FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import {
  DataTable,
  RowActions,
  TableCount,
  type DataTableColumn,
} from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { Field, Input, Select, Switch } from '../components/ui/Field';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';

const MODULE_TYPES: StorefrontModuleType[] = [
  'hero_carousel',
  'trust_strip',
  'featured_brands',
  'bestsellers',
  'new_arrivals',
  'deals_rail',
  'lookbooks',
  'testimonials',
  'categories',
  'why_choose_us',
];

const emptyForm: StorefrontModulePayload = {
  key: '',
  type: 'hero_carousel',
  title: '',
  active: true,
  sortOrder: 0,
  slides: [],
  trustItems: [],
  limit: 8,
  items: [],
};

export default function StorefrontModules() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tv, formatNumber } = useT();
  const modulesQ = useAdminStorefrontModules({ limit: 100 });
  const createMut = useCreateStorefrontModuleMutation();
  const updateMut = useUpdateStorefrontModuleMutation();
  const deleteMut = useDeleteStorefrontModuleMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminStorefrontModule | null>(null);
  const [form, setForm] = useState<StorefrontModulePayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = modulesQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.key.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q) ||
        (m.title || '').toLowerCase().includes(q),
    );
  }, [modulesQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(module: AdminStorefrontModule) {
    setEditing(module);
    setForm({
      key: module.key,
      type: module.type,
      title: module.title || '',
      active: module.active,
      sortOrder: module.sortOrder,
      config: module.config || {},
      slides: module.slides || [],
      trustItems: module.trustItems || [],
      limit: module.limit || 8,
      items: module.items || [],
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.key.trim() || !form.type) {
      toast.error(t('storefrontModules.required'));
      return;
    }

    const isHero = form.type === 'hero_carousel';
    const slideError = isHero ? validateHeroSlides(form.slides || []) : null;
    if (slideError) {
      toast.error(t(slideError.key, slideError.vars));
      return;
    }

    const payload: StorefrontModulePayload = {
      ...form,
      // Order in the editor is the display order.
      slides: isHero
        ? (form.slides || []).map((slide, index) => ({
            ...slide,
            sortOrder: index,
          }))
        : form.slides,
      key: form.key.trim(),
      title: (form.title || '').trim(),
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
      toast.error(errorMessage(err, t('storefrontModules.saveFailed')));
    }
  }

  async function handleDelete(module: AdminStorefrontModule) {
    const ok = await confirm({
      message: t('storefrontModules.confirmDelete', {
        key: module.key,
        type: tv('moduleType', module.type),
      }),
      danger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(module._id);
    } catch (err) {
      toast.error(errorMessage(err, t('storefrontModules.deleteFailed')));
    }
  }

  const columns: DataTableColumn<AdminStorefrontModule>[] = [
    {
      key: 'sortOrder',
      header: t('storefrontModules.columns.order'),
      headerClassName: 'w-16',
      cell: (module) => (
        <span className='inline-flex size-7 items-center justify-center rounded-control border border-border bg-muted text-xs font-semibold tabular-nums'>
          {formatNumber(module.sortOrder)}
        </span>
      ),
    },
    {
      key: 'title',
      header: t('storefrontModules.columns.title'),
      cell: (module) => (
        <div className='min-w-0'>
          <p
            className='font-medium text-foreground'
            dir='auto'
          >
            {module.title || '—'}
          </p>
          <p
            className='font-mono text-xs text-muted-foreground'
            dir='ltr'
          >
            {module.key}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('storefrontModules.columns.type'),
      cell: (module) => <Badge plain>{tv('moduleType', module.type)}</Badge>,
    },
    {
      key: 'active',
      header: t('common.status'),
      cell: (module) => (
        <StatusBadge status={module.active ? 'active' : 'inactive'}>
          {module.active ? t('common.active') : t('common.inactive')}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      actions: true,
      cell: (module) => (
        <RowActions>
          {can('content:write') && (
            <IconButton
              icon={<Pencil aria-hidden />}
              label={t('common.editItem', { name: module.title || module.key })}
              onClick={() => openEdit(module)}
            />
          )}
          {can('content:delete') && (
            <IconButton
              icon={<Trash2 aria-hidden />}
              label={t('common.deleteItem', {
                name: module.title || module.key,
              })}
              onClick={() => void handleDelete(module)}
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
        title={t('storefrontModules.title')}
        description={t('storefrontModules.subtitle')}
        actions={
          can('content:write') && (
            <Button
              variant='primary'
              onClick={openCreate}
              icon={<Plus aria-hidden />}
            >
              {t('storefrontModules.add')}
            </Button>
          )
        }
      />

      {modulesQ.isError ? (
        <Alert tone='error'>
          {errorMessage(modulesQ.error, t('storefrontModules.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('storefrontModules.title')}
          data={filtered}
          columns={columns}
          getKey={(module) => module._id}
          loading={modulesQ.isLoading}
          fetching={modulesQ.isFetching}
          emptyIcon={<Layers aria-hidden />}
          emptyTitle={t('storefrontModules.empty')}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: t('storefrontModules.searchPlaceholder'),
                label: t('storefrontModules.searchLabel'),
              }}
              canClear={Boolean(search)}
              onClear={() => setSearch('')}
            />
          }
          footer={
            modulesQ.data?.meta && (
              <TableCount>
                {t('storefrontModules.showing', {
                  shown: formatNumber(filtered.length),
                  total: formatNumber(modulesQ.data.meta.total),
                })}
              </TableCount>
            )
          }
        />
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={
            editing
              ? t('storefrontModules.form.editTitle')
              : t('storefrontModules.form.createTitle')
          }
          busy={saving}
          size='editor'
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-4'
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field
                label={t('storefrontModules.form.key')}
                required
              >
                <Input
                  required
                  value={form.key}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, key: e.target.value }))
                  }
                  placeholder='hero'
                  dir='ltr'
                  className='font-mono'
                />
              </Field>
              <Field
                label={t('storefrontModules.form.type')}
                required
              >
                <Select
                  required
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as StorefrontModuleType,
                    }))
                  }
                >
                  {MODULE_TYPES.map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {tv('moduleType', type)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('storefrontModules.form.title')}>
                <Input
                  value={form.title || ''}
                  dir='auto'
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </Field>
              <Field label={t('storefrontModules.form.sortOrder')}>
                <Input
                  type='number'
                  value={form.sortOrder ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                />
              </Field>
            </div>
            <Switch
              checked={!!form.active}
              onCheckedChange={(active) => setForm((f) => ({ ...f, active }))}
              label={t('common.active')}
            />
            {form.type === 'hero_carousel' && (
              <div className='border-t border-border pt-5'>
                <HeroSlidesEditor
                  value={form.slides || []}
                  onChange={(slides) => setForm((f) => ({ ...f, slides }))}
                />
              </div>
            )}
            <FormActions
              onCancel={() => setOpen(false)}
              saving={saving}
              submitLabel={editing ? t('common.save') : t('common.create')}
            />
          </form>
        </FormDialog>
      )}
    </>
  );
}
