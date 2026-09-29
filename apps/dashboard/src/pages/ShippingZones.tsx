import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  useAdminShippingZones,
  useCreateShippingZoneMutation,
  useDeleteShippingZoneMutation,
  useUpdateShippingZoneMutation,
} from '../hooks/useAdminShippingZones';
import {
  errorMessage,
  type AdminShippingZone,
  type ShippingZonePayload,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { FormDialog } from '../components/ui/FormDialog';

/** Method row as edited in the form (numbers kept as strings until save). */
type MethodForm = {
  name: string;
  handle: string;
  description: string;
  priceUsd: string;
  estimatedDaysMin: string;
  estimatedDaysMax: string;
  isActive: boolean;
};

type ZoneForm = {
  name: string;
  countries: string;
  regionPattern: string;
  postalCodePattern: string;
  isActive: boolean;
  sortOrder: number;
  methods: MethodForm[];
};

const emptyMethod: MethodForm = {
  name: '',
  handle: '',
  description: '',
  priceUsd: '0',
  estimatedDaysMin: '1',
  estimatedDaysMax: '5',
  isActive: true,
};

const emptyForm: ZoneForm = {
  name: '',
  countries: '',
  regionPattern: '',
  postalCodePattern: '',
  isActive: true,
  sortOrder: 0,
  methods: [{ ...emptyMethod, name: 'Standard', handle: 'standard' }],
};

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white';

/** Build the API payload, or return a user-facing error. */
function toPayload(form: ZoneForm): ShippingZonePayload | string {
  const name = form.name.trim();
  if (!name) return 'Zone name is required.';

  const countries = form.countries
    .split(/[\s,]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const badCountry = countries.find((c) => !/^[A-Z]{2}$/.test(c));
  if (badCountry) {
    return `"${badCountry}" is not a 2-letter country code (e.g. US, AE, SA).`;
  }

  for (const [label, pattern] of [
    ['Region pattern', form.regionPattern],
    ['Postal code pattern', form.postalCodePattern],
  ] as const) {
    if (!pattern.trim()) continue;
    try {
      new RegExp(pattern.trim(), 'i');
    } catch {
      return `${label} is not a valid regular expression.`;
    }
  }

  const handles = new Set<string>();
  const methods: ShippingZonePayload['methods'] = [];
  for (const [index, m] of form.methods.entries()) {
    const handle = m.handle.trim().toLowerCase();
    const row = `Method ${index + 1}`;
    if (!m.name.trim() || !handle) return `${row}: name and handle are required.`;
    if (handles.has(handle)) return `${row}: handle "${handle}" is used twice.`;
    handles.add(handle);
    const priceUsd = Number(m.priceUsd);
    if (!Number.isFinite(priceUsd) || priceUsd < 0) {
      return `${row}: price must be 0 or more.`;
    }
    const min = Number(m.estimatedDaysMin);
    const max = Number(m.estimatedDaysMax);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < min) {
      return `${row}: delivery days must be whole numbers with min ≤ max.`;
    }
    methods.push({
      name: m.name.trim(),
      handle,
      description: m.description.trim(),
      priceUsd,
      estimatedDaysMin: min,
      estimatedDaysMax: max,
      isActive: m.isActive,
      sortOrder: index,
    });
  }

  return {
    name,
    countries,
    regionPattern: form.regionPattern.trim(),
    postalCodePattern: form.postalCodePattern.trim(),
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder || 0),
    methods,
  };
}

