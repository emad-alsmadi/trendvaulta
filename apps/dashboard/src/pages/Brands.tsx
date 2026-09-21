import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react';
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

const emptyForm: BrandFormPayload = {
  name: '',
  slug: '',
  description: '',
  logo: '',
  website: '',
  country: '',
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
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBrand | null>(null);
  const [form, setForm] = useState<BrandFormPayload>(emptyForm);

  const brandsQ = useAdminBrands({
    limit: 100,
    q: appliedQ || undefined,
  });
  const createMut = useCreateBrandMutation();
  const updateMut = useUpdateBrandMutation();
  const deleteMut = useDeleteBrandMutation();

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = brandsQ.data?.data || [];
    if (!search.trim() || appliedQ) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.slug?.toLowerCase().includes(q) ||
        b.country?.toLowerCase().includes(q),
    );
  }, [brandsQ.data, search, appliedQ]);

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
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      window.alert('Name and slug are required.');
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
      window.alert(errorMessage(err, 'Could not save brand'));
    }
  }

  async function handleDelete(brand: AdminBrand) {
    const ok = window.confirm(`Delete brand "${brand.name}" permanently?`);
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(brand._id);
    } catch (err) {
      window.alert(errorMessage(err, 'Could not delete brand'));
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
            Brands
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Live brand catalog from the API
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Brand
        </button>
      </div>

      <form
        className="mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedQ(search.trim());
        }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </form>

      {brandsQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">Loading brands…</p>
      )}
      {brandsQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(brandsQ.error, 'Failed to load brands')}
        </div>
      )}

      {!brandsQ.isLoading && !brandsQ.isError && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-gray-500">
              No brands found.
            </p>
          ) : (
            filtered.map((brand) => (
              <div
                key={brand._id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex h-36 items-center justify-center bg-gradient-to-br from-purple-400 to-cyan-500">
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-white">
                      {brand.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {brand.name}
                      </h3>
                      <p className="text-xs text-gray-500">{brand.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(brand)}
                        className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label={`Edit ${brand.name}`}
                      >
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(brand)}
                        className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                        aria-label={`Delete ${brand.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {brand.country || '—'}
                  </p>
                  <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                    {brand.website || 'No website'}
                  </p>
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
                {editing ? 'Edit brand' : 'Create brand'}
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
                  Name
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Slug
                </span>
                <input
                  required
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Country
                </span>
                <input
                  value={form.country}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, country: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Website
                </span>
                <input
                  value={form.website}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, website: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Logo URL
                </span>
                <input
                  value={form.logo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, logo: e.target.value }))
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
