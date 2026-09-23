import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react';
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
import {
  VariantsEditor,
  validateVariants,
} from '../components/products/VariantsEditor';
import { useTableQuery } from '../hooks/useTableQuery';
import { useAdminCategories } from '../hooks/useAdminCategories';
import { TablePagination } from '../components/ui/TablePagination';

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
const SORT_PRESETS = [
  { value: 'newest', label: 'Newest' },
  { value: 'bestselling', label: 'Best selling' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

const CATEGORIES = [
  { value: 'makeup', label: 'Makeup' },
  { value: 'skincare', label: 'Skincare' },
  { value: 'perfumes', label: 'Perfumes' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'home', label: 'Home' },
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
      toast.error('Title, brand, and cover URL are required.');
      return;
    }
    if (!form.subcategory.trim() || form.description.trim().length < 3) {
      toast.error('Subcategory and a description (3+ characters) are required.');
      return;
    }
    const variantProblem = validateVariants(form.variants || []);
    if (variantProblem) {
      toast.error(variantProblem);
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
      toast.error(errorMessage(err, 'Could not save product'));
    }
  }

  async function handleDelete(product: AdminProduct) {
    const ok = await confirm({ message: `Delete "${product.title}" permanently?`, danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(product._id);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete product'));
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
            Products
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Live catalog (includes inactive when signed in as staff)
          </p>
        </div>
        {can('products:write') && (
          <button
            type="button"
            onClick={openCreate}
            disabled={!brands.length}
            title={!brands.length ? 'Create a brand first' : undefined}
            className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Product
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
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </form>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            resetPage();
          }}
          aria-label="Filter by category"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={sortPreset}
          onChange={(e) => {
            setSortPreset(e.target.value);
            resetPage();
          }}
          aria-label="Sort products"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          {SORT_PRESETS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {productsQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">
          Loading products…
        </p>
      )}
      {productsQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(productsQ.error, 'Failed to load products')}
        </div>
      )}

      {!productsQ.isLoading && !productsQ.isError && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-gray-500">
              No products found.
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
                            Inactive
                          </span>
                        )}
                        {product.featured && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            Featured
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
                          aria-label={`Edit ${product.title}`}
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                      {can('products:delete') && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(product)}
                          disabled={deleteMut.isPending}
                          className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                          aria-label={`Delete ${product.title}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                    {brandName(product)} · {product.category || '—'}
                    {product.subcategory ? ` / ${product.subcategory}` : ''}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${Number(product.price || 0).toFixed(2)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      Stock: {product.stock ?? 0}
                      {product.isActive === false ? ' · inactive' : ''}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800" role="dialog" aria-modal="true">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editing ? 'Edit product' : 'Create product'}
              </h2>
              <button
                type="button"
                disabled={saving}
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Title
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
                  Brand
                </span>
                <select
                  required
                  value={form.brand}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, brand: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Select brand</option>
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
                    Price
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
                    Stock
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
                        Sum of variant stock
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
                  Category
                </span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Subcategory
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
                label="Cover image"
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
                  SKU
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
                  Description
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
                  Physical attributes &amp; shipping
                </summary>
                <div className="mt-3 space-y-3">
                  <label className="block text-xs">
                    <span className="mb-1 block text-gray-600 dark:text-gray-400">
                      Material
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
                      Weight (kg)
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
                      Length (cm)
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
                      Width (cm)
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
                      Height (cm)
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
                    Packed for shipping
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label className="block text-xs">
                    <span className="mb-1 block text-gray-600 dark:text-gray-400">
                      Weight (kg)
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
                      Length (cm)
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
                      Width (cm)
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
                      Height (cm)
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
                      Requires special handling (fragile, liquid, oversized…)
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
                  <span className="text-gray-700 dark:text-gray-300">Active</span>
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
                  <span className="text-gray-700 dark:text-gray-300">Featured</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editing ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
