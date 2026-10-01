import { useState } from 'react';
import { ChevronDown, Package, Plus, Pencil, Star, Trash2 } from 'lucide-react';
import {
  useAdminBrands,
  useAdminProducts,
  useCreateProductMutation,
  useDeleteProductMutation,
  useUpdateProductMutation,
} from '../hooks/useAdminCatalog';
import {
  errorMessage,
  type AdminProduct,
  type ProductDimensions,
  type ProductFormPayload,
  type ProductVariant,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { ImageUploadField } from '../components/ui/ImageUploadField';
import { GalleryField } from '../components/products/GalleryField';
import { VariantsEditor } from '../components/products/VariantsEditor';
import { cleanVariant, validateVariants } from '../lib/variants';
import { useTableQuery } from '../hooks/useTableQuery';
import { useAdminCategories } from '../hooks/useAdminCategories';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { StatusBadge, Badge } from '../components/ui/StatusBadge';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Checkbox,
  Field,
  Input,
  Select,
  Switch,
  Textarea,
} from '../components/ui/Field';
import {
  DataTable,
  RowActions,
  type DataTableColumn,
} from '../components/ui/DataTable';
import { FilterBar, FilterBarItem } from '../components/ui/FilterBar';
import {
  FormActions,
  FormDialog,
  FormSection,
} from '../components/ui/FormDialog';
import { TablePagination } from '../components/ui/TablePagination';
import { Thumbnail } from '../components/ui/Table';
import { useT } from '../i18n/I18nProvider';
import { ViewToggle, type ViewMode } from '../components/ui/ViewToggle';

const emptyForm: ProductFormPayload = {
  title: '',
  brand: '',
  description: '',
  price: 0,
  cover: '',
  category: 'makeup',
  subcategory: '',
  stock: 0,
  sku: '',
  isActive: true,
  featured: false,
  images: [],
  variants: [],
  material: '',
  dimensions: {},
  shippingInfo: { dimensions: {}, requiresSpecialHandling: false },
};

/** Values product.controller.js accepts for ?sort=. */
const SORT_OPTIONS = [
  'newest',
  'bestselling',
  'price_asc',
  'price_desc',
  'rating',
] as const;
// Must match the Product model enum (apps/api/models/Product.js).
const CATEGORY_OPTIONS = [
  'makeup',
  'skincare',
  'perfumes',
  'clothing',
  'accessories',
  'home',
];

/** Empty numeric input → undefined, so "not set" is distinct from 0. */
function numberOrUndefined(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Keep only the measured sides. An empty object is sent on purpose: it is
 *  how a cleared dimension set is saved (the field is replaced wholesale). */
function cleanDimensions(d?: ProductDimensions): ProductDimensions {
  const out: ProductDimensions = {};
  for (const key of ['length', 'width', 'height'] as const) {
    const v = d?.[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[key] = v;
  }
  return out;
}

/** Whether a product already has physical/shipping data worth showing. */
function hasPhysicalDetails(form: ProductFormPayload) {
  return Boolean(
    form.material ||
    form.weight !== undefined ||
    Object.keys(form.dimensions || {}).length ||
    form.shippingInfo?.weight !== undefined ||
    Object.keys(form.shippingInfo?.dimensions || {}).length ||
    form.shippingInfo?.requiresSpecialHandling,
  );
}

/** Total units across variants — what checkout keeps `product.stock` equal to. */
function variantStockTotal(variants?: ProductVariant[]) {
  return (variants || []).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
}

/** Drop empty optional strings so backend Joi (`Joi.string()`) doesn't reject ''. */
function toProductPayload(form: ProductFormPayload): ProductFormPayload {
  const variants = (form.variants || []).map(cleanVariant);
  const payload: ProductFormPayload = {
    title: form.title.trim(),
    brand: form.brand,
    description: form.description.trim(),
    price: form.price,
    cover: form.cover.trim(),
    category: form.category,
    subcategory: form.subcategory.trim(),
    // With variants, checkout sells from variant stock and keeps this in sync
    // as their sum (utils/commerce.js) — so save it that way from the start.
    stock: variants.length ? variantStockTotal(variants) : form.stock,
    isActive: form.isActive ?? true,
    featured: form.featured ?? false,
    images: Array.from(
      new Set((form.images || []).map((u) => u.trim()).filter(Boolean)),
    ),
    variants,
    dimensions: cleanDimensions(form.dimensions),
    shippingInfo: {
      dimensions: cleanDimensions(form.shippingInfo?.dimensions),
      requiresSpecialHandling: Boolean(
        form.shippingInfo?.requiresSpecialHandling,
      ),
      ...(form.shippingInfo?.weight !== undefined
        ? { weight: form.shippingInfo.weight }
        : {}),
    },
  };
  const sku = (form.sku ?? '').trim();
  if (sku) payload.sku = sku;
  const material = (form.material ?? '').trim();
  if (material) payload.material = material;
  if (form.weight !== undefined) payload.weight = form.weight;
  return payload;
}

function brandId(product: AdminProduct) {
  if (typeof product.brand === 'string') return product.brand;
  return product.brand?._id || '';
}

function brandName(product: AdminProduct) {
  if (product.brand && typeof product.brand === 'object') {
    return product.brand.name || '—';
  }
  return '—';
}

/** Optional measurement: empty stays "not set" rather than 0. */
function MeasureField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type='number'
        min={0}
        step='0.01'
        value={value ?? ''}
        onChange={(e) => onChange(numberOrUndefined(e.target.value))}
      />
    </Field>
  );
}

