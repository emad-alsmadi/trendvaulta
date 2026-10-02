import { useState } from 'react';
import { PackageOpen, Plus, Pencil, Trash2, X } from 'lucide-react';
import {
  useAdminBundles,
  useCreateBundleMutation,
  useDeleteBundleMutation,
  useUpdateBundleMutation,
} from '../hooks/useAdminBundles';
import { errorMessage, type AdminBundle, type BundlePayload } from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useTableQuery } from '../hooks/useTableQuery';
import { FormActions, FormDialog } from '../components/ui/FormDialog';
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
import { FilterBar } from '../components/ui/FilterBar';
import { Field, Input, Switch } from '../components/ui/Field';
import { StatusBadge } from '../components/ui/StatusBadge';
import { hintClass, labelClass } from '../components/ui/styles';

const emptyForm: BundlePayload = {
  primaryProduct: '',
  items: [
    { product: '', quantity: 1 },
    { product: '', quantity: 1 },
  ],
  bundlePrice: 0,
  savings: 0,
  active: true,
};

/** Products are hard-deleted, so a populated primaryProduct can be null. */
function primaryTitle(bundle: AdminBundle, deletedLabel: string) {
  return bundle.primaryProduct?.title || deletedLabel;
}

export default function Bundles() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatCurrency, formatNumber } = useT();
  const titleOf = (b: AdminBundle) =>
    primaryTitle(b, t('bundles.deletedProduct'));
  const table = useTableQuery({ limit: 25, sort: 'createdAt', order: 'desc' });
  const { resetPage } = table;
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const bundlesQ = useAdminBundles({
    ...table.params,
    q: appliedQ || undefined,
  });
  const createMut = useCreateBundleMutation();
  const updateMut = useUpdateBundleMutation();
  const deleteMut = useDeleteBundleMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBundle | null>(null);
  const [form, setForm] = useState<BundlePayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const bundles = bundlesQ.data?.data || [];
  const meta = bundlesQ.data?.meta;

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(bundle: AdminBundle) {
    setEditing(bundle);
    setForm({
      // A deleted product populates as null — leave the field empty so the
      // admin picks a replacement instead of the page crashing.
      primaryProduct: bundle.primaryProduct?._id ?? '',
      // Admin list populates items[].product; the form works with ids.
      items: bundle.items.map((item) => ({
        product:
          typeof item.product === 'string'
            ? item.product
            : (item.product?._id ?? ''),
        quantity: item.quantity,
      })),
      bundlePrice: bundle.bundlePrice,
      savings: bundle.savings,
      active: bundle.active,
    });
    setOpen(true);
  }

  function updateItem(
    index: number,
    field: 'product' | 'quantity',
    value: string | number,
  ) {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm((f) => ({ ...f, items: newItems }));
  }

  function addItem() {
    setForm((f) => ({
      ...f,
      items: [...f.items, { product: '', quantity: 1 }],
    }));
  }

  function removeItem(index: number) {
    if (form.items.length <= 2) return;
    const newItems = form.items.filter((_, i) => i !== index);
    setForm((f) => ({ ...f, items: newItems }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.primaryProduct.trim()) {
      toast.error(t('bundles.primaryRequired'));
      return;
    }
    if (!form.items || form.items.length < 2) {
      toast.error(t('bundles.minItems'));
      return;
    }
    const hasEmptyItem = form.items.some((item) => !item.product.trim());
    if (hasEmptyItem) {
      toast.error(t('bundles.emptyItem'));
      return;
    }

    const payload: BundlePayload = {
      primaryProduct: form.primaryProduct.trim(),
      items: form.items.map((item) => ({
        product: item.product.trim(),
        quantity: Number(item.quantity) || 1,
      })),
      bundlePrice: Number(form.bundlePrice) || 0,
      savings: Number(form.savings) || 0,
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
      toast.error(errorMessage(err, t('bundles.saveFailed')));
    }
  }

  async function handleDelete(bundle: AdminBundle) {
    const ok = await confirm({
      message: t('bundles.confirmDelete', { title: titleOf(bundle) }),
      danger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(bundle._id);
    } catch (err) {
      toast.error(errorMessage(err, t('bundles.deleteFailed')));
    }
  }

  const columns: DataTableColumn<AdminBundle>[] = [
    {
      key: 'primary',
      header: t('bundles.columns.primary'),
      cell: (bundle) => (
        <span
          className={
            bundle.primaryProduct
              ? 'font-medium text-foreground'
              : 'italic text-muted-foreground'
          }
          dir='auto'
        >
          {titleOf(bundle)}
        </span>
      ),
    },
    {
      key: 'items',
      header: t('bundles.columns.items'),
      className: 'text-muted-foreground',
      cell: (bundle) =>
        t('bundles.itemCount', { count: formatNumber(bundle.items.length) }),
    },
    {
      key: 'bundlePrice',
      header: t('bundles.columns.price'),
      sortable: true,
      numeric: true,
      className: 'font-medium',
      cell: (bundle) => formatCurrency(bundle.bundlePrice),
    },
    {
      key: 'savings',
      header: t('bundles.columns.savings'),
      sortable: true,
      numeric: true,
      cell: (bundle) => `−${formatCurrency(bundle.savings)}`,
    },
    {
      key: 'active',
      header: t('common.status'),
      cell: (bundle) => (
        <StatusBadge status={bundle.active ? 'active' : 'inactive'}>
          {bundle.active ? t('common.active') : t('common.inactive')}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      actions: true,
      cell: (bundle) => (
        <RowActions>
          {can('content:write') && (
            <IconButton
              icon={<Pencil aria-hidden />}
              label={t('common.editItem', { name: titleOf(bundle) })}
              onClick={() => openEdit(bundle)}
            />
          )}
          {can('content:delete') && (
            <IconButton
              icon={<Trash2 aria-hidden />}
              label={t('common.deleteItem', { name: titleOf(bundle) })}
              onClick={() => void handleDelete(bundle)}
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
        title={t('bundles.title')}
        description={t('bundles.subtitle')}
        actions={
          can('content:write') && (
            <Button
              variant='primary'
              onClick={openCreate}
              icon={<Plus aria-hidden />}
            >
              {t('bundles.add')}
            </Button>
          )
        }
      />

      {bundlesQ.isError ? (
        <Alert tone='error'>
          {errorMessage(bundlesQ.error, t('bundles.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('bundles.title')}
          data={bundles}
          columns={columns}
          getKey={(bundle) => bundle._id}
          loading={bundlesQ.isLoading}
          fetching={bundlesQ.isFetching}
          sort={table.sort}
          order={table.order}
          onSort={table.toggleSort}
          meta={meta}
          onPage={table.setPage}
          onLimit={table.setLimit}
          emptyIcon={<PackageOpen aria-hidden />}
          emptyTitle={t('bundles.empty')}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                onSubmit: () => {
                  setAppliedQ(search.trim());
                  resetPage();
                },
                placeholder: t('bundles.searchPlaceholder'),
                label: t('bundles.searchLabel'),
                submitLabel: t('common.search'),
              }}
              canClear={Boolean(appliedQ)}
              onClear={() => {
                setSearch('');
                setAppliedQ('');
                resetPage();
              }}
            />
          }
        />
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={
            editing ? t('bundles.form.editTitle') : t('bundles.form.createTitle')
          }
          busy={saving}
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-5'
          >
            <Field
              label={t('bundles.form.primaryId')}
              required
            >
              <Input
                required
                value={form.primaryProduct}
                onChange={(e) =>
                  setForm((f) => ({ ...f, primaryProduct: e.target.value }))
                }
                placeholder={t('bundles.form.productId')}
                dir='ltr'
                className='font-mono'
              />
            </Field>
            <div
              role='group'
              aria-labelledby='bundle-items-label'
              className='space-y-2'
            >
              <p
                id='bundle-items-label'
                className={labelClass}
              >
                {t('bundles.form.items')}
              </p>
              <ol className='space-y-2'>
                {form.items.map((item, index) => (
                  <li
                    key={index}
                    className='flex items-center gap-2'
                  >
                    <span
                      aria-hidden
                      className='flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold tabular-nums text-muted-foreground'
                    >
                      {index + 1}
                    </span>
                    <Input
                      required
                      value={item.product}
                      onChange={(e) =>
                        updateItem(index, 'product', e.target.value)
                      }
                      placeholder={t('bundles.form.productId')}
                      aria-label={t('bundles.form.itemProduct', {
                        n: index + 1,
                      })}
                      dir='ltr'
                      className='min-w-0 flex-1 font-mono'
                    />
                    <Input
                      type='number'
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, 'quantity', e.target.value)
                      }
                      placeholder={t('bundles.form.qty')}
                      aria-label={t('bundles.form.itemQty', { n: index + 1 })}
                      className='w-20 shrink-0'
                    />
                    <IconButton
                      icon={<X aria-hidden />}
                      label={t('bundles.form.removeItem', { n: index + 1 })}
                      size='md'
                      onClick={() => removeItem(index)}
                      disabled={form.items.length <= 2}
                    />
                  </li>
                ))}
              </ol>
              <Button
                size='sm'
                className='border-dashed shadow-none'
                onClick={addItem}
                icon={<Plus aria-hidden />}
              >
                {t('bundles.form.addItem').replace(/^\+\s*/, '')}
              </Button>
              <p className={hintClass}>{t('bundles.minItems')}</p>
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field
                label={t('bundles.form.price')}
                required
              >
                <Input
                  required
                  type='number'
                  step='0.01'
                  min={0}
                  value={form.bundlePrice}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bundlePrice: Number(e.target.value),
                    }))
                  }
                />
              </Field>
              <Field
                label={t('bundles.form.savings')}
                required
              >
                <Input
                  required
                  type='number'
                  step='0.01'
                  min={0}
                  value={form.savings}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, savings: Number(e.target.value) }))
                  }
                />
              </Field>
            </div>
            <Switch
              checked={!!form.active}
              onCheckedChange={(active) => setForm((f) => ({ ...f, active }))}
              label={t('common.active')}
            />
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
