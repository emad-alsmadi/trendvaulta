import { useState } from 'react';
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
import { SkeletonCard } from '../components/ui/Skeleton';
import { Field } from '../components/ui/Field';
import {
  inputClass,
  selectClass,
  textareaClass,
} from '../components/ui/styles';
import { useT } from '../i18n/I18nProvider';
import { ViewToggle, type ViewMode } from '../components/ui/ViewToggle';
import { Pagination } from '../components/ui/Pagination';
import { motion } from 'framer-motion';

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

// Must match the Product model enum (apps/api/models/Product.js).
/** Values product.controller.js accepts for ?sort=. */
const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Bestselling', value: 'bestselling' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Rating', value: 'rating' },
];
const CATEGORY_OPTIONS = [
  { label: 'Makeup', value: 'makeup' },
  { label: 'Skincare', value: 'skincare' },
  { label: 'Perfumes', value: 'perfumes' },
  { label: 'Clothing', value: 'clothing' },
  { label: 'Accessories', value: 'accessories' },
  { label: 'Home', value: 'home' },
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

export default function Products() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatCurrency, formatNumber } = useT();
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

  return (
    <div className='page-transition'>
      <PageHeader
        title={t('products.title')}
        description={t('products.subtitle')}
        actions={
          can('products:write') && (
            <Button
              onClick={openCreate}
              disabled={!brands.length}
              title={!brands.length ? t('products.needBrand') : undefined}
              icon={
                <Plus
                  className='icon-sm'
                  aria-hidden
                />
              }
              label={t('products.add')}
            />
          )
        }
      />

      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div className='flex flex-1 flex-col gap-3 sm:flex-row sm:items-end'>
          <InputTextWrapper
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            placeholder={t('products.searchPlaceholder')}
            className='w-full sm:w-64'
          />
          <DropdownWrapper
            value={category}
            options={CATEGORY_OPTIONS}
            onChange={(e: any) => {
              setCategory(e.value || '');
              resetPage();
            }}
            placeholder={t('products.filterCategory')}
            className='w-full sm:w-40'
            showClear
          />
          <DropdownWrapper
            value={sortPreset}
            options={SORT_OPTIONS}
            onChange={(e: any) => {
              setSortPreset(e.value || 'newest');
              resetPage();
            }}
            placeholder={t('products.sortLabel')}
            className='w-full sm:w-48'
          />
          <Button
            label={t('products.searchLabel')}
            onClick={() => {
              setAppliedQ(search.trim());
              resetPage();
            }}
            className='w-full sm:w-auto'
          />
          {(appliedQ || category || sortPreset !== 'newest') && (
            <Button
              label='Clear'
              onClick={() => {
                setSearch('');
                setAppliedQ('');
                setCategory('');
                setSortPreset('newest');
                resetPage();
              }}
              severity='secondary'
              className='w-full sm:w-auto'
            />
          )}
        </div>
        <ViewToggle
          currentView={viewMode}
          onViewChange={setViewMode}
          availableViews={['card', 'list']}
        />
      </div>

      {productsQ.isLoading && (
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      {productsQ.isError && (
        <Alert tone='error'>
          {errorMessage(productsQ.error, t('products.loadFailed'))}
        </Alert>
      )}

      {!productsQ.isLoading && !productsQ.isError && (
        <>
          {viewMode === 'card' ? (
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {products.length === 0 ? (
                <p className='col-span-full py-10 text-center text-sm text-muted-foreground'>
                  {t('products.empty')}
                </p>
              ) : (
                products.map((product, index) => (
                  <motion.div
                    key={product._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className='overflow-hidden group bg-gradient-to-br from-brand-fuchsia/5 to-brand-purple/5 border-brand-fuchsia/10'>
                      <div className='relative h-44 bg-muted overflow-hidden'>
                        {product.cover ? (
                          <img
                            src={product.cover}
                            alt=''
                            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                          />
                        ) : (
                          <div className='h-full w-full bg-muted' />
                        )}
                        <div className='absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
                      </div>
                      <div className='p-4'>
                        <div className='mb-2 flex items-start justify-between gap-2'>
                          <div className='flex-1'>
                            <h3 className='line-clamp-2 text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-200'>
                              {product.title}
                            </h3>
                            <div className='mt-1 flex flex-wrap gap-1.5'>
                              {product.isActive === false && (
                                <StatusBadge status='inactive'>
                                  {t('products.inactive')}
                                </StatusBadge>
                              )}
                              {product.featured && (
                                <Badge tone='solid'>
                                  {t('products.featured')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className='flex shrink-0 gap-1'>
                            {can('products:write') && (
                              <button
                                type='button'
                                onClick={() => openEdit(product)}
                                className='rounded p-1.5 hover:bg-accent transition-colors duration-200'
                                aria-label={t('products.edit', {
                                  title: product.title,
                                })}
                              >
                                <Pencil
                                  className='icon-sm text-muted-foreground hover:text-primary transition-colors duration-200'
                                  aria-hidden
                                />
                              </button>
                            )}
                            {can('products:delete') && (
                              <button
                                type='button'
                                onClick={() => void handleDelete(product)}
                                disabled={deleteMut.isPending}
                                className='rounded p-1.5 hover:bg-accent transition-colors duration-200'
                                aria-label={t('products.delete', {
                                  title: product.title,
                                })}
                              >
                                <Trash2
                                  className='icon-sm text-muted-foreground hover:text-destructive transition-colors duration-200'
                                  aria-hidden
                                />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className='mb-1 text-sm text-muted-foreground'>
                          {brandName(product)} ·{' '}
                          {product.category
                            ? product.category.charAt(0).toUpperCase() +
                              product.category.slice(1)
                            : '—'}
                          {product.subcategory
                            ? ` / ${product.subcategory}`
                            : ''}
                        </p>
                        <div className='flex items-center justify-between text-sm'>
                          <span className='font-semibold text-foreground tabular-nums group-hover:text-primary transition-colors duration-200'>
                            {formatCurrency(Number(product.price || 0))}
                          </span>
                          <span className='text-muted-foreground tabular-nums'>
                            {t('products.stock', {
                              count: formatNumber(product.stock ?? 0),
                            })}
                            {product.isActive === false
                              ? t('products.inactiveSuffix')
                              : ''}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            <div className='rounded-xl border border-gray-200 bg-card shadow-sm dark:border-gray-700 dark:bg-gray-800'>
              <DataTableWrapper
                value={products}
                paginator
                rows={24}
                totalRecords={meta?.total}
                lazy
                onPage={table.setPage}
                first={(meta?.page ? meta.page - 1 : 0) * 24}
                loading={productsQ.isFetching}
                emptyMessage={t('products.empty')}
                className='p-datatable-sm'
              >
                <ColumnWrapper
                  header={t('products.columns.image')}
                  body={(product: any) => (
                    <div className='h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-muted'>
                      {product.cover ? (
                        <img
                          src={product.cover}
                          alt=''
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <div className='h-full w-full bg-muted' />
                      )}
                    </div>
                  )}
                />
                <ColumnWrapper
                  field='title'
                  header={t('products.columns.title')}
                  body={(product: any) => (
                    <div className='min-w-0'>
                      <h3 className='font-semibold text-foreground truncate'>
                        {product.title}
                      </h3>
                      <p className='text-sm text-muted-foreground'>
                        {brandName(product)} ·{' '}
                        {product.category
                          ? product.category.charAt(0).toUpperCase() +
                            product.category.slice(1)
                          : '—'}
                      </p>
                    </div>
                  )}
                />
                <ColumnWrapper
                  field='price'
                  header={t('products.columns.price')}
                  body={(product: any) =>
                    formatCurrency(Number(product.price || 0))
                  }
                />
                <ColumnWrapper
                  field='stock'
                  header={t('products.columns.stock')}
                  body={(product: any) =>
                    `${formatNumber(product.stock ?? 0)} ${t('common.productsInStock')}`
                  }
                />
                <ColumnWrapper
                  header={t('products.columns.actions')}
                  body={(product: any) => (
                    <div className='flex gap-1'>
                      {can('products:write') && (
                        <button
                          type='button'
                          onClick={() => openEdit(product)}
                          className='rounded p-1.5 hover:bg-accent transition-colors duration-200'
                          aria-label={t('products.edit', {
                            title: product.title,
                          })}
                        >
                          <Pencil
                            className='icon-sm text-muted-foreground hover:text-primary transition-colors duration-200'
                            aria-hidden
                          />
                        </button>
                      )}
                      {can('products:delete') && (
                        <button
                          type='button'
                          onClick={() => void handleDelete(product)}
                          disabled={deleteMut.isPending}
                          className='rounded p-1.5 hover:bg-accent transition-colors duration-200'
                          aria-label={t('products.delete', {
                            title: product.title,
                          })}
                        >
                          <Trash2
                            className='icon-sm text-muted-foreground hover:text-destructive transition-colors duration-200'
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
        </>
      )}

      {!productsQ.isLoading && !productsQ.isError && meta && (
        <div className='flex items-center justify-between'>
          <p className='text-sm text-muted-foreground'>
            {t('common.showing', {
              from: (meta.page - 1) * meta.limit + 1,
              to: Math.min(meta.page * meta.limit, meta.total),
              total: meta.total,
            })}
          </p>
          <Pagination
            currentPage={meta.page}
            totalPages={Math.ceil(meta.total / meta.limit)}
            onPageChange={table.setPage}
            disabled={productsQ.isFetching}
          />
        </div>
      )}

      {open && (
        <DialogWrapper
          visible={open}
          onHide={() => setOpen(false)}
          header={editing ? t('products.editTitle') : t('products.createTitle')}
          modal
          className='w-full max-w-3xl'
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-3'
          >
            <Field label={t('products.form.title')}>
              <input
                required
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label={t('products.form.brand')}>
              <select
                required
                value={form.brand}
                onChange={(e) =>
                  setForm((f) => ({ ...f, brand: e.target.value }))
                }
                className={selectClass}
              >
                <option value=''>{t('products.form.selectBrand')}</option>
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
              </select>
            </Field>
            <div className='grid grid-cols-2 gap-3'>
              <Field label={t('products.form.price')}>
                <input
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
                  className={inputClass}
                />
              </Field>
              <Field label={t('products.form.stock')}>
                {hasVariants ? (
                  <>
                    <input
                      type='number'
                      readOnly
                      value={variantStockTotal(form.variants)}
                      aria-describedby='stock-from-variants'
                      className={inputClass + ' cursor-not-allowed'}
                    />
                    <span
                      id='stock-from-variants'
                      className='mt-1 block text-xs text-muted-foreground'
                    >
                      {t('products.form.stockFromVariants')}
                    </span>
                  </>
                ) : (
                  <input
                    type='number'
                    min={0}
                    value={form.stock}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        stock: Number(e.target.value),
                      }))
                    }
                    className={inputClass}
                  />
                )}
              </Field>
            </div>
            <Field label={t('products.form.category')}>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                className={selectClass}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option
                    key={c.value}
                    value={c.value}
                  >
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <label
                htmlFor='subcategory'
                className='block text-sm font-medium text-foreground mb-1.5'
              >
                {t('products.form.subcategory')}
              </label>
              <input
                id='subcategory'
                value={form.subcategory}
                list='product-subcategories'
                onChange={(e) =>
                  setForm((f) => ({ ...f, subcategory: e.target.value }))
                }
                className={inputClass}
              />
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
            </div>
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
            <Field label={t('products.form.sku')}>
              <input
                value={form.sku}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sku: e.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label={t('products.form.description')}>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                className={textareaClass}
              />
            </Field>
            <VariantsEditor
              value={form.variants || []}
              onChange={(variants) => setForm((f) => ({ ...f, variants }))}
            />
            <details
              className='rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700'
              open={physicalOpen}
              onToggle={(e) => setPhysicalOpen(e.currentTarget.open)}
            >
              <summary className='cursor-pointer font-medium text-foreground'>
                {t('products.form.physical')}
              </summary>
              <div className='mt-3 space-y-3'>
                <label className='block text-xs'>
                  <span className='mb-1 block text-muted-foreground'>
                    {t('products.form.material')}
                  </span>
                  <input
                    value={form.material ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, material: e.target.value }))
                    }
                    className={inputClass + ' px-2 py-1.5 text-sm'}
                  />
                </label>
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                  <label className='block text-xs'>
                    <span className='mb-1 block text-muted-foreground'>
                      {t('products.form.weightKg')}
                    </span>
                    <input
                      type='number'
                      min={0}
                      step='0.01'
                      value={form.weight ?? ''}
                      onChange={(e) => {
                        const v = numberOrUndefined(e.target.value);
                        setForm((f) => ({ ...f, weight: v }));
                      }}
                      className={inputClass + ' px-2 py-1.5 text-sm'}
                    />
                  </label>
                  <label className='block text-xs'>
                    <span className='mb-1 block text-muted-foreground'>
                      {t('products.form.lengthCm')}
                    </span>
                    <input
                      type='number'
                      min={0}
                      step='0.01'
                      value={form.dimensions?.length ?? ''}
                      onChange={(e) => {
                        const v = numberOrUndefined(e.target.value);
                        setForm((f) => ({
                          ...f,
                          dimensions: { ...f.dimensions, length: v },
                        }));
                      }}
                      className={inputClass + ' px-2 py-1.5 text-sm'}
                    />
                  </label>
                  <label className='block text-xs'>
                    <span className='mb-1 block text-muted-foreground'>
                      {t('products.form.widthCm')}
                    </span>
                    <input
                      type='number'
                      min={0}
                      step='0.01'
                      value={form.dimensions?.width ?? ''}
                      onChange={(e) => {
                        const v = numberOrUndefined(e.target.value);
                        setForm((f) => ({
                          ...f,
                          dimensions: { ...f.dimensions, width: v },
                        }));
                      }}
                      className={inputClass + ' px-2 py-1.5 text-sm'}
                    />
                  </label>
                  <label className='block text-xs'>
                    <span className='mb-1 block text-muted-foreground'>
                      {t('products.form.heightCm')}
                    </span>
                    <input
                      type='number'
                      min={0}
                      step='0.01'
                      value={form.dimensions?.height ?? ''}
                      onChange={(e) => {
                        const v = numberOrUndefined(e.target.value);
                        setForm((f) => ({
                          ...f,
                          dimensions: { ...f.dimensions, height: v },
                        }));
                      }}
                      className={inputClass + ' px-2 py-1.5 text-sm'}
                    />
                  </label>
                </div>
                <p className='pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                  {t('products.form.packed')}
                </p>
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                  <label className='block text-xs'>
                    <span className='mb-1 block text-muted-foreground'>
                      {t('products.form.weightKg')}
                    </span>
                    <input
                      type='number'
                      min={0}
                      step='0.01'
                      value={form.shippingInfo?.weight ?? ''}
                      onChange={(e) => {
                        const v = numberOrUndefined(e.target.value);
                        setForm((f) => ({
                          ...f,
                          shippingInfo: { ...f.shippingInfo, weight: v },
                        }));
                      }}
                      className={inputClass + ' px-2 py-1.5 text-sm'}
                    />
                  </label>
                  <label className='block text-xs'>
                    <span className='mb-1 block text-muted-foreground'>
                      {t('products.form.lengthCm')}
                    </span>
                    <input
                      type='number'
                      min={0}
                      step='0.01'
                      value={form.shippingInfo?.dimensions?.length ?? ''}
                      onChange={(e) => {
                        const v = numberOrUndefined(e.target.value);
                        setForm((f) => ({
                          ...f,
                          shippingInfo: {
                            ...f.shippingInfo,
                            dimensions: {
                              ...f.shippingInfo?.dimensions,
                              length: v,
                            },
                          },
                        }));
                      }}
                      className={inputClass + ' px-2 py-1.5 text-sm'}
                    />
                  </label>
                  <label className='block text-xs'>
                    <span className='mb-1 block text-muted-foreground'>
                      {t('products.form.widthCm')}
                    </span>
                    <input
                      type='number'
                      min={0}
                      step='0.01'
                      value={form.shippingInfo?.dimensions?.width ?? ''}
                      onChange={(e) => {
                        const v = numberOrUndefined(e.target.value);
                        setForm((f) => ({
                          ...f,
                          shippingInfo: {
                            ...f.shippingInfo,
                            dimensions: {
                              ...f.shippingInfo?.dimensions,
                              width: v,
                            },
                          },
                        }));
                      }}
                      className={inputClass + ' px-2 py-1.5 text-sm'}
                    />
                  </label>
                  <label className='block text-xs'>
                    <span className='mb-1 block text-muted-foreground'>
                      {t('products.form.heightCm')}
                    </span>
                    <input
                      type='number'
                      min={0}
                      step='0.01'
                      value={form.shippingInfo?.dimensions?.height ?? ''}
                      onChange={(e) => {
                        const v = numberOrUndefined(e.target.value);
                        setForm((f) => ({
                          ...f,
                          shippingInfo: {
                            ...f.shippingInfo,
                            dimensions: {
                              ...f.shippingInfo?.dimensions,
                              height: v,
                            },
                          },
                        }));
                      }}
                      className={inputClass + ' px-2 py-1.5 text-sm'}
                    />
                  </label>
                </div>
                <label className='flex items-center gap-2 text-sm'>
                  <input
                    type='checkbox'
                    checked={Boolean(
                      form.shippingInfo?.requiresSpecialHandling,
                    )}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        shippingInfo: {
                          ...f.shippingInfo,
                          requiresSpecialHandling: e.target.checked,
                        },
                      }))
                    }
                    className='h-4 w-4 rounded border-border'
                  />
                  <span className='text-foreground'>
                    {t('products.form.specialHandling')}
                  </span>
                </label>
              </div>
            </details>
            <div className='flex flex-wrap gap-4'>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={form.isActive ?? true}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className='h-4 w-4 rounded border-border'
                />
                <span className='text-foreground'>
                  {t('products.form.active')}
                </span>
              </label>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={form.featured ?? false}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, featured: e.target.checked }))
                  }
                  className='h-4 w-4 rounded border-border'
                />
                <span className='text-foreground'>
                  {t('products.form.featured')}
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
                    ? t('products.form.saving')
                    : editing
                      ? t('products.form.save')
                      : t('products.form.create')
                }
              />
            </div>
          </form>
        </DialogWrapper>
      )}
    </div>
  );
}