export default function Products() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tv, formatCurrency, formatNumber } = useT();
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [category, setCategory] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductFormPayload>(emptyForm);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  // Decided once when the dialog opens (open if saved values exist), then
  // left to the admin — tying it to live values would snap it shut when the
  // last field in it is cleared.
  const [physicalOpen, setPhysicalOpen] = useState(false);

  const table = useTableQuery({ limit: 24 });
  const { resetPage } = table;
  const [sortPreset, setSortPreset] = useState('newest');

  const productsQ = useAdminProducts({
    page: table.page,
    limit: table.limit,
    // Products take a named preset rather than field+order (product.controller.js).
    sort: sortPreset,
    q: appliedQ || undefined,
    category: category || undefined,
  });
  // The API caps staff brand lists at 500; one page feeds the picker below.
  const brandsQ = useAdminBrands({ limit: 500 });
  const createMut = useCreateProductMutation();
  const updateMut = useUpdateProductMutation();
  const deleteMut = useDeleteProductMutation();

  const brands = brandsQ.data?.data || [];
  const saving = createMut.isPending || updateMut.isPending;
  const defaultBrand = brands[0]?._id || '';

  const products = productsQ.data?.data || [];
  const meta = productsQ.data?.meta;

  const hasVariants = (form.variants?.length ?? 0) > 0;
  const hasFilters = Boolean(appliedQ || category || sortPreset !== 'newest');

  // Suggestions only: free text stays allowed so a product filed under a
  // value that predates the Categories screen can still be saved as-is.
  const categoriesQ = useAdminCategories();
  const subcategoryOptions = (categoriesQ.data || [])
    .filter((c) => c.parent === form.category)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, brand: defaultBrand });
    setPhysicalOpen(false);
    setOpen(true);
  }

  function openEdit(product: AdminProduct) {
    setEditing(product);
    const next: ProductFormPayload = {
      title: product.title,
      brand: brandId(product),
      description: product.description || '',
      price: product.price,
      cover: product.cover || '',
      category: product.category || 'makeup',
      subcategory: product.subcategory || '',
      stock: product.stock ?? 0,
      sku: product.sku || '',
      isActive: product.isActive ?? true,
      featured: product.featured ?? false,
      images: product.images || [],
      variants: (product.variants || []).map(cleanVariant),
      material: product.material || '',
      weight: product.weight,
      dimensions: cleanDimensions(product.dimensions),
      shippingInfo: {
        weight: product.shippingInfo?.weight,
        dimensions: cleanDimensions(product.shippingInfo?.dimensions),
        requiresSpecialHandling: Boolean(
          product.shippingInfo?.requiresSpecialHandling,
        ),
      },
    };
    setForm(next);
    setPhysicalOpen(hasPhysicalDetails(next));
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.brand || !form.cover.trim()) {
      toast.error(t('products.requiredBasics'));
      return;
    }
    if (!form.subcategory.trim() || form.description.trim().length < 3) {
      toast.error(t('products.requiredDetails'));
      return;
    }
    const variantProblem = validateVariants(form.variants || []);
    if (variantProblem) {
      toast.error(t(variantProblem.key, variantProblem.vars));
      return;
    }
    const payload = toProductPayload(form);
    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing._id,
          payload: { ...payload, expectedUpdatedAt: editing.updatedAt },
        });
      } else {
        await createMut.mutateAsync(payload);
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err, t('products.saveFailed')));
    }
  }

  async function handleDelete(product: AdminProduct) {
    const ok = await confirm({
      message: t('products.confirmDeactivate', { title: product.title }),
      danger: true,
      confirmLabel: t('products.deactivate'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(product._id);
    } catch (err) {
      toast.error(errorMessage(err, t('products.deactivateFailed')));
    }
  }

  const categoryLine = (product: AdminProduct) =>
    [
      brandName(product),
      product.category ? tv('productCategory', product.category) : null,
      product.subcategory || null,
    ]
      .filter(Boolean)
      .join(' · ');

  const badges = (product: AdminProduct) => (
    <>
      {product.isActive === false && (
        <StatusBadge status='inactive'>{t('products.inactive')}</StatusBadge>
      )}
      {product.featured && (
        <Badge
          tone='solid'
          plain
        >
          <Star
            className='me-1 inline size-3 fill-current align-[-1px]'
            aria-hidden
          />
          {t('products.featured')}
        </Badge>
      )}
    </>
  );

  const actions = (product: AdminProduct) => (
    <RowActions>
      {can('products:write') && (
        <IconButton
          icon={<Pencil aria-hidden />}
          label={t('products.edit', { title: product.title })}
          onClick={() => openEdit(product)}
        />
      )}
      {can('products:delete') && (
        <IconButton
          icon={<Trash2 aria-hidden />}
          label={t('products.delete', { title: product.title })}
          onClick={() => void handleDelete(product)}
          disabled={deleteMut.isPending}
        />
      )}
    </RowActions>
  );

  const columns: DataTableColumn<AdminProduct>[] = [
    {
      key: 'title',
      header: t('products.columns.title'),
      cell: (product) => (
        <div className='flex items-center gap-3'>
          <Thumbnail src={product.cover} />
          <div className='min-w-0'>
            <p className='max-w-[22rem] truncate font-medium text-foreground'>
              {product.title}
            </p>
            <p className='truncate text-xs text-muted-foreground'>
              {categoryLine(product)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (product) => (
        <div className='flex flex-wrap gap-1.5'>
          {product.isActive !== false && !product.featured ? (
            <StatusBadge status='active'>{t('common.active')}</StatusBadge>
          ) : (
            badges(product)
          )}
        </div>
      ),
    },
    {
      key: 'price',
      header: t('products.columns.price'),
      numeric: true,
      className: 'font-medium',
      cell: (product) => formatCurrency(Number(product.price || 0)),
    },
    {
      key: 'stock',
      header: t('products.columns.stock'),
      numeric: true,
      cell: (product) => formatNumber(product.stock ?? 0),
    },
    {
      key: 'actions',
      header: t('products.columns.actions'),
      actions: true,
      cell: actions,
    },
  ];

  const toolbar = (
    <FilterBar
      search={{
        value: search,
        onChange: setSearch,
        onSubmit: () => {
          setAppliedQ(search.trim());
          resetPage();
        },
        placeholder: t('products.searchPlaceholder'),
        label: t('products.searchLabel'),
        submitLabel: t('common.search'),
      }}
      canClear={hasFilters}
      onClear={() => {
        setSearch('');
        setAppliedQ('');
        setCategory('');
        setSortPreset('newest');
        resetPage();
      }}
      actions={
        <ViewToggle
          currentView={viewMode}
          onViewChange={setViewMode}
          availableViews={['card', 'list']}
        />
      }
    >
      <FilterBarItem>
        <Select
          aria-label={t('products.filterCategory')}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            resetPage();
          }}
        >
          <option value=''>{t('products.allCategories')}</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option
              key={c}
              value={c}
            >
              {tv('productCategory', c)}
            </option>
          ))}
        </Select>
      </FilterBarItem>
      <FilterBarItem>
        <Select
          aria-label={t('products.sortLabel')}
          value={sortPreset}
          onChange={(e) => {
            setSortPreset(e.target.value || 'newest');
            resetPage();
          }}
        >
          {SORT_OPTIONS.map((s) => (
            <option
              key={s}
              value={s}
            >
              {t(`products.sort.${s}`)}
            </option>
          ))}
        </Select>
      </FilterBarItem>
    </FilterBar>
  );

  return (
    <>
      <PageHeader
        title={t('products.title')}
        description={t('products.subtitle')}
        actions={
          can('products:write') && (
            <Button
              variant='primary'
              onClick={openCreate}
              disabled={!brands.length}
              title={!brands.length ? t('products.needBrand') : undefined}
              icon={<Plus aria-hidden />}
            >
              {t('products.add')}
            </Button>
          )
        }
      />

      {productsQ.isError ? (
        <Alert tone='error'>
          {errorMessage(productsQ.error, t('products.loadFailed'))}
        </Alert>
      ) : viewMode === 'list' ? (
        <DataTable
          caption={t('products.title')}
          data={products}
          columns={columns}
          getKey={(product) => product._id}
          loading={productsQ.isLoading}
          fetching={productsQ.isFetching}
          meta={meta}
          onPage={table.setPage}
          onLimit={table.setLimit}
          emptyIcon={<Package aria-hidden />}
          emptyTitle={t('products.empty')}
          toolbar={toolbar}
        />
      ) : (
        <div className='space-y-4'>
          <Card className='p-3 sm:p-4'>{toolbar}</Card>

          {productsQ.isLoading ? (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {Array.from({ length: 8 }).map((_, i) => (
                <Card
                  key={i}
                  as='div'
                  padded={false}
                  className='overflow-hidden'
                >
                  <Skeleton
                    variant='custom'
                    className='aspect-[4/3] w-full rounded-none'
                  />
                  <div className='space-y-2 p-4'>
                    <Skeleton className='w-3/4' />
                    <Skeleton className='w-1/2' />
                  </div>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon={<Package aria-hidden />}
                title={t('products.empty')}
              />
            </Card>
          ) : (
            <ul
              aria-busy={productsQ.isFetching || undefined}
              className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            >
              {products.map((product) => (
                <li key={product._id}>
                  <Card
                    as='article'
                    padded={false}
                    className='group flex h-full flex-col overflow-hidden transition-colors duration-normal hover:border-border-strong'
                  >
                    <div className='relative aspect-[4/3] overflow-hidden border-b border-border bg-muted'>
                      {product.cover ? (
                        <img
                          src={product.cover}
                          alt=''
                          loading='lazy'
                          className={
                            'size-full object-cover transition-transform duration-slow group-hover:scale-[1.03]' +
                            (product.isActive === false ? ' opacity-60 grayscale' : '')
                          }
                        />
                      ) : (
                        <span className='flex size-full items-center justify-center text-muted-foreground'>
                          <Package
                            className='icon-xl'
                            aria-hidden
                          />
                        </span>
                      )}
                      <div className='absolute start-3 top-3 flex flex-wrap gap-1.5'>
                        {badges(product)}
                      </div>
                    </div>
                    <div className='flex flex-1 flex-col gap-3 p-4'>
                      <div className='min-w-0'>
                        <h3 className='line-clamp-2 text-card-title text-foreground'>
                          {product.title}
                        </h3>
                        <p className='mt-1 truncate text-xs text-muted-foreground'>
                          {categoryLine(product)}
                        </p>
                      </div>
                      <div className='mt-auto flex items-end justify-between gap-2'>
                        <div>
                          <p className='text-section tabular-nums text-foreground'>
                            {formatCurrency(Number(product.price || 0))}
                          </p>
                          <p className='text-xs tabular-nums text-muted-foreground'>
                            {t('products.stock', {
                              count: formatNumber(product.stock ?? 0),
                            })}
                          </p>
                        </div>
                        {actions(product)}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          {!productsQ.isLoading && meta && (
            <TablePagination
              meta={meta}
              onPage={table.setPage}
              busy={productsQ.isFetching}
              className=''
            />
          )}
        </div>
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={editing ? t('products.editTitle') : t('products.createTitle')}
          busy={saving}
          size='editor'
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-5'
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field
                label={t('products.form.title')}
                required
                className='sm:col-span-2'
              >
                <Input
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </Field>
              <Field
                label={t('products.form.brand')}
                required
              >
                <Select
                  required
                  value={form.brand}
                  placeholder={t('products.form.selectBrand')}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, brand: e.target.value }))
                  }
                >
                  {brands.map((b) => (
                    <option
                      key={b._id}
                      value={b._id}
                    >
                      {b.name}
                    </option>
                  ))}
                  {/* Keep the edited product's brand selectable even if the
                      list didn't include it, instead of showing "Select brand". */}
                  {form.brand && !brands.some((b) => b._id === form.brand) && (
                    <option value={form.brand}>
                      {(editing &&
                        typeof editing.brand === 'object' &&
                        editing.brand?.name) ||
                        form.brand}
                    </option>
                  )}
                </Select>
              </Field>
              <Field label={t('products.form.sku')}>
                <Input
                  value={form.sku}
                  dir='ltr'
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
                  }
                />
              </Field>
              <Field label={t('products.form.category')}>
                <Select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option
                      key={c}
                      value={c}
                    >
                      {tv('productCategory', c)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={t('products.form.subcategory')}
                required
              >
                <Input
                  value={form.subcategory}
                  list='product-subcategories'
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subcategory: e.target.value }))
                  }
                />
              </Field>
              <datalist id='product-subcategories'>
                {subcategoryOptions.map((c) => (
                  <option
                    key={c._id}
                    value={c.slug}
                  >
                    {c.name}
                  </option>
                ))}
              </datalist>
              <Field
                label={t('products.form.price')}
                required
              >
                <Input
                  type='number'
                  min={0}
                  step='0.01'
                  required
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price: Number(e.target.value),
                    }))
                  }
                />
              </Field>
              <Field
                label={t('products.form.stock')}
                hint={
                  hasVariants ? t('products.form.stockFromVariants') : undefined
                }
              >
                {hasVariants ? (
                  <Input
                    type='number'
                    readOnly
                    value={variantStockTotal(form.variants)}
                  />
                ) : (
                  <Input
                    type='number'
                    min={0}
                    value={form.stock}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        stock: Number(e.target.value),
                      }))
                    }
                  />
                )}
              </Field>
              <Field
                label={t('products.form.description')}
                required
                className='sm:col-span-2'
              >
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                />
              </Field>
            </div>

            <div className='space-y-4 border-t border-border pt-5'>
              <ImageUploadField
                label={t('products.form.cover')}
                required
                value={form.cover}
                onChange={(url) => setForm((f) => ({ ...f, cover: url }))}
              />
              <GalleryField
                value={form.images || []}
                onChange={(images) => setForm((f) => ({ ...f, images }))}
              />
            </div>

            <div className='border-t border-border pt-5'>
              <VariantsEditor
                value={form.variants || []}
                onChange={(variants) => setForm((f) => ({ ...f, variants }))}
              />
            </div>

            <details
              className='group rounded-badge border border-border'
              open={physicalOpen}
              onToggle={(e) => setPhysicalOpen(e.currentTarget.open)}
            >
              <summary className='flex cursor-pointer list-none items-center justify-between gap-2 rounded-badge px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden'>
                {t('products.form.physical')}
                <ChevronDown
                  className='size-4 text-muted-foreground transition-transform duration-normal group-open:rotate-180'
                  aria-hidden
                />
              </summary>
              <div className='space-y-4 border-t border-border p-4'>
                <Field label={t('products.form.material')}>
                  <Input
                    value={form.material ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, material: e.target.value }))
                    }
                  />
                </Field>
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                  <MeasureField
                    label={t('products.form.weightKg')}
                    value={form.weight}
                    onChange={(v) => setForm((f) => ({ ...f, weight: v }))}
                  />
                  {(['length', 'width', 'height'] as const).map((side) => (
                    <MeasureField
                      key={side}
                      label={t(`products.form.${side}Cm`)}
                      value={form.dimensions?.[side]}
                      onChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          dimensions: { ...f.dimensions, [side]: v },
                        }))
                      }
                    />
                  ))}
                </div>
                <FormSection title={t('products.form.packed')}>
                  <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                    <MeasureField
                      label={t('products.form.weightKg')}
                      value={form.shippingInfo?.weight}
                      onChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          shippingInfo: { ...f.shippingInfo, weight: v },
                        }))
                      }
                    />
                    {(['length', 'width', 'height'] as const).map((side) => (
                      <MeasureField
                        key={side}
                        label={t(`products.form.${side}Cm`)}
                        value={form.shippingInfo?.dimensions?.[side]}
                        onChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            shippingInfo: {
                              ...f.shippingInfo,
                              dimensions: {
                                ...f.shippingInfo?.dimensions,
                                [side]: v,
                              },
                            },
                          }))
                        }
                      />
                    ))}
                  </div>
                  <Checkbox
                    checked={Boolean(form.shippingInfo?.requiresSpecialHandling)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        shippingInfo: {
                          ...f.shippingInfo,
                          requiresSpecialHandling: e.target.checked,
                        },
                      }))
                    }
                    label={t('products.form.specialHandling')}
                  />
                </FormSection>
              </div>
            </details>

            <div className='flex flex-wrap gap-x-8 gap-y-2'>
              <Switch
                checked={form.isActive ?? true}
                onCheckedChange={(isActive) =>
                  setForm((f) => ({ ...f, isActive }))
                }
                label={t('products.form.active')}
              />
              <Switch
                checked={form.featured ?? false}
                onCheckedChange={(featured) =>
                  setForm((f) => ({ ...f, featured }))
                }
                label={t('products.form.featured')}
              />
            </div>
            <FormActions
              onCancel={() => setOpen(false)}
              saving={saving}
              submitLabel={
                editing ? t('products.form.save') : t('products.form.create')
              }
            />
          </form>
        </FormDialog>
      )}
    </>
  );
}
