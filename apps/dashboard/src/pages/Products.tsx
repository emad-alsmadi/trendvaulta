import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
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
import { validateVariants } from '../lib/variants';
import { useTableQuery } from '../hooks/useTableQuery';
import { useAdminCategories } from '../hooks/useAdminCategories';
import { TablePagination } from '../components/ui/TablePagination';
import { FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';

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
const SORT_PRESETS = ['newest', 'bestselling', 'price_asc', 'price_desc', 'rating'] as const;

/** Labels come from tv('productCategory', value). */
const CATEGORIES = ['makeup', 'skincare', 'perfumes', 'clothing', 'accessories', 'home'];

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

/** Only the keys the API's variant schema accepts, with blanks dropped
 *  (Joi.string() rejects ''), and never the stored subdocument `_id`. */
function cleanVariant(v: ProductVariant): ProductVariant {
  const out: ProductVariant = { stock: Math.max(0, Math.floor(Number(v.stock) || 0)) };
  const size = v.size?.trim();
  const color = v.color?.trim();
  const sku = v.sku?.trim();
  if (size) out.size = size;
  if (color) out.color = color;
  if (color && v.colorCode) out.colorCode = v.colorCode;
  if (sku) out.sku = sku;
  if (typeof v.price === 'number' && Number.isFinite(v.price)) out.price = v.price;
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
      requiresSpecialHandling: Boolean(form.shippingInfo?.requiresSpecialHandling),
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
  const { t, tv, formatCurrency, formatNumber } = useT();
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [category, setCategory] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductFormPayload>(emptyForm);
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
  const brandsQ = useAdminBrands({ limit: 100 });
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
        await updateMut.mutateAsync({ id: editing._id, payload });
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('products.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('products.subtitle')}
          </p>
        </div>
        {can('products:write') && (
          <button
            type="button"
            onClick={openCreate}
            disabled={!brands.length}
            title={!brands.length ? t('products.needBrand') : undefined}
            className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="me-2 h-5 w-5" aria-hidden />
            {t('products.add')}
          </button>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedQ(search.trim());
            resetPage();
          }}
        >
          <Search className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            aria-label={t('products.searchLabel')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('products.searchPlaceholder')}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 ps-10 pe-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </form>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            resetPage();
          }}
          aria-label={t('products.filterCategory')}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">{t('products.allCategories')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {tv('productCategory', c)}
            </option>
          ))}
        </select>
        <select
          value={sortPreset}
          onChange={(e) => {
            setSortPreset(e.target.value);
            resetPage();
          }}
          aria-label={t('products.sortLabel')}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          {SORT_PRESETS.map((s) => (
            <option key={s} value={s}>
              {t(`products.sort.${s}`)}
            </option>
          ))}
        </select>
      </div>

      {productsQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">
          {t('products.loading')}
        </p>
      )}
      {productsQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(productsQ.error, t('products.loadFailed'))}
        </div>
      )}

      {!productsQ.isLoading && !productsQ.isError && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-gray-500">
              {t('products.empty')}
            </p>
          ) : (
            products.map((product) => (
              <div
                key={product._id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="h-44 bg-gray-100 dark:bg-gray-700">
                  {product.cover ? (
                    <img
                      src={product.cover}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-fuchsia-400 to-purple-500" />
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 dark:text-white">
                        {product.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {product.isActive === false && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {t('products.inactive')}
                          </span>
                        )}
                        {product.featured && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            {t('products.featured')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {can('products:write') && (
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                          aria-label={t('products.edit', { title: product.title })}
                        >
                          <Pencil className="h-4 w-4 text-gray-500" aria-hidden />
                        </button>
                      )}
                      {can('products:delete') && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(product)}
                          disabled={deleteMut.isPending}
                          className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                          aria-label={t('products.delete', { title: product.title })}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" aria-hidden />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                    {brandName(product)} · {product.category ? tv('productCategory', product.category) : '—'}
                    {product.subcategory ? ` / ${product.subcategory}` : ''}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(Number(product.price || 0))}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {t('products.stock', { count: formatNumber(product.stock ?? 0) })}
                      {product.isActive === false ? t('products.inactiveSuffix') : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!productsQ.isLoading && !productsQ.isError && (
        <TablePagination
          meta={meta}
          busy={productsQ.isFetching}
          onPage={table.setPage}
          onLimit={table.setLimit}
        />
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={editing ? t('products.editTitle') : t('products.createTitle')}
          busy={saving}
          maxWidthClass="max-w-3xl"
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('products.form.title')}
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
                {t('products.form.brand')}
              </span>
              <select
                required
                value={form.brand}
                onChange={(e) =>
                  setForm((f) => ({ ...f, brand: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              >
                <option value="">{t('products.form.selectBrand')}</option>
                {brands.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  {t('products.form.price')}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  {t('products.form.stock')}
                </span>
                {hasVariants ? (
                  <>
                    <input
                      type="number"
                      readOnly
                      value={variantStockTotal(form.variants)}
                      aria-describedby="stock-from-variants"
                      className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    />
                    <span
                      id="stock-from-variants"
                      className="mt-1 block text-xs text-gray-500 dark:text-gray-400"
                    >
                      {t('products.form.stockFromVariants')}
                    </span>
                  </>
                ) : (
                  <input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        stock: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                )}
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('products.form.category')}
              </span>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {tv('productCategory', c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('products.form.subcategory')}
              </span>
              <input
                value={form.subcategory}
                list="product-subcategories"
                onChange={(e) =>
                  setForm((f) => ({ ...f, subcategory: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <datalist id="product-subcategories">
                {subcategoryOptions.map((c) => (
                  <option key={c._id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </datalist>
            </label>
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
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('products.form.sku')}
              </span>
              <input
                value={form.sku}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sku: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('products.form.description')}
              </span>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <VariantsEditor
              value={form.variants || []}
              onChange={(variants) => setForm((f) => ({ ...f, variants }))}
            />
            <details
              className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700"
              open={physicalOpen}
              onToggle={(e) => setPhysicalOpen(e.currentTarget.open)}
            >
              <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                {t('products.form.physical')}
              </summary>
              <div className="mt-3 space-y-3">
                <label className="block text-xs">
                  <span className="mb-1 block text-gray-600 dark:text-gray-400">
                    {t('products.form.material')}
                  </span>
                  <input
                    value={form.material ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, material: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="block text-xs">
                  <span className="mb-1 block text-gray-600 dark:text-gray-400">
                    {t('products.form.weightKg')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.weight ?? ''}
                    onChange={(e) => {
                      const v = numberOrUndefined(e.target.value);
                      setForm((f) => ({ ...f, weight: v }));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-gray-600 dark:text-gray-400">
                    {t('products.form.lengthCm')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.dimensions?.length ?? ''}
                    onChange={(e) => {
                      const v = numberOrUndefined(e.target.value);
                      setForm((f) => ({ ...f, dimensions: { ...f.dimensions, length: v } }));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-gray-600 dark:text-gray-400">
                    {t('products.form.widthCm')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.dimensions?.width ?? ''}
                    onChange={(e) => {
                      const v = numberOrUndefined(e.target.value);
                      setForm((f) => ({ ...f, dimensions: { ...f.dimensions, width: v } }));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-gray-600 dark:text-gray-400">
                    {t('products.form.heightCm')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.dimensions?.height ?? ''}
                    onChange={(e) => {
                      const v = numberOrUndefined(e.target.value);
                      setForm((f) => ({ ...f, dimensions: { ...f.dimensions, height: v } }));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                </div>
                <p className="pt-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('products.form.packed')}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="block text-xs">
                  <span className="mb-1 block text-gray-600 dark:text-gray-400">
                    {t('products.form.weightKg')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.shippingInfo?.weight ?? ''}
                    onChange={(e) => {
                      const v = numberOrUndefined(e.target.value);
                      setForm((f) => ({ ...f, shippingInfo: { ...f.shippingInfo, weight: v } }));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-gray-600 dark:text-gray-400">
                    {t('products.form.lengthCm')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.shippingInfo?.dimensions?.length ?? ''}
                    onChange={(e) => {
                      const v = numberOrUndefined(e.target.value);
                      setForm((f) => ({ ...f, shippingInfo: { ...f.shippingInfo, dimensions: { ...f.shippingInfo?.dimensions, length: v } } }));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-gray-600 dark:text-gray-400">
                    {t('products.form.widthCm')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.shippingInfo?.dimensions?.width ?? ''}
                    onChange={(e) => {
                      const v = numberOrUndefined(e.target.value);
                      setForm((f) => ({ ...f, shippingInfo: { ...f.shippingInfo, dimensions: { ...f.shippingInfo?.dimensions, width: v } } }));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-gray-600 dark:text-gray-400">
                    {t('products.form.heightCm')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.shippingInfo?.dimensions?.height ?? ''}
                    onChange={(e) => {
                      const v = numberOrUndefined(e.target.value);
                      setForm((f) => ({ ...f, shippingInfo: { ...f.shippingInfo, dimensions: { ...f.shippingInfo?.dimensions, height: v } } }));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
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
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t('products.form.specialHandling')}
                  </span>
                </label>
              </div>
            </details>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-gray-700 dark:text-gray-300">{t('products.form.active')}</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.featured ?? false}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, featured: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-gray-700 dark:text-gray-300">{t('products.form.featured')}</span>
              </label>
            </div>
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
                {saving ? t('products.form.saving') : editing ? t('products.form.save') : t('products.form.create')}
              </button>
            </div>
          </form>
        </FormDialog>
      )}
    </motion.div>
  );
}
