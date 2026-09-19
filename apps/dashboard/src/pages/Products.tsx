import { useMemo, useState } from 'react';
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
  type ProductFormPayload,
} from '../lib/api';

const emptyForm: ProductFormPayload = {
  title: '',
  brand: '',
  description: '',
  price: 0,
  cover: '',
  category: 'beauty',
  subcategory: '',
  stock: 0,
  sku: '',
};

const CATEGORIES = [
  { value: 'beauty', label: 'Beauty' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'home', label: 'Home' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'skincare', label: 'Skincare' },
  { value: 'perfumes', label: 'Perfumes' },
  { value: 'clothing', label: 'Clothing' },
];

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
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [category, setCategory] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductFormPayload>(emptyForm);

  const productsQ = useAdminProducts({
    limit: 100,
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

  const filtered = useMemo(() => {
    const list = productsQ.data?.data || [];
    if (!search.trim() || appliedQ) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q),
    );
  }, [productsQ.data, search, appliedQ]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, brand: defaultBrand });
    setOpen(true);
  }

  function openEdit(product: AdminProduct) {
    setEditing(product);
    setForm({
      title: product.title,
      brand: brandId(product),
      description: product.description || '',
      price: product.price,
      cover: product.cover || '',
      category: product.category || 'beauty',
      subcategory: product.subcategory || '',
      stock: product.stock ?? 0,
      sku: product.sku || '',
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.brand || !form.cover.trim()) {
      window.alert('Title, brand, and cover URL are required.');
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing._id, payload: form });
      } else {
        await createMut.mutateAsync(form);
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      window.alert(errorMessage(err, 'Could not save product'));
    }
  }

  async function handleDelete(product: AdminProduct) {
    const ok = window.confirm(`Delete "${product.title}" permanently?`);
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(product._id);
    } catch (err) {
      window.alert(errorMessage(err, 'Could not delete product'));
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
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedQ(search.trim());
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
          onChange={(e) => setCategory(e.target.value)}
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
          {filtered.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-gray-500">
              No products found.
            </p>
          ) : (
            filtered.map((product) => (
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
                    <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 dark:text-white">
                      {product.title}
                    </h3>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label={`Edit ${product.title}`}
                      >
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(product)}
                        className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                        aria-label={`Delete ${product.title}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subcategory: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Cover image URL
                </span>
                <input
                  required
                  value={form.cover}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cover: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
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