export default function ShippingZones() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const zonesQ = useAdminShippingZones({ limit: 100 });
  const createMut = useCreateShippingZoneMutation();
  const updateMut = useUpdateShippingZoneMutation();
  const deleteMut = useDeleteShippingZoneMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminShippingZone | null>(null);
  const [form, setForm] = useState<ZoneForm>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;
  const canWrite = can('shipping:write');

  const filtered = useMemo(() => {
    const list = zonesQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.countries.some((c) => c.toLowerCase().includes(q)),
    );
  }, [zonesQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      methods: emptyForm.methods.map((m) => ({ ...m })),
    });
    setOpen(true);
  }

  function openEdit(zone: AdminShippingZone) {
    setEditing(zone);
    setForm({
      name: zone.name,
      countries: zone.countries.join(', '),
      regionPattern: zone.regionPattern || '',
      postalCodePattern: zone.postalCodePattern || '',
      isActive: zone.isActive,
      sortOrder: zone.sortOrder ?? 0,
      methods: [...zone.methods]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((m) => ({
          name: m.name,
          handle: m.handle,
          description: m.description || '',
          priceUsd: String(m.priceUsd ?? 0),
          estimatedDaysMin: String(m.estimatedDaysMin ?? 1),
          estimatedDaysMax: String(m.estimatedDaysMax ?? 5),
          isActive: m.isActive !== false,
        })),
    });
    setOpen(true);
  }

  function updateMethod(index: number, patch: Partial<MethodForm>) {
    setForm((f) => ({
      ...f,
      methods: f.methods.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = toPayload(form);
    if (typeof payload === 'string') {
      toast.error(payload);
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing._id, payload });
        toast.success('Shipping zone updated.');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Shipping zone created.');
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save shipping zone'));
    }
  }

  async function handleDelete(zone: AdminShippingZone) {
    const ok = await confirm({
      message: `Permanently delete shipping zone "${zone.name}"? Checkout falls back to the flat rates in Settings for its countries.`,
      danger: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(zone._id);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete shipping zone'));
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
            Shipping Zones
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Delivery methods and prices by destination. The first active zone
            (by order) that matches the address wins; unmatched addresses use
            the flat rates in Settings.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            <Plus className="me-2 h-5 w-5" />
            Add zone
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          aria-label="Search shipping zones"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or country code…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 ps-10 pe-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {zonesQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">
          Loading shipping zones…
        </p>
      )}

      {zonesQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(zonesQ.error, 'Failed to load shipping zones')}
        </div>
      )}

      {!zonesQ.isLoading && !zonesQ.isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['Name', 'Countries', 'Methods', 'Order', 'Status', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                      No shipping zones yet — checkout uses the flat rates in
                      Settings for every address.
                    </td>
                  </tr>
                ) : (
                  filtered.map((zone) => (
                    <tr key={zone._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                        {zone.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                        {zone.countries.length ? zone.countries.join(', ') : 'All countries'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {zone.methods.length === 0
                          ? '—'
                          : zone.methods
                              .map(
                                (m) =>
                                  `${m.name} ($${Number(m.priceUsd).toFixed(2)})${m.isActive === false ? ' · off' : ''}`,
                              )
                              .join(', ')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {zone.sortOrder ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            zone.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {zone.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canWrite && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(zone)}
                              className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600"
                              aria-label={`Edit ${zone.name}`}
                            >
                              <Pencil className="h-4 w-4 text-gray-500" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(zone)}
                              disabled={deleteMut.isPending}
                              className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                              aria-label={`Delete ${zone.name}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={editing ? 'Edit shipping zone' : 'Create shipping zone'}
          busy={saving}
          maxWidthClass="max-w-2xl"
        >

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                Name
              </span>
              <input
                required
                maxLength={200}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Gulf countries"
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                Countries (2-letter codes, comma separated; empty = all)
              </span>
              <input
                value={form.countries}
                onChange={(e) => setForm((f) => ({ ...f, countries: e.target.value }))}
                placeholder="AE, SA, KW"
                className={`${inputClass} font-mono uppercase`}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  City/region pattern (optional regex)
                </span>
                <input
                  maxLength={200}
                  value={form.regionPattern}
                  onChange={(e) => setForm((f) => ({ ...f, regionPattern: e.target.value }))}
                  placeholder="^(dubai|sharjah)$"
                  className={`${inputClass} font-mono`}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Postal code pattern (optional regex)
                </span>
                <input
                  maxLength={200}
                  value={form.postalCodePattern}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, postalCodePattern: e.target.value }))
                  }
                  placeholder="^9\d{4}$"
                  className={`${inputClass} font-mono`}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Order (lower matches first)
                </span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Active
              </label>
            </div>

            <fieldset className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-white">
                Methods
              </legend>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Shoppers pick one of these at checkout. A price of 0 means
                free. Use the handles “standard” / “express” to override the
                Settings flat rates for this zone.
              </p>
              <div className="space-y-3">
                {form.methods.map((m, index) => (
                  <div
                    key={index}
                    className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40"
                  >
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                          Name
                        </span>
                        <input
                          value={m.name}
                          maxLength={100}
                          onChange={(e) => updateMethod(index, { name: e.target.value })}
                          className={inputClass}
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                          Handle
                        </span>
                        <input
                          value={m.handle}
                          maxLength={50}
                          onChange={(e) => updateMethod(index, { handle: e.target.value })}
                          className={`${inputClass} font-mono`}
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                          Price (USD)
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={m.priceUsd}
                          onChange={(e) => updateMethod(index, { priceUsd: e.target.value })}
                          className={inputClass}
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                          Min days
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={m.estimatedDaysMin}
                          onChange={(e) =>
                            updateMethod(index, { estimatedDaysMin: e.target.value })
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                          Max days
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={m.estimatedDaysMax}
                          onChange={(e) =>
                            updateMethod(index, { estimatedDaysMax: e.target.value })
                          }
                          className={inputClass}
                        />
                      </label>
                      <div className="flex items-end justify-between gap-2 pb-2">
                        <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={m.isActive}
                            onChange={(e) =>
                              updateMethod(index, { isActive: e.target.checked })
                            }
                          />
                          Active
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              methods: f.methods.filter((_, i) => i !== index),
                            }))
                          }
                          className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                          aria-label={`Remove method ${m.name || index + 1}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                    <label className="mt-2 block text-xs">
                      <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                        Description (optional)
                      </span>
                      <input
                        value={m.description}
                        maxLength={500}
                        onChange={(e) => updateMethod(index, { description: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, methods: [...f.methods, { ...emptyMethod }] }))
                }
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                <Plus className="h-4 w-4" />
                Add method
              </button>
            </fieldset>

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
        </FormDialog>
      )}
    </motion.div>
  );
}
